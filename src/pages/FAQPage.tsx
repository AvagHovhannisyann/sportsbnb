import Layout from "@/components/layout/Layout";
import SEOHead, { createFAQJsonLd } from "@/components/seo/SEOHead";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const FAQPage = () => {
  const faqs = [
    {
      category: "Booking",
      questions: [
        {
          q: "How do I book a venue?",
          a: "Simply search for venues in your area, select your preferred date and time slot, and click 'Book Now'. You'll receive an instant confirmation via email.",
        },
        {
          q: "Can I cancel my booking?",
          a: "Cancellation terms are set by each venue, not by us, so they vary — some offer a full refund up to a cutoff, some a partial refund, and some are non-refundable. The exact terms for the venue you're booking are shown on the booking panel before you pay, and again on your confirmation.",
        },
        {
          q: "How do I pay for my booking?",
          a: "By card — Visa or Mastercard — on a secure payment page. Payment is taken at the time of booking and handled entirely by our payment provider, so your card details never reach SportsBnB.",
        },
        {
          q: "Can I change the time of a booking?",
          a: "Not yet — there's no reschedule flow at the moment. Cancel the booking you have (under the venue's own cancellation terms) and book the slot you want instead. If the venue is flexible, messaging the owner directly is often the quickest route.",
        },
      ],
    },
    {
      category: "Games & Teams",
      questions: [
        {
          q: "How do I join an open game?",
          a: "Browse the 'Games' section to find open games in your area. Click on any game that interests you and hit 'Join Game' to add yourself to the roster.",
        },
        {
          q: "Can I create my own game?",
          a: "Absolutely! Click 'Create Game' and fill in the details like sport, venue, date/time, and how many players you need. Other players can then join your game.",
        },
        {
          q: "What if a game gets cancelled?",
          a: "If a game host cancels, all participants will be notified immediately and any payments will be refunded in full.",
        },
      ],
    },
    {
      category: "For Venue Owners",
      questions: [
        {
          q: "How do I list my venue?",
          a: "Create an owner account, then click 'Add Venue' in your dashboard. You'll be guided through adding details, photos, pricing, and availability.",
        },
        {
          q: "What fees does Sportsbnb charge?",
          a: "Nothing. There is no commission, no listing fee, no monthly cost and no minimum. You keep 100% of the price you set, and the player pays exactly that — we add nothing on top.",
        },
        {
          q: "How do I manage my availability?",
          a: "Use the schedule management tool in your owner dashboard to set available hours, block off times, and manage recurring availability.",
        },
        {
          q: "When do I get paid?",
          a: "Weekly, covering every completed booking from the previous week, to whichever you've given us — an Armenian bank account or your Idram wallet. Each payout is itemised so you can match it against individual bookings.",
        },
      ],
    },
    {
      category: "Account & Support",
      questions: [
        {
          q: "How do I reset my password?",
          a: "Click 'Forgot password' on the login page and enter your email. You'll receive a link to create a new password.",
        },
        {
          q: "How do I contact support?",
          a: "You can reach our support team via the Contact page or by emailing support@sportsbnb.org.",
        },
      ],
    },
  ];

  return (
    <Layout>
      <SEOHead
        title="FAQ — Frequently Asked Questions"
        description="Find answers to common questions about booking sports venues, managing teams, payments, and using Sportsbnb."
        canonical="/faq"
        jsonLd={createFAQJsonLd(
          faqs.flatMap(cat => cat.questions.map(q => ({ question: q.q, answer: q.a })))
        )}
      />
      <header className="border-b border-border bg-surface-1">
        <div className="container py-14 md:py-20">
          <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-foreground-soft">
            <span className="h-2 w-2 rounded-full bg-brand-tuff" aria-hidden="true" />
            Help center
          </div>
          <h1 className="max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Questions, answered without the runaround.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-soft">
            Booking, payments, games, owner tools, and account support in one place.
          </p>
        </div>
      </header>

      <section className="bg-background py-12 md:py-20">
        <div className="container grid gap-10 lg:grid-cols-[13rem_1fr] lg:gap-16">
          <nav aria-label="FAQ categories" className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">On this page</p>
            <ol className="mt-4 border-t border-border">
              {faqs.map((section, index) => {
                const id = section.category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return (
                  <li key={section.category} className="border-b border-border">
                    <a
                      href={`#${id}`}
                      className="flex min-h-11 items-center gap-3 rounded-sm text-sm font-medium text-foreground-soft transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="font-mono text-xs tabular-nums text-brand-tuff">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {section.category}
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="min-w-0 space-y-12">
            {faqs.map((section) => {
              const id = section.category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              return (
                <section key={section.category} id={id} aria-labelledby={`${id}-heading`}>
                  <h2 id={`${id}-heading`} className="text-2xl font-semibold text-foreground">
                    {section.category}
                  </h2>
                  <Accordion type="single" collapsible className="mt-4 w-full border-t border-border">
                    {section.questions.map((faq) => (
                      <AccordionItem key={faq.q} value={`${section.category}-${faq.q}`}>
                        <AccordionTrigger className="py-5 text-left text-base font-medium">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="max-w-3xl pb-5 text-[15px] leading-relaxed text-foreground-soft">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              );
            })}

            <aside className="border-l-2 border-brand-tuff bg-brand-tuff-soft px-6 py-7 md:px-8">
              <h2 className="text-xl font-semibold text-foreground">Still have a question?</h2>
              <p className="mt-2 text-foreground-soft">
                Send the team the details and we’ll help you find the right next step.
              </p>
              <Button asChild size="lg" className="mt-6">
                <Link to="/contact">Contact support</Link>
              </Button>
            </aside>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default FAQPage;
