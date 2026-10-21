# Forex Pulse

Forex intelligence and a trading journal built with Next.js, TypeScript, and Supabase. Journal status changes summarize sampled provider prices. They do not place orders or guarantee fills or stop execution at a broker.

## Development and checks

Use Node.js 22 or newer. Copy `.env.example` to `.env.local` and provide the matching Supabase project keys and Gateway configuration. Run `npm ci`, then `npm run dev`.

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. Tests include an embedded PostgreSQL instance using PGlite and run without production credentials. The production build uses Next.js's supported webpack compiler and locally bundled Geist fonts; it does not download Google fonts.

## Database deployment

For a new database, execute the files under `supabase/schema/` in numeric directory/file order, then execute `supabase/migrations/20261021_integrity_and_risk.sql`. For an existing database, apply that migration once before deploying the new application. The migration is idempotent and covered by PostgreSQL regression tests. `node tools/merge.js` generates a fresh-install consolidated script containing the base schema followed by all migrations; do not rerun the full base schema on an existing database.

The migration adds account settings, durable self-exclusion, replay protection, feed provenance, report ownership, immutable realized results, and serialized per-account risk checks. It revokes direct browser writes to private tables. Gateway private reads and writes go through server controllers using the service role with explicit ownership filters; the Gateway cookie is never treated as a Supabase JWT. Browser views refresh through those controllers rather than anonymous Realtime subscriptions.

Old macro snapshots are marked unverified and excluded from production views. Existing rows are preserved. Old completed trades are backfilled using their stored outcome; an original stop overwritten before this migration cannot be reconstructed. Back up the database before applying any migration and review historical results separately if they were previously driven by demo quotes.

## Live feeds and missing data

Set `FINNHUB_API_KEY` on the server. It must permit the forex candle endpoint for the configured OANDA symbols. The connection test verifies that endpoint rather than an unrelated stock quote. Prices retain the provider timestamp; stale, missing, malformed, and demo quotes cannot drive entries or outcomes. H4 uses four aligned H1 candles; indicators use closed candles and real MACD/EMA/RSI/ATR calculations.

Calendar, news, gold drivers, and structural gold levels need a licensed upstream data adapter. No economic actual, headline, or price level is synthesized when the adapter is absent. Gold observations expire after six hours (drivers) or 24 hours (levels); news expires after 48 hours. Calendar health requires a successful observation within six hours and coverage extending at least one hour before and after now. Missing calendar coverage blocks new setups and entries, including automated entries.

An adapter can push one snapshot to `POST /api/feeds/ingest` with `Authorization: Bearer <MACRO_INGEST_SECRET>`, or expose an HTTPS endpoint at `MACRO_FEED_URL` returning an array of up to four snapshots. `MACRO_FEED_TOKEN`, if set, is sent only to that adapter. Cron pulls this adapter before scanning. The canonical payload definitions are in `lib/schemas/ingestion.ts`.

Every snapshot has `feed`, `source` (a real HTTPS source URL), and `observedAt` (ISO timestamp less than one hour old). The feed-specific `records` are:

- `calendar`: event IDs, titles, currency, impact, ISO `scheduled_at`, and nullable forecast, previous, and actual strings. Include ISO `coverageFrom` and `coverageUntil`. Preserve `actual: null` until a release is verified. Sending an empty calendar is a declaration that the covered interval contains no supported-currency releases; do this only after a successful complete provider response.
- `news`: stable IDs, headline, summary, HTTPS article URL, impact, affected currencies, and ISO `published_at`.
- `gold_drivers`: stable UUID IDs, name, value, numeric change, correlation, and impact.
- `gold_key_levels`: stable UUID IDs, positive price, support/resistance/pivot type, strength, and nullable notes.

Imports and feed-health updates commit in one database transaction. Invalid imports roll back and never replace actuals with forecasts. The API secret and trusted adapter are the provenance boundary: operators must connect a genuine source, not a simulator. Unverified legacy data is not automatically promoted.

Set `NEXT_PUBLIC_DEMO_MODE=true` only for demonstrations. Demo quotes and calendar rows are visibly labelled and cannot create, activate, or resolve persisted trades. This public flag and `NEXT_PUBLIC_GATEWAY_URL` are build-time configuration; rebuild after changing them.

## Risk settings and automation

In Settings, configure the USD account balance, leverage, risk percentage, daily loss limit in R, minimum reward/risk, maximum open setups, session focus, and news buffer. The balance is a user-maintained value, not a broker synchronization. Account values drive sizing, exposure, and drawdown displays. Lot sizing rounds down and returns no recommendation when minimum lots or margin would exceed the configured limits.

Automatic setup creation and monitoring are off by default. The saved account toggle controls browser and scheduled cycles. Manual scan is read-only; manual approval still passes server risk checks. Manual mode allows an explicit market-status check without enabling background automation. Automatic and manual entry paths enforce fresh prices, verified calendar coverage, open selected market sessions, the user's news buffer, portfolio capacity, duplicate protection, daily loss budget, and self-exclusion. Stops and outcomes preserve original risk; breakeven exits realize zero R. Active and completed journal records cannot be deleted to erase losses. Self-exclusion cannot be shortened before expiry.

`vercel.json` requests a cycle every five minutes. Use a Vercel plan supporting that frequency or configure an external scheduler to call `/api/cron/scan` with the bearer secret. Never put the secret in a query string. There is no process-local daemon or guarantee that a serverless instance stays alive. Monitoring occurs only on scheduled or explicit samples and can miss intracycle price movement; broker-side orders must handle actual execution and protection. Long cycles stop starting new work after approximately 45 seconds, so capacity planning matters for many accounts.

## SSO and deployment verification

Configure the same `CROSS_APP_SSO_SECRET` in Gateway and Forex Pulse. Gateway tokens must include a UUID `userId`, valid `email`, numeric millisecond `timestamp`, unique `nonce` of at least 16 characters, and `appName`. Callback tokens expire after 60 seconds and each nonce is consumed once in PostgreSQL. Production requires the real HTTPS `NEXT_PUBLIC_GATEWAY_URL`; localhost is accepted only in development.

After migration and deployment, verify Gateway login and avatar menu, settings persistence including Balanced sensitivity, one complete live feed import, manual setup approval, cross-account isolation, automatic opt-in/out, and cron authorization. Missing credentials or feed entitlements leave data unavailable and automation paused rather than enabling sample trades.
