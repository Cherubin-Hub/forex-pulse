import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { signSessionPayload, verifySessionToken } from "../lib/sso/session";
import { verifySSOToken } from "../lib/sso/verifier";
import { getOwnedSetup } from "../lib/services/trading";
import { getSavedAlerts, saveAlerts } from "../lib/services/alertEngine";
import { loadAllPostMortems } from "../lib/postMortemUtils";
import { ageQuotes } from "../lib/marketQuality";
import { MOCK_QUOTES } from "../lib/mock/quotes";

test("Gateway sessions require a valid signature, identity and bounded issuance time", async () => {
  const previous = process.env.CROSS_APP_SSO_SECRET;
  process.env.CROSS_APP_SSO_SECRET = "test-secret-never-used-in-production";
  try {
    const identity = {
      userId: randomUUID(),
      email: "trader@example.com",
      authenticatedVia: "pulse-gateway",
      issuedAt: Date.now(),
    };
    const token = await signSessionPayload(identity);
    assert.equal((await verifySessionToken(token)).valid, true);
    assert.equal((await verifySessionToken(token + "tampered")).valid, false);
    assert.equal(
      (
        await verifySessionToken(
          await signSessionPayload({
            ...identity,
            issuedAt: Date.now() + 60000,
          }),
        )
      ).valid,
      false,
    );
    assert.equal(
      (
        await verifySessionToken(
          await signSessionPayload({
            ...identity,
            issuedAt: Date.now() - 8 * 86400000,
          }),
        )
      ).valid,
      false,
    );
    assert.equal(
      (
        await verifySessionToken(
          await signSessionPayload({ ...identity, userId: "not-a-uuid" }),
        )
      ).valid,
      false,
    );
  } finally {
    if (previous === undefined) delete process.env.CROSS_APP_SSO_SECRET;
    else process.env.CROSS_APP_SSO_SECRET = previous;
  }
});
test("SSO callbacks reject malformed signed payloads", () => {
  const previous = process.env.CROSS_APP_SSO_SECRET;
  process.env.CROSS_APP_SSO_SECRET = "test-secret";
  try {
    const sign = (payload: object) => {
      const raw = Buffer.from(JSON.stringify(payload)).toString("base64");
      return {
        raw,
        signature: createHmac("sha256", "test-secret")
          .update(raw)
          .digest("hex"),
      };
    };
    const valid = {
      userId: randomUUID(),
      email: "trader@example.com",
      nonce: randomUUID(),
      timestamp: Date.now(),
      appName: "forex-pulse",
    };
    let value = sign(valid);
    assert.equal(verifySSOToken(value.raw, value.signature).valid, true);
    value = sign({ ...valid, timestamp: null });
    assert.equal(verifySSOToken(value.raw, value.signature).valid, false);
    value = sign({ ...valid, nonce: "" });
    assert.equal(verifySSOToken(value.raw, value.signature).valid, false);
  } finally {
    if (previous === undefined) delete process.env.CROSS_APP_SSO_SECRET;
    else process.env.CROSS_APP_SSO_SECRET = previous;
  }
});
test("service-role setup lookups always include the verified account owner", async () => {
  const originalFetch = globalThis.fetch,
    originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
    originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const owner = randomUUID(),
    stranger = randomUUID(),
    setup = randomUUID();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://database.example";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  const calls: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    calls.push(url);
    assert.equal(url.searchParams.get("id"), `eq.${setup}`);
    if (url.searchParams.get("user_id") === `eq.${owner}`)
      return new Response(JSON.stringify({ id: setup, user_id: owner }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    return new Response(
      JSON.stringify({ code: "PGRST116", message: "No rows" }),
      { status: 406, headers: { "content-type": "application/json" } },
    );
  };
  try {
    assert.equal((await getOwnedSetup(owner, setup)).user_id, owner);
    await assert.rejects(getOwnedSetup(stranger, setup), /access denied/);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
});
test("quotes age out even when streaming is paused", () => {
  const quote = {
    ...MOCK_QUOTES[0],
    status: "LIVE" as const,
    timestamp: new Date(100000).toISOString(),
  };
  assert.equal(ageQuotes([quote], 300001)[0].status, "DELAYED");
  assert.equal(ageQuotes([quote], 100001)[0].status, "LIVE");
});
test("browser alerts and reviews cannot read legacy shared account storage", () => {
  assert.deepEqual(getSavedAlerts(), []);
  assert.deepEqual(loadAllPostMortems(), {});
  assert.doesNotThrow(() => saveAlerts([]));
});
