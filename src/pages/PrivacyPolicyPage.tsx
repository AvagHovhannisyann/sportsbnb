import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/seo/SEOHead";
const PrivacyPolicyPage = () => {
  return <Layout>
      <SEOHead
        title="Privacy Policy"
        description="How Sportsbnb collects, uses, and protects your personal data when you book venues, join games, or list a facility on our platform."
        canonical="/privacy"
      />
      <div className="container py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">Last updated: January 14, 2025</p>
            
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
              <p className="text-muted-foreground">
                Welcome to Sportsbnb. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we collect, use, and safeguard your information when you use our platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
              <p className="text-muted-foreground">We collect information you provide directly to us, including:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Name, email address, and phone number</li>
                <li>Account credentials</li>
                <li>Payment information</li>
                <li>Booking history and preferences</li>
                <li>Communications with us</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
              <p className="text-muted-foreground">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Process bookings and payments</li>
                <li>Send booking confirmations and updates</li>
                <li>Provide customer support</li>
                <li>Improve our services</li>
                <li>Send promotional communications (with your consent)</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">4. Information Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell your personal information. We may share your information with venue owners 
                to facilitate bookings, payment processors, and service providers who assist in our operations.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate security measures to protect your personal information against 
                unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
              <p className="text-muted-foreground">You have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">7. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this privacy policy, please contact us at{" "}
                <a className="text-primary hover:underline" href="mailto:support@sportsbnb.org">
                  support@sportsbnb.org
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>;
};
export default PrivacyPolicyPage;
