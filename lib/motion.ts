import type { Variants, Transition } from "framer-motion";

// ═══════════════════════════════════════════════════════════
// Centralized Framer Motion Presets — Forex Pulse v2.0
// ═══════════════════════════════════════════════════════════

// ── Spring Presets ──────────────────────────────────────────
/** Snappy interactions: active pills, selection rings, toggles */
export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 32,
};

/** Bouncy hover effects: card lift, button press */
export const SPRING_BOUNCY: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 20,
};

/** Gentle layout shifts: sidebar resize, panel expand */
export const SPRING_GENTLE: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
};

// ── Container Variants ─────────────────────────────────────
/** Staggered children container. Wraps grids and lists. */
export const staggerContainer = (staggerDelay = 0.06): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: staggerDelay } },
});

// ── Item Variants ──────────────────────────────────────────
/** Card entrance: fade + rise + slight scale. */
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/** List item entrance: fade + horizontal slide. */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: { opacity: 0, x: 16, transition: { duration: 0.2 } },
};

/** Fade & slide down: banners, toasts, collapsible sections. */
export const fadeSlideVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/** Scale pop: badges, tooltips, notification dots. */
export const scalePopVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: SPRING_SNAPPY },
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.15 } },
};

/** Number counter spring for AnimatedNumber component. */
export const counterSpring: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 15,
  mass: 0.5,
};
