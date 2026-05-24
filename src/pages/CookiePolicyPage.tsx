import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/seo/SEOHead";
const CookiePolicyPage = () => {
  return <Layout>
      <SEOHead
        title="Cookie Policy"
        description="How Sportsbnb uses cookies and similar technologies to remember preferences, secure accounts, and improve your booking experience."
        canonical="/cookies"
      />
      <div className="container py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Cookie Policy</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">Last updated: January 14, 2025</p>
            
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">1. What Are Cookies</h2>
              <p className="text-muted-foreground">
                Cookies are small text files stored on your device when you visit our website. 
                They help us provide you with a better experience by remembering your preferences 
                and understanding how you use our platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">2. Types of Cookies We Use</h2>
              
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-foreground">Essential Cookies</h3>
                <p className="text-muted-foreground">
                  These cookies are necessary for the website to function properly. They enable core 
                  functionality such as security, account authentication, and session management.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium text-foreground">Performance Cookies</h3>
                <p className="text-muted-foreground">
                  These cookies help us understand how visitors interact with our website by collecting 
                  anonymous information about page visits and errors.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium text-foreground">Functional Cookies</h3>
                <p className="text-muted-foreground">
                  These cookies allow us to remember choices you make (such as language preference) 
                  and provide enhanced, personalized features.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium text-foreground">Marketing Cookies</h3>
                <p className="text-muted-foreground">
                  These cookies may be used to track visitors across websites to display relevant 
                  advertisements. We only use these with your consent.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">3. Managing Cookies</h2>
              <p className="text-muted-foreground">
                Most web browsers allow you to control cookies through their settings. You can:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>View what cookies are stored on your device</li>
                <li>Delete all or specific cookies</li>
                <li>Block cookies from being set</li>
                <li>Set preferences for certain websites</li>
              </ul>
              <p className="text-muted-foreground">
                Note that blocking essential cookies may affect the functionality of our website.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">4. Third-Party Cookies</h2>
              <p className="text-muted-foreground">
                Some cookies may be set by third-party services we use, such as payment processors 
                and analytics providers. These third parties have their own privacy policies.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">5. Updates to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this cookie policy from time to time. Any changes will be posted on 
                this page with an updated revision date.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">6. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about our use of cookies, please contact us at{" "}
                <a className="text-primary hover:underline" href="mailto:support@sportsbnb.org">support@sportsbnb.org</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>;
};
export default CookiePolicyPage;