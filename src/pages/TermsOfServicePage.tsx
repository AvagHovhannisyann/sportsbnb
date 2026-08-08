import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/seo/SEOHead";

const TermsOfServicePage = () => (
  <Layout>
    <SEOHead
      title="Terms of Service"
      description="The terms and conditions governing your use of Sportsbnb — bookings, payments, cancellations, and the rights and responsibilities of users and venue owners."
      canonical="/terms"
    />

    <header className="border-b border-border bg-surface-1">
      <div className="container grid gap-6 py-12 md:py-16 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-12">
        <div>
          <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-foreground-soft">
            <span className="h-2 w-2 rounded-full bg-brand-tuff" aria-hidden="true" />
            Legal
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Terms of Service
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Last updated: January 14, 2025</p>
      </div>
    </header>

    <article className="container grid gap-10 py-12 md:py-16 lg:grid-cols-[13rem_minmax(0,48rem)] lg:gap-16">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Agreement overview
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground-soft">
          The conditions for using Sportsbnb as a player, account holder, or venue owner.
        </p>
      </aside>

      <div className="min-w-0 space-y-9 text-[15px] leading-7 text-foreground-soft">
        <section aria-labelledby="terms-acceptance" className="border-t border-border pt-7 first:border-t-0 first:pt-0">
          <h2 id="terms-acceptance" className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p className="mt-3">
            By accessing or using Sportsbnb, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our platform.
          </p>
        </section>

        <section aria-labelledby="terms-service" className="border-t border-border pt-7">
          <h2 id="terms-service" className="text-xl font-semibold text-foreground">2. Description of Service</h2>
          <p className="mt-3">
            Sportsbnb provides an online platform that connects sports facility owners with individuals
            seeking to book venues for sports activities. We facilitate bookings but are not responsible
            for the actual venues or services provided by venue owners.
          </p>
        </section>

        <section aria-labelledby="terms-accounts" className="border-t border-border pt-7">
          <h2 id="terms-accounts" className="text-xl font-semibold text-foreground">3. User Accounts</h2>
          <p className="mt-3">To use certain features, you must create an account. You agree to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand-tuff">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
        </section>

        <section aria-labelledby="terms-bookings" className="border-t border-border pt-7">
          <h2 id="terms-bookings" className="text-xl font-semibold text-foreground">4. Bookings and Payments</h2>
          <p className="mt-3">
            All bookings are subject to availability and confirmation. Payment is required at the time
            of booking. Cancellation policies vary by venue and are displayed during the booking process.
          </p>
        </section>

        <section aria-labelledby="terms-conduct" className="border-t border-border pt-7">
          <h2 id="terms-conduct" className="text-xl font-semibold text-foreground">5. User Conduct</h2>
          <p className="mt-3">You agree not to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand-tuff">
            <li>Use the platform for any unlawful purpose</li>
            <li>Submit false or misleading information</li>
            <li>Interfere with the platform's operation</li>
            <li>Harass other users or venue owners</li>
            <li>Attempt to gain unauthorized access to our systems</li>
          </ul>
        </section>

        <section aria-labelledby="terms-owner" className="border-t border-border pt-7">
          <h2 id="terms-owner" className="text-xl font-semibold text-foreground">6. Venue Owner Responsibilities</h2>
          <p className="mt-3">
            Venue owners are responsible for ensuring their listings are accurate, their facilities
            meet safety standards, and they honor confirmed bookings.
          </p>
        </section>

        <section aria-labelledby="terms-liability" className="border-t border-border pt-7">
          <h2 id="terms-liability" className="text-xl font-semibold text-foreground">7. Limitation of Liability</h2>
          <p className="mt-3">
            Sportsbnb is not liable for any damages arising from your use of the platform,
            including injuries at venues, booking disputes, or service interruptions.
          </p>
        </section>

        <section aria-labelledby="terms-changes" className="border-t border-border pt-7">
          <h2 id="terms-changes" className="text-xl font-semibold text-foreground">8. Changes to Terms</h2>
          <p className="mt-3">
            We may modify these terms at any time. Continued use of the platform after changes
            constitutes acceptance of the new terms.
          </p>
        </section>

        <section aria-labelledby="terms-contact" className="border-t border-border pt-7">
          <h2 id="terms-contact" className="text-xl font-semibold text-foreground">9. Contact</h2>
          <p className="mt-3">
            For questions about these terms, contact us at{" "}
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

export default TermsOfServicePage;
