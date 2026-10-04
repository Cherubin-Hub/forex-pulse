"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NEWS_SENSITIVITY_VALUES,
  TRADER_PROFILE_VALUES,
  settingsSchema,
  type UserSettings,
} from "@/lib/schemas/settings";
import { NEWS_SENSITIVITY_OPTIONS, TRADER_PROFILE_OPTIONS } from "@/lib/constants/settings";
import { MARKET_SESSIONS } from "@/lib/constants/sessions";
import { useSettings } from "@/hooks/useSettings";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { RadioCardGroup, type RadioCardOption } from "@/components/settings/RadioCardGroup";
import { cn } from "@/lib/utils";

const PROFILE_OPTIONS: RadioCardOption<UserSettings["traderProfile"]>[] = TRADER_PROFILE_VALUES.map((value) => ({
  value,
  label: TRADER_PROFILE_OPTIONS[value].label,
  description: TRADER_PROFILE_OPTIONS[value].description,
  meta: TRADER_PROFILE_OPTIONS[value].timeframes.join(" · "),
}));

const NEWS_OPTIONS: RadioCardOption<UserSettings["newsSensitivity"]>[] = NEWS_SENSITIVITY_VALUES.map((value) => ({
  value,
  label: NEWS_SENSITIVITY_OPTIONS[value].label,
  description: NEWS_SENSITIVITY_OPTIONS[value].description,
  meta: `${NEWS_SENSITIVITY_OPTIONS[value].preReleaseMinutes}m before · ${NEWS_SENSITIVITY_OPTIONS[value].postReleaseMinutes}m after`,
}));

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{message}</p>;
}

export function SettingsForm() {
  const { settings, isLoaded, updateSettings, resetSettings } = useSettings();
  const [justSaved, setJustSaved] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UserSettings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  // When saved settings load (or change), sync them into the form.
  useEffect(() => {
    if (isLoaded) reset(settings);
  }, [isLoaded, settings, reset]);

  // Hide the "Saved" indicator after 2.5s.
  useEffect(() => {
    if (!justSaved) return;
    const timeoutId = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(timeoutId);
  }, [justSaved]);

  const onSubmit = (data: UserSettings) => {
    updateSettings(data);
    setJustSaved(true);
  };

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24">
      {/* Trader profile */}
      <SettingsSection
        title="Trader Profile"
        description="Determines which timeframes the analysis engine prioritises."
      >
        <Controller
          name="traderProfile"
          control={control}
          render={({ field }) => (
            <RadioCardGroup name="traderProfile" options={PROFILE_OPTIONS} value={field.value} onChange={field.onChange} />
          )}
        />
      </SettingsSection>

      {/* Risk parameters */}
      <SettingsSection
        title="Risk Parameters"
        description="Your personal rules. Setups that break them will be flagged."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="riskPerTradePercent">Risk per trade (%)</Label>
            <Input
              id="riskPerTradePercent"
              type="number"
              step="0.1"
              className="mt-1.5 tabular-nums"
              {...register("riskPerTradePercent", { valueAsNumber: true })}
            />
            <FieldError message={errors.riskPerTradePercent?.message} />
          </div>

          <div>
            <Label htmlFor="minRiskReward">Minimum R:R (1:x)</Label>
            <Input
              id="minRiskReward"
              type="number"
              step="0.1"
              className="mt-1.5 tabular-nums"
              {...register("minRiskReward", { valueAsNumber: true })}
            />
            <FieldError message={errors.minRiskReward?.message} />
          </div>

          <div>
            <Label htmlFor="maxOpenSetups">Max open setups</Label>
            <Input
              id="maxOpenSetups"
              type="number"
              step="1"
              className="mt-1.5 tabular-nums"
              {...register("maxOpenSetups", { valueAsNumber: true })}
            />
            <FieldError message={errors.maxOpenSetups?.message} />
          </div>
        </div>
      </SettingsSection>

      {/* Session focus */}
      <SettingsSection
        title="Session Focus"
        description="Sessions you actively trade. These are starred on the dashboard."
      >
        <Controller
          name="sessionFocus"
          control={control}
          render={({ field }) => {
            const toggle = (id: UserSettings["sessionFocus"][number]) => {
              field.onChange(
                field.value.includes(id) ? field.value.filter((v) => v !== id) : [...field.value, id]
              );
            };

            return (
              <div className="flex flex-wrap gap-2">
                {MARKET_SESSIONS.map((session) => {
                  const isSelected = field.value.includes(session.id);
                  return (
                    <button
                      key={session.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      onClick={() => toggle(session.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                      {session.name}
                    </button>
                  );
                })}
              </div>
            );
          }}
        />
        <FieldError message={errors.sessionFocus?.message} />
      </SettingsSection>

      {/* News sensitivity */}
      <SettingsSection
        title="News Sensitivity"
        description="Controls how early risk warnings appear around high-impact releases."
      >
        <Controller
          name="newsSensitivity"
          control={control}
          render={({ field }) => (
            <RadioCardGroup name="newsSensitivity" options={NEWS_OPTIONS} value={field.value} onChange={field.onChange} />
          )}
        />
      </SettingsSection>

      {/* Sticky action bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/80 p-3 shadow-lg backdrop-blur-md">
        <Button type="button" variant="ghost" onClick={resetSettings}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to defaults
        </Button>

        <div className="flex items-center gap-3">
          <AnimatePresence>
            {justSaved && (
              <motion.span
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400"
              >
                <Check className="h-4 w-4" /> Saved
              </motion.span>
            )}
          </AnimatePresence>
          {isDirty && !justSaved && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            Save changes
          </Button>
        </div>
      </div>
    </form>
  );
}
