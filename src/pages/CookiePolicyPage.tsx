import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/seo/SEOHead";

const cookieTypes = [
  {
    title: "Essential Cookies",
    description:
      "These cookies are necessary for the website to function properly. They enable core functionality such as security, account authentication, and session management.",
  },
  {
    title: "Performance Cookies",
    description:
      "These cookies help us understand how visitors interact with our website by collecting anonymous information about page visits and errors.",
  },
  {
    title: "Functional Cookies",
    description:
      "These cookies allow us to remember choices you make (such as language preference) and provide enhanced, personalized features.",
  },
  {
    title: "Marketing Cookies",
    description:
      "These cookies may be used to track visitors across websites to display relevant advertisements. We only use these with your consent.",
  },
];

const CookiePolicyPage = () => (
  <Layout>
    <SEOHead
      title="Cookie Policy"
      description="How Sportsbnb uses cookies and similar technologies to remember preferences, secure accounts, and improve your booking experience."
      canonical="/cookies"
    />

    <header className="border-b border-border bg-surface-1">
      <div className="container grid gap-6 py-12 md:py-16 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-12">
        <div>
          <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-foreground-soft">
            <span className="h-2 w-2 rounded-full bg-brand-tuff" aria-hidden="true" />
            Legal
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Cookie Policy
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Last updated: January 14, 2025</p>
      </div>
    </header>

    <article className="container grid gap-10 py-12 md:py-16 lg:grid-cols-[13rem_minmax(0,48rem)] lg:gap-16">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Cookie controls
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground-soft">
          What cookies do, the types we use, and how to manage them in your browser.
        </p>
      </aside>

      <div className="min-w-0 space-y-9 text-ui leading-7 text-foreground-soft">
        <section aria-labelledby="cookies-definition" className="border-t border-border pt-7 first:border-t-0 first:pt-0">
          <h2 id="cookies-definition" className="text-xl font-semibold text-foreground">1. What Are Cookies</h2>
          <p className="mt-3">
            Cookies are small text files stored on your device when you visit our website.
            They help us provide you with a better experience by remembering your preferences
            and understanding how you use our platform.
          </p>
        </section>

        <section aria-labelledby="cookies-types" className="border-t border-border pt-7">
          <h2 id="cookies-types" className="text-xl font-semibold text-foreground">2. Types of Cookies We Use</h2>
          <div className="mt-5 grid gap-0 border-y border-border sm:grid-cols-2">
            {cookieTypes.map((type) => (
              <section
                key={type.title}
                className="border-b border-border py-5 last:border-b-0 sm:min-h-44 sm:odd:border-r sm:odd:pr-8 sm:even:pl-8 sm:[&:nth-last-child(2)]:border-b-0"
              >
                <h3 className="font-semibold text-foreground">{type.title}</h3>
                <p className="mt-2 text-sm leading-6">{type.description}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="cookies-managing" className="border-t border-border pt-7">
          <h2 id="cookies-managing" className="text-xl font-semibold text-foreground">3. Managing Cookies</h2>
          <p className="mt-3">
            Most web browsers allow you to control cookies through their settings. You can:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand-tuff">
            <li>View what cookies are stored on your device</li>
            <li>Delete all or specific cookies</li>
            <li>Block cookies from being set</li>
            <li>Set preferences for certain websites</li>
          </ul>
          <p className="mt-3">Note that blocking essential cookies may affect the functionality of our website.</p>
        </section>

        <section aria-labelledby="cookies-third-party" className="border-t border-border pt-7">
          <h2 id="cookies-third-party" className="text-xl font-semibold text-foreground">4. Third-Party Cookies</h2>
          <p className="mt-3">
            Some cookies may be set by third-party services we use, such as payment processors
            and analytics providers. These third parties have their own privacy policies.
          </p>
        </section>

        <section aria-labelledby="cookies-updates" className="border-t border-border pt-7">
          <h2 id="cookies-updates" className="text-xl font-semibold text-foreground">5. Updates to This Policy</h2>
          <p className="mt-3">
            We may update this cookie policy from time to time. Any changes will be posted on
            this page with an updated revision date.
          </p>
        </section>

        <section aria-labelledby="cookies-contact" className="border-t border-border pt-7">
          <h2 id="cookies-contact" className="text-xl font-semibold text-foreground">6. Contact Us</h2>
          <p className="mt-3">
            If you have questions about our use of cookies, please contact us at{" "}
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

export default CookiePolicyPage;
