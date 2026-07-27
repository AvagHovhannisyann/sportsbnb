import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion vocabulary. Durations/easings mirror the CSS custom
 * properties (--dur-*, --ease-out-expo) so JS- and CSS-driven motion match.
 * Reduced motion is already honoured, and no `<MotionConfig>` wrapper is
 * needed. An earlier version of this comment said pages "should wrap animated
 * trees in <MotionConfig reducedMotion='user'>" — a convention that appeared
 * in exactly one place in the repository, this docstring, and was followed by
 * no file at all. Measured on / at 1440px, three seconds after load, counting
 * elements below the fold still staged for their entrance:
 *
 *   prefers-reduced-motion: no-preference   17 at opacity 0, 18 transformed
 *   prefers-reduced-motion: reduce           0 at opacity 0,  1 transformed
 *
 * So the entrances resolve to their final state rather than playing. The CSS
 * side is handled separately, in the `@media (prefers-reduced-motion: reduce)`
 * block in index.css, which covers `.live-dot` and `.card-lift` — the two
 * things CSS animates that framer-motion does not.
 */

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

export const transitionFast: Transition = { duration: 0.15, ease: easeOutExpo };
export const transitionBase: Transition = { duration: 0.25, ease: easeOutExpo };
export const transitionSlow: Transition = { duration: 0.4, ease: easeOutExpo };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: transitionSlow },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitionBase },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transitionBase },
};

export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

/** Press feedback for buttons/cards (use with whileTap). */
export const tapScale = { scale: 0.97 };

/** Page-level enter transition (use with AnimatePresence in layouts). */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transitionBase },
  exit: { opacity: 0, transition: transitionFast },
};
