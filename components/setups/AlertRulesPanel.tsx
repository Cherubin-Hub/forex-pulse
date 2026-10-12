"use client";

import { useState, useEffect } from "react";
import { Bell, Plus, Trash2, CheckCircle2, Zap, Shield } from "lucide-react";
import type { PriceAlert, AlertCondition, AlertAction } from "@/types/alert";
import type { TradingSetup } from "@/types/setup";
import { getSavedAlerts, saveAlerts } from "@/lib/services/alertEngine";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AlertRulesPanelProps {
  setups: TradingSetup[];
}

export function AlertRulesPanel({ setups }: AlertRulesPanelProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [symbol, setSymbol] = useState("EURUSD");
  const [condition, setCondition] = useState<AlertCondition>("PRICE_ABOVE");
  const [targetPrice, setTargetPrice] = useState("");
  const [action, setAction] = useState<AlertAction>("NOTIFY");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    setAlerts(getSavedAlerts());
  }, []);

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(targetPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const newAlert: PriceAlert = {
      id: `alert-${Date.now()}`,
      setupId: setups.find((s) => s.symbol === symbol)?.id ?? null,
      symbol,
      condition,
      targetPrice: priceNum,
      action,
      status: "ACTIVE",
      message: `Trigger when ${symbol} hits ${priceNum}`,
      createdAt: new Date().toISOString(),
      firedAt: null,
    };

    const nextList = [newAlert, ...alerts];
    setAlerts(nextList);
    saveAlerts(nextList);
    setTargetPrice("");
    setIsOpenForm(false);
  };

  const handleDeleteAlert = (id: string) => {
    const nextList = alerts.filter((a) => a.id !== id);
    setAlerts(nextList);
    saveAlerts(nextList);
  };

  return (
    <Card className="glass shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Signal Automation & Price Alerts</CardTitle>
            <Badge variant="info">
              {alerts.filter((a) => a.status === "ACTIVE").length} Active
            </Badge>
          </div>
          <CardDescription>
            Automated price crossing monitors and trade entry triggers.
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant={isOpenForm ? "secondary" : "default"}
          onClick={() => setIsOpenForm((prev) => !prev)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {isOpenForm ? "Cancel" : "Add Alert"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isOpenForm && (
          <form
            onSubmit={handleAddAlert}
            className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 animate-in fade-in-0 duration-200"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Symbol</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                >
                  <option value="EURUSD">EUR/USD</option>
                  <option value="GBPUSD">GBP/USD</option>
                  <option value="USDJPY">USD/JPY</option>
                  <option value="AUDUSD">AUD/USD</option>
                  <option value="XAUUSD">XAU/USD (Gold)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as AlertCondition)}
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                >
                  <option value="PRICE_ABOVE">Price Above</option>
                  <option value="PRICE_BELOW">Price Below</option>
                  <option value="PRICE_INSIDE_ZONE">Inside Entry Zone</option>
                  <option value="BREAKEVEN_REACHED">+1.0R Breakeven</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Price</label>
                <Input
                  type="number"
                  step="0.00001"
                  placeholder="e.g. 1.08500"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as AlertAction)}
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                >
                  <option value="NOTIFY">Toast Notify</option>
                  <option value="AUTO_TRIGGER">Auto-Trigger Entry</option>
                  <option value="AUTO_BREAKEVEN">Auto-Set Breakeven</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm">Create Automation Rule</Button>
            </div>
          </form>
        )}

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs font-medium">No custom price alerts configured.</p>
            <p className="text-[11px] opacity-70">Add a rule to monitor prices or automatically trail stops.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  {alert.status === "ACTIVE" ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {alert.action === "AUTO_TRIGGER" ? (
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                      ) : alert.action === "AUTO_BREAKEVEN" ? (
                        <Shield className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Bell className="h-3.5 w-3.5" />
                      )}
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{alert.symbol}</span>
                      <span className="text-muted-foreground">
                        {alert.condition === "PRICE_ABOVE" && "≥"}
                        {alert.condition === "PRICE_BELOW" && "≤"}
                        {alert.condition === "PRICE_INSIDE_ZONE" && "Zone In:"}
                        {alert.condition === "BREAKEVEN_REACHED" && "Gain:"}
                      </span>
                      <span className="font-mono font-semibold text-foreground">{alert.targetPrice}</span>
                      <Badge
                        variant={
                          alert.status === "ACTIVE"
                            ? alert.action === "AUTO_TRIGGER"
                              ? "warning"
                              : alert.action === "AUTO_BREAKEVEN"
                              ? "success"
                              : "secondary"
                            : "neutral"
                        }
                      >
                        {alert.action}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {alert.status === "FIRED"
                        ? `Fired at ${new Date(alert.firedAt ?? "").toLocaleTimeString()}`
                        : "Active and monitoring live feed"}
                    </p>
                  </div>
                </div>

                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
