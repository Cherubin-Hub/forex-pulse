"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type RadioCardOption<T extends string> = {
  value: T;
  label: string;
  description: string;
  meta?: string;
};

type RadioCardGroupProps<T extends string> = {
  name: string;
  options: RadioCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function RadioCardGroup<T extends string>({ name, options, value, onChange }: RadioCardGroupProps<T>) {
  return (
    <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative rounded-lg border p-4 text-left transition-colors",
              isSelected ? "border-transparent bg-primary/5" : "border-border hover:border-foreground/20"
            )}
          >
            {isSelected && (
              <motion.span
                layoutId={`${name}-selected-ring`}
                className="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <p className="text-sm font-medium">{option.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
            {option.meta && <p className="mt-3 text-xs font-medium tabular-nums">{option.meta}</p>}
          </button>
        );
      })}
    </div>
  );
}
