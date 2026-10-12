"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { staggerContainer, cardVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StaggeredGridProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggeredGrid({
  children,
  className,
  staggerDelay = 0.05,
}: StaggeredGridProps) {
  return (
    <motion.div
      variants={staggerContainer(staggerDelay)}
      initial="hidden"
      animate="visible"
      className={cn("grid gap-4", className)}
    >
      {children}
    </motion.div>
  );
}

export function StaggeredGridItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={cardVariants} className={className}>
      {children}
    </motion.div>
  );
}
