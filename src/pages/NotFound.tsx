import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <Layout>
      <SEOHead title="Page not found" noIndex />
      <section className="border-b border-border bg-background">
        <div className="container grid min-h-[62vh] items-center gap-10 py-16 md:grid-cols-[1fr_auto] md:gap-16 md:py-24">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-sm font-semibold text-foreground-soft">
              <span className="font-mono tabular-nums text-brand-tuff">404</span>
              <span className="h-px w-10 bg-border" aria-hidden="true" />
              Page not found
            </div>
            <h1 className="mt-6 text-balance font-display text-4xl font-semibold leading-[1.03] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              This route no longer leads to a page.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground-soft">
              The link may be out of date, or the page may have moved. Browse the venue catalogue or return to the homepage to keep going.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/venues">Browse venues</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          </div>

          <div className="hidden border-l-2 border-brand-tuff pl-8 md:block" aria-hidden="true">
            <Compass className="h-16 w-16 text-primary" strokeWidth={1.25} />
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
