import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MotionProps, Variants } from "framer-motion";
import SEOHead from "@/components/seo/SEOHead";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, Phone, Send, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { easeOutExpo } from "@/lib/motion";

/* ------------------------------------------------------------------
   Motion.

   Two jobs, and nothing else moves.

   The contact details and the form fields deal in, so the eye is led
   down the column it has to fill rather than handed the whole page at
   once. And the submit button reports on itself: idle → sending →
   sent, each label crossfading through the same button box, so the
   answer arrives where the click happened instead of only in a toast
   at the edge of the screen.

   Easing comes from lib/motion, which mirrors --ease-out-expo in
   index.css. Under `prefers-reduced-motion: reduce` the props are
   omitted entirely rather than given a zero duration: the fields mount
   in place and the button swaps its label without a crossfade, which
   still says everything the animation said.
   ------------------------------------------------------------------ */

/** Gap between one field's entrance and the next. */
const FIELD_STAGGER_STEP = 0.05;
/**
 * The index past which every remaining row shares the last delay.
 *
 * The form is six rows today, so the cap is nearly inert — it exists so
 * that a longer form later cannot make someone wait to see the field
 * they came to type in.
 */
const FIELD_STAGGER_CAP = 7;

const fieldVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: easeOutExpo,
      delay: Math.min(index, FIELD_STAGGER_CAP) * FIELD_STAGGER_STEP,
    },
  }),
};

/** How long the button holds its "Sent" state before offering itself again. */
const SENT_HOLD_MS = 2200;

type SubmitStatus = "idle" | "sending" | "sent";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  // Was a boolean. The third state is the one the button had no way to show:
  // a send that succeeded reverted straight to "Send message", so the only
  // confirmation was a toast in the corner, away from where the click was.
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const isSubmitting = status === "sending";
  const prefersReduced = useReducedMotion();

  // "Sent" is a report, not a resting state: the form is empty again and has
  // to be offerable. Cleaned up on unmount so a navigation mid-hold does not
  // set state on a gone component.
  useEffect(() => {
    if (status !== "sent") return;
    const timer = window.setTimeout(() => setStatus("idle"), SENT_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: formData,
      });

      if (error) throw error;

      toast.success("Message sent! We'll get back to you soon.");
      setFormData({ name: "", email: "", subject: "", message: "" });
      setStatus("sent");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
      setStatus("idle");
    }
  };

  const fieldMotion = (index: number): MotionProps =>
    prefersReduced
      ? {}
      : { variants: fieldVariants, initial: "hidden", animate: "visible", custom: index };

  // Feedback timing, not entrance timing: the button is answering an event, so
  // it moves at --dur-fast rather than at entrance speed.
  const labelMotion: MotionProps = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.18, ease: easeOutExpo },
      };

  const contactInfo = [
    {
      icon: Mail,
      label: "Email",
      value: "support@sportsbnb.org",
    },
    {
      icon: Phone,
      label: "Phone",
      value: "+374 77 189839",
    },
    {
      icon: MapPin,
      label: "Office",
      value: "Armenia, 0079, Yerevan, Nor Nork 5th Block, Artem Mikoyan St., 35 Building",
    },
  ];

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
      <div className="bg-background">
        <div className="container py-16 md:py-24">
          <motion.div {...fieldMotion(0)} className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Get in touch</h1>
            <p className="text-lg text-muted-foreground">
              Have a question or feedback? We'd love to hear from you.
              Send us a message and we'll respond as soon as possible.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {/* Contact Info */}
            <div className="lg:col-span-1 space-y-6">
              {contactInfo.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div key={item.label} {...fieldMotion(index + 1)} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                      <div className="font-medium text-foreground">{item.value}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <motion.div {...fieldMotion(1)} className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      autoComplete="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      required
                    />
                  </motion.div>
                  <motion.div {...fieldMotion(2)} className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@example.com"
                      required
                    />
                  </motion.div>
                </div>
                <motion.div {...fieldMotion(3)} className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="How can we help?"
                    required
                  />
                </motion.div>
                <motion.div {...fieldMotion(4)} className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us more..."
                    rows={6}
                    required
                  />
                </motion.div>
                <motion.div {...fieldMotion(5)}>
                  <Button type="submit" size="lg" disabled={isSubmitting}>
                    {/* `initial={false}` so the resting label is simply there on
                        first paint — the button is not part of the page's
                        entrance, it is a control waiting to be used. `mode="wait"`
                        so one label has left before the next arrives: two of them
                        dissolving through each other inside a button reads as a
                        glitch rather than a change of state. Only opacity and
                        transform move; the label swap itself is what it always
                        was. */}
                    <AnimatePresence initial={false} mode="wait">
                      {status === "sending" ? (
                        <motion.span key="sending" {...labelMotion} className="inline-flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                          Sending...
                        </motion.span>
                      ) : status === "sent" ? (
                        <motion.span key="sent" {...labelMotion} className="inline-flex items-center">
                          <Check className="h-4 w-4 mr-2" strokeWidth={2.5} aria-hidden="true" />
                          Sent
                        </motion.span>
                      ) : (
                        <motion.span key="idle" {...labelMotion} className="inline-flex items-center">
                          <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                          Send message
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ContactPage;
