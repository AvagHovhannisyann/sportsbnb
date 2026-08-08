import { useEffect, useState } from "react";
import { Check, Loader2, Mail, MapPin, Phone, Send } from "lucide-react";
import SEOHead from "@/components/seo/SEOHead";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SENT_HOLD_MS = 2200;

type SubmitStatus = "idle" | "sending" | "sent";

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "support@sportsbnb.org",
    href: "mailto:support@sportsbnb.org",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+374 77 189839",
    href: "tel:+37477189839",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "Armenia, 0079, Yerevan, Nor Nork 5th Block, Artem Mikoyan St., 35 Building",
  },
];

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const isSubmitting = status === "sending";

  useEffect(() => {
    if (status !== "sent") return;
    const timer = window.setTimeout(() => setStatus("idle"), SENT_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("sending");

    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: formData,
      });

      if (error) throw error;

      toast.success("Message sent! We'll get back to you soon.");
      setFormData({ name: "", email: "", subject: "", message: "" });
      setStatus("sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <Layout>
      <SEOHead
        title="Contact Us"
        description="Get in touch with the Sportsbnb team. We're here to help with venue bookings, listings, or any questions about our platform."
        canonical="/contact"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Sportsbnb",
          url: "https://www.sportsbnb.org/contact",
          email: "support@sportsbnb.org",
          telephone: "+374 77 189839",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Nor Nork 5th Block, Artem Mikoyan St., 35 Building",
            addressLocality: "Yerevan",
            postalCode: "0079",
            addressCountry: "AM",
          },
        }}
      />

      <header className="border-b border-border bg-surface-1">
        <div className="container py-14 md:py-20">
          <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-foreground-soft">
            <span className="h-2 w-2 rounded-full bg-brand-tuff" aria-hidden="true" />
            Contact
          </div>
          <h1 className="max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Tell us what you need help with.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-soft">
            Questions about a booking, a venue listing, or the platform itself are all welcome.
          </p>
        </div>
      </header>

      <section className="bg-background py-12 md:py-20">
        <div className="container grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 xl:gap-24">
          <aside aria-labelledby="contact-details-heading">
            <h2 id="contact-details-heading" className="text-xl font-semibold text-foreground">
              Contact details
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground-soft">
              Use the form for the clearest handoff, or contact the team directly.
            </p>
            <ul className="mt-8 border-t border-border">
              {contactInfo.map(({ icon: Icon, label, value, href }) => (
                <li key={label} className="flex gap-4 border-b border-border py-5">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                    {href ? (
                      <a
                        href={href}
                        className="mt-1 inline-flex min-h-11 items-center break-words rounded-sm font-medium text-foreground transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="mt-1 text-[15px] leading-relaxed text-foreground">{value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          <div className="border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0 xl:pl-16">
            <h2 className="text-2xl font-semibold text-foreground">Send a message</h2>
            <p className="mt-2 text-sm text-foreground-soft">All fields are required.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6" aria-busy={isSubmitting}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
                  placeholder="How can we help?"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                  placeholder="Tell us more..."
                  rows={7}
                  required
                />
              </div>
              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
                <span className="inline-flex items-center" aria-live="polite">
                  {status === "sending" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      Sending…
                    </>
                  ) : status === "sent" ? (
                    <>
                      <Check className="mr-2 h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                      Sent
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                      Send message
                    </>
                  )}
                </span>
              </Button>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ContactPage;
