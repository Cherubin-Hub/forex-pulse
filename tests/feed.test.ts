import test from "node:test";
import assert from "node:assert/strict";
import {
  getFinnhubQuotes,
  verifyFinnhubConnection,
} from "../lib/services/finnhub";
import { candleResponseSchema } from "../lib/schemas/feed";
test("malformed provider candles are rejected", () => {
  assert.equal(
    candleResponseSchema.safeParse({
      s: "ok",
      c: [1],
      h: [2],
      l: [0.5],
      o: [1],
      t: [1, 2],
    }).success,
    false,
  );
  assert.equal(
    candleResponseSchema.safeParse({
      s: "ok",
      c: [1],
      h: [0.5],
      l: [2],
      o: [1],
      t: [1],
    }).success,
    false,
  );
});
test("failed forex responses remain unavailable rather than becoming mock prices", async () => {
  const originalFetch = globalThis.fetch,
    originalKey = process.env.FINNHUB_API_KEY;
  process.env.FINNHUB_API_KEY = "test-feed-key";
  globalThis.fetch = async (input) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    assert.equal(url.pathname, "/api/v1/forex/candle");
    assert.ok(url.searchParams.get("symbol")?.startsWith("OANDA:"));
    return new Response(JSON.stringify({ error: "Subscription required" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    assert.equal(await verifyFinnhubConnection(), false);
    const quotes = await getFinnhubQuotes();
    assert.ok(quotes.length > 0);
    assert.ok(
      quotes.every(
        (quote) => quote.status === "UNAVAILABLE" && quote.price === null,
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FINNHUB_API_KEY;
    else process.env.FINNHUB_API_KEY = originalKey;
  }
});
test("provider timestamps are retained and stale candles are labelled delayed", async () => {
  const originalFetch = globalThis.fetch,
    originalKey = process.env.FINNHUB_API_KEY;
  process.env.FINNHUB_API_KEY = "test-feed-key";
  const timestamp = Math.floor(Date.now() / 1000) - 3600;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        s: "ok",
        c: [1.1, 1.2],
        h: [1.2, 1.3],
        l: [1, 1.1],
        o: [1.1, 1.2],
        t: [timestamp - 3600, timestamp],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  try {
    const quotes = await getFinnhubQuotes();
    assert.ok(
      quotes.every(
        (quote) =>
          quote.timestamp === new Date(timestamp * 1000).toISOString() &&
          quote.status === "DELAYED",
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FINNHUB_API_KEY;
    else process.env.FINNHUB_API_KEY = originalKey;
  }
});
