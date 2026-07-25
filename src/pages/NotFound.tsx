import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Compass } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { StatusPanel } from "@/components/common/StatusPanel";

/**
 * Landed on by anyone following a stale link — an expired venue URL, an old
 * share, a typo. Previously the generated default: no Layout, so it stranded
 * people with a single "Return to Home" link and no nav to escape through;
 * `bg-muted` rather than `bg-background`, so it did not even match the app it
 * belonged to; and a raw <a href="/"> that forced a full document reload
 * inside a single-page app.
 */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      {/* A 404 must never be indexed — otherwise stale links keep their
          ranking and keep sending people here. */}
      <SEOHead title="Page not found" noIndex />
      <div className="container flex min-h-[60vh] items-center justify-center py-16">
        <StatusPanel
          icon={Compass}
          title="We can't find that page"
          description="The link may be out of date, or the page may have moved. The nav above will get you anywhere in the app."
        >
          <Button asChild>
            <Link to="/venues">Browse venues</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Back to home</Link>
          </Button>
        </StatusPanel>
      </div>
    </Layout>
  );
};

export default NotFound;
