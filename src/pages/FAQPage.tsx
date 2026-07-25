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
          a: "Visa, Mastercard and ArCa through Ameriabank, or directly from your Idram wallet. Payment is taken at the time of booking and handled entirely by the provider — your card details never reach SportsBnB.",
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
          a: "5% per booking, and nothing else — no listing fee, no monthly cost, no minimum. You keep 100% of the price you set; the 5% is added on top for the player, who sees the final figure before paying.",
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
          a: "You can reach our support team via the Contact page or by emailing support@sportsbnb.com. We typically respond within 24 hours.",
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
      <div className="bg-background">
        <div className="container py-16 md:py-24">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h1>
              <p className="text-lg text-muted-foreground">
                Find answers to common questions about using Sportsbnb.
              </p>
            </div>

            <div className="space-y-8">
              {faqs.map((section) => (
                <div key={section.category}>
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    {section.category}
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {section.questions.map((faq, index) => (
                      <AccordionItem key={index} value={`${section.category}-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>

            <div className="mt-12 p-8 bg-card rounded-xl border border-border text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Still have questions?
              </h3>
              <p className="text-muted-foreground mb-6">
                Can't find the answer you're looking for? Our team is here to help.
              </p>
              <Link to="/contact">
                <Button size="lg">Contact Support</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FAQPage;
