import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const root = new URL("../", import.meta.url);

test("PostgreSQL migration and risk invariants", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_user::text $$;
 CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
 CREATE PUBLICATION supabase_realtime;`);
    for (const group of [
      "01_tables",
      "02_stored_procedures",
      "03_triggers",
      "04_policies",
      "05_indexes",
    ]) {
      const directory = new URL(`supabase/schema/${group}/`, root);
      for (const file of (await readdir(directory))
        .filter((file) => file.endsWith(".sql"))
        .sort())
        await db.exec(await readFile(new URL(file, directory), "utf8"));
    }
    const migration = await readFile(
      new URL("supabase/migrations/20261021_integrity_and_risk.sql", root),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    await db.exec(
      "GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon,authenticated;GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;",
    );
    const user = async () => {
      const id = randomUUID();
      await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2)", [
        id,
        `${id}@example.com`,
      ]);
      await db.query(
        "UPDATE user_settings SET max_daily_loss_r=20 WHERE user_id=$1",
        [id],
      );
      return id;
    };
    const pending = async (owner: string, symbol = "EURUSD") => {
      const result = await db.query<{ id: string }>(
        "INSERT INTO trading_setups(user_id,symbol,direction,entry_min,entry_max,stop_loss,take_profit_1,risk_reward,status,invalidation_rule) VALUES($1,$2,'LONG',1.1,1.1,1.09,1.13,3,'WAITING_FOR_CONFIRMATION','H1 close below stop') RETURNING id",
        [owner, symbol],
      );
      return result.rows[0].id;
    };
    await t.test("balanced setting is accepted", async () => {
      const owner = await user();
      await db.query(
        "UPDATE user_settings SET news_sensitivity='BALANCED' WHERE user_id=$1",
        [owner],
      );
    });
    await t.test(
      "capacity and duplicate checks protect every insertion",
      async () => {
        const owner = await user();
        await db.query(
          "UPDATE user_settings SET max_open_setups=1 WHERE user_id=$1",
          [owner],
        );
        await pending(owner);
        await assert.rejects(pending(owner, "GBPUSD"), /Maximum open/);
        const other = await user();
        await pending(other);
        await assert.rejects(pending(other), /already exists/);
      },
    );
    await t.test(
      "reserved open risk cannot exceed the remaining daily budget",
      async () => {
        const owner = await user();
        await db.query(
          "UPDATE user_settings SET max_daily_loss_r=2,max_open_setups=3 WHERE user_id=$1",
          [owner],
        );
        await pending(owner);
        await pending(owner, "GBPUSD");
        await assert.rejects(
          pending(owner, "AUDUSD"),
          /remaining daily budget/,
        );
      },
    );
    await t.test(
      "concurrent-style pending edits cannot introduce duplicate symbols",
      async () => {
        const owner = await user();
        await pending(owner);
        const second = await pending(owner, "GBPUSD");
        await assert.rejects(
          db.query("UPDATE trading_setups SET symbol='EURUSD' WHERE id=$1", [
            second,
          ]),
          /already exists/,
        );
      },
    );
    await t.test("SSO nonces can be consumed only once", async () => {
      await db.query(
        "INSERT INTO gateway_sso_nonces(nonce_hash,expires_at) VALUES('unique-token',now()+interval '2 minutes')",
      );
      await assert.rejects(
        db.query(
          "INSERT INTO gateway_sso_nonces(nonce_hash,expires_at) VALUES('unique-token',now()+interval '2 minutes')",
        ),
        /duplicate key/,
      );
    });
    await t.test("new trades cannot skip entry confirmation", async () => {
      const owner = await user(),
        id = await pending(owner);
      await assert.rejects(
        db.query("UPDATE trading_setups SET status='TP_REACHED' WHERE id=$1", [
          id,
        ]),
        /Invalid setup transition/,
      );
    });
    await t.test(
      "breakeven preserves original risk and realizes zero",
      async () => {
        const owner = await user(),
          id = await pending(owner);
        await db.query(
          "UPDATE trading_setups SET status='ENTRY_TRIGGERED' WHERE id=$1",
          [id],
        );
        await db.query("UPDATE trading_setups SET stop_loss=1.1 WHERE id=$1", [
          id,
        ]);
        await db.query(
          "UPDATE trading_setups SET status='SL_HIT' WHERE id=$1",
          [id],
        );
        const result = await db.query<{
          realized_r: string;
          original_stop_loss: string;
          closed_at: Date;
        }>(
          "SELECT realized_r,original_stop_loss,closed_at FROM trading_setups WHERE id=$1",
          [id],
        );
        assert.equal(Number(result.rows[0].realized_r), 0);
        assert.equal(Number(result.rows[0].original_stop_loss), 1.09);
        assert.ok(result.rows[0].closed_at);
        await assert.rejects(
          db.query("DELETE FROM trading_setups WHERE id=$1", [id]),
          /immutable/,
        );
      },
    );
    await t.test("daily loss limit blocks new setups", async () => {
      const owner = await user();
      await db.query(
        "UPDATE user_settings SET max_daily_loss_r=1 WHERE user_id=$1",
        [owner],
      );
      const id = await pending(owner);
      await db.query(
        "UPDATE trading_setups SET status='ENTRY_TRIGGERED' WHERE id=$1",
        [id],
      );
      await db.query("UPDATE trading_setups SET status='SL_HIT' WHERE id=$1", [
        id,
      ]);
      await assert.rejects(pending(owner, "GBPUSD"), /Daily loss/);
    });
    await t.test("self-exclusion cannot be shortened or bypassed", async () => {
      const owner = await user();
      await db.query(
        "UPDATE user_settings SET manual_lockout_until=now()+interval '4 hours' WHERE user_id=$1",
        [owner],
      );
      await assert.rejects(pending(owner), /self-exclusion/);
      await assert.rejects(
        db.query(
          "UPDATE user_settings SET manual_lockout_until=NULL WHERE user_id=$1",
          [owner],
        ),
        /cannot be shortened/,
      );
    });
    await t.test(
      "original risk and active geometry cannot be tampered with",
      async () => {
        const owner = await user(),
          id = await pending(owner);
        await db.query(
          "UPDATE trading_setups SET status='ENTRY_TRIGGERED' WHERE id=$1",
          [id],
        );
        await assert.rejects(
          db.query(
            "UPDATE trading_setups SET original_stop_loss=1.08 WHERE id=$1",
            [id],
          ),
          /Original risk/,
        );
        await assert.rejects(
          db.query("UPDATE trading_setups SET entry_min=1.11 WHERE id=$1", [
            id,
          ]),
          /geometry/,
        );
        await assert.rejects(
          db.query("UPDATE trading_setups SET stop_loss=1.08 WHERE id=$1", [
            id,
          ]),
          /widened/,
        );
      },
    );
    await t.test(
      "reports are private and broadcast writes are denied",
      async () => {
        const owner = await user();
        await db.query(
          "INSERT INTO session_reports(owner_id,title,session,bias,volatility,executive_summary) VALUES($1,'Private','LONDON_OPEN','NEUTRAL','NORMAL','Private')",
          [owner],
        );
        await db.exec("SET ROLE anon;");
        assert.equal(
          (await db.query("SELECT * FROM session_reports")).rows.length,
          0,
        );
        await assert.rejects(
          db.query(
            "INSERT INTO notifications(user_id,type,priority,title,message) VALUES(NULL,'NEWS_RISK','HIGH','fake','fake')",
          ),
          /permission denied/,
        );
        await db.exec("RESET ROLE;");
        const other = await user();
        await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
          other,
        ]);
        await db.exec("SET ROLE authenticated;");
        assert.equal(
          (await db.query("SELECT * FROM session_reports")).rows.length,
          0,
        );
        await db.exec("RESET ROLE;");
      },
    );
    await t.test(
      "report window uniqueness prevents duplicate generation",
      async () => {
        const owner = await user();
        const statement =
          "INSERT INTO session_reports(owner_id,session_window,title,session,bias,volatility,executive_summary) VALUES($1,'2026-10-21T07:00:00Z','Brief','LONDON_OPEN','NEUTRAL','NORMAL','Brief')";
        await db.query(statement, [owner]);
        await assert.rejects(db.query(statement, [owner]), /duplicate key/);
      },
    );
    await t.test(
      "feed ingestion is atomic and never substitutes forecasts",
      async () => {
        const observedAt = new Date().toISOString();
        const payload = {
          feed: "calendar",
          source: "https://provider.example/calendar",
          observedAt,
          coverageFrom: new Date(Date.now() - 86400000).toISOString(),
          coverageUntil: new Date(Date.now() + 86400000).toISOString(),
          records: [
            {
              id: "cpi",
              title: "CPI",
              currency: "USD",
              impact: "HIGH",
              scheduled_at: new Date(Date.now() - 60000).toISOString(),
              forecast: "0.3%",
              previous: "0.2%",
              actual: null,
            },
          ],
        };
        await db.query("SELECT ingest_macro_data($1::jsonb)", [
          JSON.stringify(payload),
        ]);
        assert.equal(
          (
            await db.query<{ actual: string | null }>(
              "SELECT actual FROM economic_events WHERE id='cpi'",
            )
          ).rows[0].actual,
          null,
        );
        await assert.rejects(
          db.query("SELECT ingest_macro_data($1::jsonb)", [
            JSON.stringify({
              ...payload,
              records: [{ ...payload.records[0], impact: "INVALID" }],
            }),
          ]),
          /check constraint/,
        );
        assert.equal(
          (await db.query("SELECT * FROM economic_events WHERE id='cpi'")).rows
            .length,
          1,
        );
      },
    );
  } finally {
    await db.close();
  }
});
