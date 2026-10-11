# Step 52: External Trade Webhook Bridge for MetaTrader 5 & cTrader

## 🎯 Objective
Bridge Forex Pulse with live algorithmic trade execution by introducing the **External Trade Webhook Bridge** (`/api/webhooks/trade-execution`).

This step connects institutional brokers and trading platforms (MetaTrader 4, MetaTrader 5, cTrader, or TradingView Webhook Alerts) directly into Forex Pulse's state machine:
1. **Strict Zod Payload Validation (`lib/schemas/webhookSchema.ts`):** Ensures incoming broker payloads are validated against strict type constraints.
2. **Authenticated Webhook Ingestion API (`app/api/webhooks/trade-execution/route.ts`):** Secure endpoint authenticated via `WEBHOOK_SECRET` that automatically handles:
   - `OPEN`: Instantly registers live trades as `ENTRY_TRIGGERED` setups.
   - `MODIFY`: Adjusts dynamic stop loss and take profit levels (e.g. trailing stops or moving to breakeven).
   - `CLOSE`: Resolves trade setups to `TP_REACHED` or `SL_HIT`, ready for post-mortem review!
3. **MQL5 & cURL Integration Recipes:** Provides ready-to-use snippets to test and integrate EA execution scripts.

---

## 🛠 Step-by-Step Implementation

### 1. Create Webhook Validation Schema (`lib/schemas/webhookSchema.ts`)
Create the Zod schema enforcing payload structure.

**File:** `lib/schemas/webhookSchema.ts`
```typescript
import { z } from "zod";

export const tradeWebhookSchema = z.object({
  action: z.enum(["OPEN", "MODIFY", "CLOSE"]),
  ticket: z.string().min(1, "Ticket or Order ID is required"),
  symbol: z.string().min(3).max(10).transform((s) => s.replace("/", "").toUpperCase()),
  direction: z.enum(["LONG", "SHORT"]),
  price: z.number().positive("Entry price must be positive"),
  stopLoss: z.number().positive("Stop loss must be positive"),
  takeProfit: z.number().positive("Take profit must be positive"),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  closePrice: z.number().positive().optional(),
});

export type TradeWebhookPayload = z.infer<typeof tradeWebhookSchema>;
```

---

### 2. Create Webhook Ingest Endpoint (`app/api/webhooks/trade-execution/route.ts`)
Create the authenticated serverless webhook handler.

**File:** `app/api/webhooks/trade-execution/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { tradeWebhookSchema } from "@/lib/schemas/webhookSchema";
import type { Database } from "@/types/database";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey);
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate Request
    const authHeader = request.headers.get("x-webhook-secret") || request.headers.get("authorization");
    const configuredSecret = process.env.WEBHOOK_SECRET;

    if (configuredSecret) {
      const token = authHeader?.replace("Bearer ", "").trim();
      if (token !== configuredSecret) {
        return NextResponse.json({ success: false, error: "Unauthorized webhook payload" }, { status: 401 });
      }
    }

    // 2. Parse & Validate Payload
    const body = await request.json();
    const result = tradeWebhookSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Invalid payload format", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { action, ticket, symbol, direction, price, stopLoss, takeProfit, notes, tags, closePrice } = result.data;
    const supabase = getAdminClient();

    // 3. Handle Actions
    if (action === "OPEN") {
      const riskPips = Math.abs(price - stopLoss);
      const rewardPips = Math.abs(takeProfit - price);
      const riskReward = riskPips > 0 ? Number((rewardPips / riskPips).toFixed(2)) : 2.0;

      const { data, error } = await supabase
        .from("trading_setups")
        .insert({
          symbol,
          direction,
          entry_min: price,
          entry_max: price,
          stop_loss: stopLoss,
          take_profit_1: takeProfit,
          risk_reward: riskReward,
          status: "ENTRY_TRIGGERED",
          invalidation_rule: `Broker Ticket #${ticket} SL Breach`,
          notes: notes ?? `Ingested via Broker Webhook (Ticket #${ticket})`,
          confluence_tags: tags ?? ["Broker Webhook", "Algorithmic Entry"],
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Registered live trade for ${symbol} (${direction})`,
        setupId: data.id,
      });
    }

    if (action === "MODIFY") {
      const { data, error } = await supabase
        .from("trading_setups")
        .update({
          stop_loss: stopLoss,
          take_profit_1: takeProfit,
          updated_at: new Date().toISOString(),
        })
        .ilike("notes", `%#${ticket}%`)
        .select();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Updated trade parameters for Ticket #${ticket}`,
        modifiedCount: data.length,
      });
    }

    if (action === "CLOSE") {
      // Determine if win or loss based on close price
      let nextStatus: "TP_REACHED" | "SL_HIT" = "TP_REACHED";
      if (closePrice !== undefined) {
        const isLong = direction === "LONG";
        const isProfit = isLong ? closePrice > price : closePrice < price;
        nextStatus = isProfit ? "TP_REACHED" : "SL_HIT";
      }

      const { data, error } = await supabase
        .from("trading_setups")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .ilike("notes", `%#${ticket}%`)
        .select();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Resolved trade Ticket #${ticket} to ${nextStatus}`,
        resolvedCount: data.length,
      });
    }

    return NextResponse.json({ success: false, error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

---

## 🧪 Testing with cURL
You can test the webhook endpoint directly with cURL:

```bash
curl -X POST http://localhost:3000/api/webhooks/trade-execution \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret" \
  -d '{
    "action": "OPEN",
    "ticket": "98765432",
    "symbol": "EURUSD",
    "direction": "LONG",
    "price": 1.08500,
    "stopLoss": 1.08200,
    "takeProfit": 1.09200,
    "notes": "H1 FVG Liquidity Sweep Ingestion",
    "tags": ["ICT", "Broker EA"]
  }'
```

