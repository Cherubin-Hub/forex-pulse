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
