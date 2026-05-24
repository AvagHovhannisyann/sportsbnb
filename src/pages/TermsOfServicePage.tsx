import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/seo/SEOHead";
const TermsOfServicePage = () => {
  return <Layout>
      <SEOHead
        title="Terms of Service"
        description="The terms and conditions governing your use of Sportsbnb — bookings, payments, cancellations, and the rights and responsibilities of users and venue owners."
        canonical="/terms"
      />
      <div className="container py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">Last updated: January 14, 2025</p>
            
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using Sportsbnb, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
              <p className="text-muted-foreground">
                Sportsbnb provides an online platform that connects sports facility owners with individuals 
                seeking to book venues for sports activities. We facilitate bookings but are not responsible 
                for the actual venues or services provided by venue owners.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
              <p className="text-muted-foreground">To use certain features, you must create an account. You agree to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">4. Bookings and Payments</h2>
              <p className="text-muted-foreground">
                All bookings are subject to availability and confirmation. Payment is required at the time 
                of booking. Cancellation policies vary by venue and are displayed during the booking process.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">5. User Conduct</h2>
              <p className="text-muted-foreground">You agree not to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Use the platform for any unlawful purpose</li>
                <li>Submit false or misleading information</li>
                <li>Interfere with the platform's operation</li>
                <li>Harass other users or venue owners</li>
                <li>Attempt to gain unauthorized access to our systems</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">6. Venue Owner Responsibilities</h2>
              <p className="text-muted-foreground">
                Venue owners are responsible for ensuring their listings are accurate, their facilities 
                meet safety standards, and they honor confirmed bookings.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">7. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                Sportsbnb is not liable for any damages arising from your use of the platform, 
                including injuries at venues, booking disputes, or service interruptions.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">8. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may modify these terms at any time. Continued use of the platform after changes 
                constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">9. Contact</h2>
              <p className="text-muted-foreground">
                For questions about these terms, contact us at{" "}
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
export default TermsOfServicePage;