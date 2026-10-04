"use client";

import { motion, type Variants } from "framer-motion";
import type { Instrument, PriceQuote } from "@/types/market";
import { CurrencyCard } from "@/components/market/CurrencyCard";

const GRID_VARIANTS: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export type CurrencyCardItem = {
  instrument: Instrument;
  quote: PriceQuote | null;
};

export function CurrencyCardGrid({ items }: { items: CurrencyCardItem[] }) {
  return (
    <motion.div
      variants={GRID_VARIANTS}
      initial="hidden"
      animate="visible"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {items.map(({ instrument, quote }) => (
        <CurrencyCard key={instrument.symbol} instrument={instrument} quote={quote} />
      ))}
    </motion.div>
  );
}
