import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { MotionProps, Variants } from "framer-motion";
import SEOHead from "@/components/seo/SEOHead";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Target, Users, Globe, Eye, Shield, Sparkles } from "lucide-react";
import { easeOutExpo } from "@/lib/motion";

/* ------------------------------------------------------------------
   Motion.

   One reveal, reused by every band on the page. This is a page someone
   scrolls through once, so the only thing motion has to do is mark
   where one section ends and the next begins — a different animation
   per band would read as decoration rather than structure.

   Easing comes from lib/motion, which mirrors --ease-out-expo in
   index.css. Under `prefers-reduced-motion: reduce` the orchestrating
   props are not passed at all rather than given a zero duration, so
   every section renders in its final state on the first frame — the
   convention HomePage and DiscoverPage established.
   ------------------------------------------------------------------ */

/** Gap between one sibling's entrance and the next. */
const STAGGER_STEP = 0.05;
/**
 * The index past which every remaining sibling shares the last delay.
 *
 * Nothing on this page is that long today — the values grid is four —
 * but both lists are rendered from arrays, and adding a fifth value or
 * a sixth should not be able to turn a reading cue into a queue.
 */
const STAGGER_CAP = 6;

const reveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: easeOutExpo,
      delay: Math.min(index, STAGGER_CAP) * STAGGER_STEP,
    },
  }),
};

/** Parents orchestrate only: they carry the label their children read and
    animate nothing themselves, so no child fades in through a second fade. */
const sequence: Variants = { hidden: {}, visible: {} };

const viewportOnce = { once: true, margin: "-80px" };

const AboutPage = () => {
  const prefersReduced = useReducedMotion();

  // Above the fold: plays on mount, because there is no scroll to wait for.
  const introMotion: MotionProps = prefersReduced
    ? {}
    : { variants: sequence, initial: "hidden", animate: "visible" };

  // Everything below: plays as the band comes into view, once.
  const sectionMotion: MotionProps = prefersReduced
    ? {}
    : { variants: sequence, initial: "hidden", whileInView: "visible", viewport: viewportOnce };

  const values = [
    {
      icon: Globe,
      title: "Accessibility",
      description: "We believe everyone should have easy access to sports facilities, regardless of where they live.",
    },
    {
      icon: Users,
      title: "Community",
      description: "Sports bring people together. We're building tools to help you find teammates and make new friends.",
    },
    {
      icon: Sparkles,
      title: "Simplicity",
      description: "Booking a court should be as easy as booking a restaurant. No phone calls, no hassle.",
    },
    {
      icon: Shield,
      title: "Trust",
      description: "Verified venues, secure payments, and transparent pricing you can count on.",
    },
  ];


  return (
    <Layout>
      <SEOHead
        title="About Sportsbnb"
        description="Learn about Sportsbnb's mission to make sports accessible to everyone. We're building the easiest way to find, book, and play at sports venues near you."
        canonical="/about"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Sportsbnb",
          url: "https://www.sportsbnb.org",
          logo: "https://www.sportsbnb.org/favicon.png",
          description: "Sports venue booking marketplace for Armenia and California.",
        }}
      />
      <div className="bg-background">
        {/* Hero */}
        <section className="py-16 md:py-24">
          <div className="container">
            <motion.div {...introMotion} className="max-w-3xl mx-auto text-center">
              <motion.h1
                variants={reveal}
                className="text-4xl md:text-5xl font-bold text-foreground mb-6"
              >
                Making sports more accessible
              </motion.h1>
              <motion.p
                variants={reveal}
                custom={1}
                className="text-lg text-muted-foreground leading-relaxed"
              >
                Sportsbnb was born from a simple frustration: booking a sports facility shouldn't
                require phone calls, waiting, and uncertainty. We're building the platform that
                makes finding and booking sports venues as easy as it should be.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 md:py-24 bg-card">
          <div className="container">
            <motion.div {...sectionMotion} className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <motion.div
                variants={reveal}
                className="bg-background border border-border/40 rounded-2xl p-8 md:p-10"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                  <Target className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To make it easy for anyone to find, organize, and join sports activity — removing
                  the friction that prevents active people from playing regularly.
                </p>
              </motion.div>
              <motion.div
                variants={reveal}
                custom={1}
                className="bg-background border border-border/40 rounded-2xl p-8 md:p-10"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                  <Eye className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Our Vision</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A world where finding a game is as easy as opening an app — one trusted place
                  to discover, connect, and stay active.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>


        {/* Values */}
        <section className="py-16 md:py-24 bg-muted/20">
          <motion.div {...sectionMotion} className="container">
            <motion.div variants={reveal} className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">What we believe in</h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <motion.div
                    key={value.title}
                    variants={reveal}
                    custom={index + 1}
                    className="bg-card rounded-2xl p-6 md:p-8 text-center border border-border/40"
                  >
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="surface-invert py-16 md:py-24 bg-secondary">
          <div className="container">
            <motion.div {...sectionMotion} className="max-w-2xl mx-auto text-center">
              <motion.h2
                variants={reveal}
                className="text-3xl font-bold text-secondary-foreground mb-4"
              >
                Ready to find your game?
              </motion.h2>
              <motion.p
                variants={reveal}
                custom={1}
                className="text-lg text-secondary-foreground/70 mb-8"
              >
                Join players and venue owners on Sportsbnb.
              </motion.p>
              <motion.div
                variants={reveal}
                custom={2}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Button asChild size="lg" variant="hero">
                  <Link to="/signup">Get started free</Link>
                </Button>
                <Button asChild size="lg" variant="hero" className="border-2 border-foreground/30 bg-transparent text-foreground hover:bg-foreground hover:text-background">
                  <Link to="/contact">Contact us</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default AboutPage;
