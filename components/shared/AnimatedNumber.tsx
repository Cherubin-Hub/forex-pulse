"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { counterSpring } from "@/lib/motion";

interface AnimatedNumberProps {
  value: number | null;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  className,
}: AnimatedNumberProps) {
  const [mounted, setMounted] = useState(false);
  const prevValue = useRef(value ?? 0);

  // Strict Hydration Match Pattern (forex-pulse rule)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration match pattern
    setMounted(true);
  }, []);

  const initial = value ?? 0;
  const spring = useSpring(prevValue.current, counterSpring);

  const display = useTransform(spring, (latest: number) => {
    const formatted = latest.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    if (value !== null) {
      prevValue.current = value;
      spring.set(value);
    }
  }, [value, spring]);

  if (value === null) {
    return <span className={className}>—</span>;
  }

  // Initial SSR & first client pass render static markup to guarantee identical DOM
  if (!mounted) {
    const staticFormatted = initial.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return (
      <span className={className}>
        {prefix}{staticFormatted}{suffix}
      </span>
    );
  }

  return <motion.span className={className}>{display}</motion.span>;
}
