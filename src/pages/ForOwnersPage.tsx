import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CalendarSync,
  Check,
  Clock,
  CreditCard,
  Globe,
  MessageCircle,
  Settings,
  Shield,
  Smartphone,
  Star,
  Users,
} from "lucide-react";
import SEOHead from "@/components/seo/SEOHead";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import venueFootball from "@/assets/venue-football.jpg";

const features = [
  {
    icon: Calendar,
    title: "Visual schedule management",
    description:
      "See bookings in a weekly calendar and manage the full schedule without a separate spreadsheet.",
  },
  {
    icon: CreditCard,
    title: "Instant booking and payments",
    description:
      "Players book and pay online by card. Each paid reservation appears in the same operational view.",
  },
  {
    icon: BarChart3,
    title: "Analytics dashboard",
    description:
      "Track revenue, booking trends, occupancy, and the activity that matters to your venue.",
  },
  {
    icon: Clock,
    title: "Hours and availability",
    description:
      "Set opening hours, block dates, and control the booking window for each venue.",
  },
  {
    icon: Globe,
    title: "Embeddable booking widget",
    description:
      "Add booking to your own website with an embed, a JavaScript snippet, or a direct link.",
  },
  {
    icon: CalendarSync,
    title: "Calendar sync",
    description:
      "Connect Google Calendar or Outlook, with iCal export and import for other calendar tools.",
  },
  {
    icon: Settings,
    title: "Custom policies",
    description:
      "Define cancellation rules, buffers, booking durations, grace periods, and overtime rates.",
  },
  {
    icon: MessageCircle,
    title: "Direct messaging",
    description:
      "Keep booking questions with the reservation and use quick replies for common requests.",
  },
  {
    icon: Smartphone,
    title: "Equipment rentals",
    description:
      "List balls, rackets, and other equipment that players can add when they book.",
  },
  {
    icon: Shield,
    title: "Verified listings",
    description:
      "Venue review and verification give players clearer information before they commit.",
  },
  {
    icon: Star,
    title: "Reviews and ratings",
    description:
      "Collect feedback after bookings and build a useful record for future players.",
  },
  {
    icon: Users,
    title: "Manual bookings",
    description:
      "Add walk-in and phone bookings so online and offline activity share one calendar.",
  },
];

const stats = [
  { value: "0%", label: "Commission" },
  { value: "0", label: "Monthly or listing fees" },
  { value: "Weekly", label: "Itemised payouts" },
  { value: "AMD", label: "Settlement currency" },
];

const onboardingSteps = [
  {
    step: "01",
    title: "Create an owner account",
    description: "Choose the owner role and open the venue setup flow.",
  },
  {
    step: "02",
    title: "Add the venue",
    description: "Upload photos, set prices and hours, and add the policies players need to know.",
  },
  {
    step: "03",
    title: "Add payout details",
    description: "Choose the Armenian bank account or Idram wallet that should receive earnings.",
  },
  {
    step: "04",
    title: "Go live",
    description: "After approval, the venue appears in search and can accept hourly bookings.",
  },
];

const ForOwnersPage = () => (
  <Layout>
    <SEOHead
      title="List Your Sports Venue in Armenia — Sportsbnb for Owners"
      description="List your court, pitch or pool on Sportsbnb. Set your own hourly rate and cancellation terms, take card payments in dram, and keep 100% of your price. Zero commission, no listing fee, no monthly cost."
      canonical="/for-owners"
    />

    <section className="border-b border-border bg-background">
      <div className="container grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
        <div className="max-w-2xl">
          <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-foreground-soft">
            <span className="h-2 w-2 rounded-full bg-brand-tuff" aria-hidden="true" />
            For venue owners
          </div>
          <h1 className="text-balance font-display text-4xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Run the venue. Let the booking flow run with you.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground-soft">
            Publish availability, take bookings and card payments, and keep your schedule and earnings in one place — without a monthly fee.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/list-venue">
                List your venue free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/contact">Talk to our team</Link>
            </Button>
          </div>
        </div>

        <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="aspect-[4/3] overflow-hidden bg-surface-2">
            <img
              src={venueFootball}
              alt="Players on an indoor football pitch"
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
          <figcaption className="flex flex-col gap-1 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium text-foreground">One operating view</span>
            <span className="text-sm text-muted-foreground">Availability · bookings · payouts</span>
          </figcaption>
        </figure>
      </div>
    </section>

    <section aria-label="Owner pricing summary" className="border-b border-border bg-surface-1">
      <dl className="container grid grid-cols-2 divide-x divide-y divide-border py-0 sm:grid-cols-4 sm:divide-y-0">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col px-4 py-7 first:pl-0 sm:px-6 lg:py-9">
            <dt className="mt-1 text-sm text-muted-foreground">{stat.label}</dt>
            <dd className="order-first font-display text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>

    <section className="bg-background py-16 md:py-24">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Venue operations</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            The tools around a booking, kept together.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-foreground-soft">
            Use one dashboard for the work that normally gets split across calls, calendars, messages, and spreadsheets.
          </p>
        </div>

        <ul className="mt-12 grid border-t border-border md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <li key={title} className="border-b border-border py-6 md:pr-8 lg:min-h-52 lg:py-8">
              <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-ui leading-relaxed text-foreground-soft">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>

    <section className="surface-invert bg-secondary py-16 text-secondary-foreground md:py-24">
      <div className="container grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:gap-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-secondary-foreground/65">Simple pricing</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight md:text-5xl">
            You set the hourly price. You keep it.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-secondary-foreground/75">
            Sportsbnb takes no commission, listing fee, or monthly subscription. Players pay the price you publish, and completed bookings are paid out weekly.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "No price added on top",
              "Weekly itemised payouts",
              "Bank account or Idram wallet",
              "No minimum commitment",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-secondary-foreground/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-l-2 border-brand-tuff pl-6 sm:pl-8">
          <p className="text-sm text-secondary-foreground/65">Commission per booking</p>
          <p className="mt-2 font-display text-7xl font-semibold tabular-nums md:text-8xl">0%</p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/list-venue">Start your listing</Link>
          </Button>
        </div>
      </div>
    </section>

    <section className="bg-background py-16 md:py-24">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Getting started</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            Four clear steps from account to listing.
          </h2>
        </div>
        <ol className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {onboardingSteps.map((item) => (
            <li key={item.step} className="border-t border-border pt-5">
              <span className="font-mono text-sm tabular-nums text-brand-tuff">{item.step}</span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-ui leading-relaxed text-foreground-soft">{item.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>

    <section className="border-t border-border bg-brand-tuff-soft py-14 md:py-20">
      <div className="container flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-foreground-soft">Ready when your venue is</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            Put the next available hour online.
          </h2>
          <p className="mt-4 text-lg text-foreground-soft">
            Start the listing yourself, or speak with the team before you publish.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
          <Button asChild size="lg">
            <Link to="/list-venue">List your venue free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/contact">Contact partnerships</Link>
          </Button>
        </div>
      </div>
    </section>
  </Layout>
);

export default ForOwnersPage;
