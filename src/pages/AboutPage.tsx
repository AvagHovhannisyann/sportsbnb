import { Link } from "react-router-dom";
import { Eye, Globe, MousePointer2, Shield, Target, Users } from "lucide-react";
import SEOHead from "@/components/seo/SEOHead";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";

const values = [
  {
    icon: Globe,
    title: "Access",
    description: "Make it easier to find the facilities that already exist nearby.",
  },
  {
    icon: Users,
    title: "Community",
    description: "Help players find games, teammates, and reasons to play more often.",
  },
  {
    icon: MousePointer2,
    title: "Simplicity",
    description: "Replace calls and uncertainty with a clear, direct booking flow.",
  },
  {
    icon: Shield,
    title: "Trust",
    description: "Show venue details, pricing, policies, and booking status without ambiguity.",
  },
];

const AboutPage = () => (
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

    <header className="border-b border-border bg-surface-1">
      <div className="container grid gap-8 py-14 md:py-20 lg:grid-cols-[1fr_0.8fr] lg:items-end lg:gap-16">
        <div>
          <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-foreground-soft">
            <span className="h-2 w-2 rounded-full bg-brand-tuff" aria-hidden="true" />
            About Sportsbnb
          </div>
          <h1 className="max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            More time playing. Less time arranging it.
          </h1>
        </div>
        <p className="max-w-xl text-lg leading-relaxed text-foreground-soft">
          Sportsbnb started with a simple frustration: booking a sports facility should not require a chain of calls, waiting, and guesswork.
        </p>
      </div>
    </header>

    <section className="bg-background py-16 md:py-24">
      <div className="container">
        <div className="grid border-y border-border md:grid-cols-2 md:divide-x md:divide-border">
          <article className="py-8 md:pr-12 lg:py-12 lg:pr-16">
            <Target className="h-6 w-6 text-primary" strokeWidth={1.75} aria-hidden="true" />
            <h2 className="mt-6 text-2xl font-semibold text-foreground md:text-3xl">Our mission</h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-foreground-soft">
              Make it easy for anyone to find, organize, and join sports activity by removing the friction that keeps active people from playing regularly.
            </p>
          </article>
          <article className="border-t border-border py-8 md:border-t-0 md:pl-12 lg:py-12 lg:pl-16">
            <Eye className="h-6 w-6 text-primary" strokeWidth={1.75} aria-hidden="true" />
            <h2 className="mt-6 text-2xl font-semibold text-foreground md:text-3xl">Our vision</h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-foreground-soft">
              One trusted place where finding a venue or a game is as direct as opening the app and seeing what is available.
            </p>
          </article>
        </div>
      </div>
    </section>

    <section className="border-y border-border bg-surface-1 py-16 md:py-24">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">How we make decisions</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            Four principles, applied to both sides of the marketplace.
          </h2>
        </div>
        <ul className="mt-12 grid border-t border-border sm:grid-cols-2">
          {values.map(({ icon: Icon, title, description }) => (
            <li key={title} className="border-b border-border py-7 sm:min-h-48 sm:pr-10 md:py-9">
              <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-foreground-soft">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>

    <section className="bg-brand-tuff-soft py-14 md:py-20">
      <div className="container flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-balance font-display text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            Find the next place to play.
          </h2>
          <p className="mt-4 text-lg text-foreground-soft">
            Browse as a player, or talk with us about bringing a venue onto Sportsbnb.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
          <Button asChild size="lg">
            <Link to="/venues">Browse venues</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/contact">Contact us</Link>
          </Button>
        </div>
      </div>
    </section>
  </Layout>
);

export default AboutPage;
