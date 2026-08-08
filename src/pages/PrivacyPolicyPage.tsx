import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/seo/SEOHead";

const PrivacyPolicyPage = () => (
  <Layout>
    <SEOHead
      title="Privacy Policy"
      description="How Sportsbnb collects, uses, and protects your personal data when you book venues, join games, or list a facility on our platform."
      canonical="/privacy"
    />

    <header className="border-b border-border bg-surface-1">
      <div className="container grid gap-6 py-12 md:py-16 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-12">
        <div>
          <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-foreground-soft">
            <span className="h-2 w-2 rounded-full bg-brand-tuff" aria-hidden="true" />
            Legal
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Privacy Policy
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Last updated: January 14, 2025</p>
      </div>
    </header>

    <article className="container grid gap-10 py-12 md:py-16 lg:grid-cols-[13rem_minmax(0,48rem)] lg:gap-16">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          In this policy
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground-soft">
          What we collect, why we use it, who receives it, and the choices available to you.
        </p>
      </aside>

      <div className="min-w-0 space-y-9 text-ui leading-7 text-foreground-soft">
        <section aria-labelledby="privacy-introduction" className="border-t border-border pt-7 first:border-t-0 first:pt-0">
          <h2 id="privacy-introduction" className="text-xl font-semibold text-foreground">1. Introduction</h2>
          <p className="mt-3">
            Welcome to Sportsbnb. We respect your privacy and are committed to protecting your personal data.
            This privacy policy explains how we collect, use, and safeguard your information when you use our platform.
          </p>
        </section>

        <section aria-labelledby="privacy-collection" className="border-t border-border pt-7">
          <h2 id="privacy-collection" className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
          <p className="mt-3">We collect information you provide directly to us, including:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand-tuff">
            <li>Name, email address, and phone number</li>
            <li>Account credentials</li>
            <li>Payment information</li>
            <li>Booking history and preferences</li>
            <li>Communications with us</li>
          </ul>
        </section>

        <section aria-labelledby="privacy-use" className="border-t border-border pt-7">
          <h2 id="privacy-use" className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
          <p className="mt-3">We use the information we collect to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand-tuff">
            <li>Process bookings and payments</li>
            <li>Send booking confirmations and updates</li>
            <li>Provide customer support</li>
            <li>Improve our services</li>
            <li>Send promotional communications (with your consent)</li>
          </ul>
        </section>

        <section aria-labelledby="privacy-sharing" className="border-t border-border pt-7">
          <h2 id="privacy-sharing" className="text-xl font-semibold text-foreground">4. Information Sharing</h2>
          <p className="mt-3">
            We do not sell your personal information. We may share your information with venue owners
            to facilitate bookings, payment processors, and service providers who assist in our operations.
          </p>
        </section>

        <section aria-labelledby="privacy-security" className="border-t border-border pt-7">
          <h2 id="privacy-security" className="text-xl font-semibold text-foreground">5. Data Security</h2>
          <p className="mt-3">
            We implement appropriate security measures to protect your personal information against
            unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section aria-labelledby="privacy-rights" className="border-t border-border pt-7">
          <h2 id="privacy-rights" className="text-xl font-semibold text-foreground">6. Your Rights</h2>
          <p className="mt-3">You have the right to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand-tuff">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of marketing communications</li>
          </ul>
        </section>

        <section aria-labelledby="privacy-contact" className="border-t border-border pt-7">
          <h2 id="privacy-contact" className="text-xl font-semibold text-foreground">7. Contact Us</h2>
          <p className="mt-3">
            If you have questions about this privacy policy, please contact us at{" "}
            <a
              className="inline-flex min-h-11 items-center rounded-sm font-medium text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="mailto:support@sportsbnb.org"
            >
              support@sportsbnb.org
            </a>
          </p>
        </section>
      </div>
    </article>
  </Layout>
);

export default PrivacyPolicyPage;
