import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { MotionProps, Variants } from "framer-motion";
import { Compass } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { StatusPanel } from "@/components/common/StatusPanel";
import { easeOutExpo } from "@/lib/motion";

/**
 * Landed on by anyone following a stale link — an expired venue URL, an old
 * share, a typo. Previously the generated default: no Layout, so it stranded
 * people with a single "Return to Home" link and no nav to escape through;
 * `bg-muted` rather than `bg-background`, so it did not even match the app it
 * belonged to; and a raw <a href="/"> that forced a full document reload
 * inside a single-page app.
 */

/* ------------------------------------------------------------------
   Motion.

   The one page in the app that may say something with its animation
   rather than only clarify hierarchy: the compass swings and settles,
   the way a compass does when you stop moving. It is a single 480ms
   rotation on the page's own icon, it plays once, and it is the reason
   this dead end reads as part of the product rather than as a crash.

   Then the panel and its two ways out arrive underneath it, staggered,
   so the eye lands on the explanation before the buttons — the whole
   job of this page is to get someone moving again.

   The swing is CSS rather than framer-motion because the icon belongs
   to `StatusPanel`, a shared component this page renders but does not
   own; a scoped keyframe reaches it without changing it. Everything
   here is transform and opacity, and the reduced-motion block below
   mirrors the JS convention exactly — no animation at all rather than
   a zero-duration one.
   ------------------------------------------------------------------ */

const COMPASS_MOTION_CSS = `
/* The icon chip is StatusPanel's first child. Fill mode "backwards" rather
   than "forwards": a filled-forwards animation keeps winning the cascade
   after it has ended, which would pin the transform and beat anything later. */
.notfound-panel > div:first-child {
  animation: notfound-compass-settle 480ms var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) backwards;
}
@keyframes notfound-compass-settle {
  from { transform: rotate(-24deg) scale(0.92); }
  to   { transform: rotate(0deg) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .notfound-panel > div:first-child { animation: none; }
}
`;

/** Gap between the panel landing and the routes out of here. */
const STAGGER_STEP = 0.06;

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOutExpo },
  },
};

/**
 * The buttons, settling a beat after the panel that explains them.
 *
 * Translate only, deliberately: this row sits inside the panel, which is
 * already fading in, and a nested opacity animation would fade it twice —
 * visibly slower than the sentence above it. Riding the panel's fade and
 * adding only the settle keeps it one entrance with a late beat.
 */
const exitsVariants: Variants = {
  hidden: { y: 8 },
  visible: {
    y: 0,
    transition: { duration: 0.28, ease: easeOutExpo, delay: 2 * STAGGER_STEP },
  },
};

const NotFound = () => {
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Reduced motion: the props are omitted entirely rather than given a zero
  // duration, so the panel mounts in its final state — the convention the rest
  // of the app follows.
  const panelMotion: MotionProps = prefersReduced
    ? {}
    : { variants: panelVariants, initial: "hidden", animate: "visible" };

  // The way out, arriving just after the sentence that explains why you need
  // one. Press feedback comes from the shared Button, which scales on :active.
  const exitsMotion: MotionProps = prefersReduced
    ? {}
    : { variants: exitsVariants, initial: "hidden", animate: "visible" };

  // Withheld rather than undone with a `motion-reduce:` utility, which would
  // have to out-specify the class it is cancelling.
  const homeNudge = `inline-block${
    prefersReduced ? "" : " transition-transform duration-200 ease-out group-hover:-translate-x-0.5"
  }`;

  return (
    <Layout>
      {/* A 404 must never be indexed — otherwise stale links keep their
          ranking and keep sending people here. */}
      <SEOHead title="Page not found" noIndex />
      <style dangerouslySetInnerHTML={{ __html: COMPASS_MOTION_CSS }} />
      <div className="container flex min-h-[60vh] items-center justify-center py-16">
        <motion.div {...panelMotion}>
          <StatusPanel
            className="notfound-panel"
            icon={Compass}
            title="We can't find that page"
            description="The link may be out of date, or the page may have moved. The nav above will get you anywhere in the app."
          >
            {/* Wrapped rather than animated individually: they are one offer of
                two options, and dealing them out separately would rank one
                above the other. */}
            <motion.div {...exitsMotion} className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/venues">Browse venues</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/" className="group">
                  <span className={homeNudge}>Back to home</span>
                </Link>
              </Button>
            </motion.div>
          </StatusPanel>
        </motion.div>
      </div>
    </Layout>
  );
};

export default NotFound;
