import { matchPath, useLocation } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { ROUTE_TITLES } from "@/lib/routeTitles";

/**
 * Gives every route a title, without touching every page.
 *
 * Rendered immediately above `<Routes>`, so a page that renders its own
 * `SEOHead` still wins: react-helmet-async resolves competing tags in mount
 * order and the page mounts after this does. That ordering is the whole
 * design — this supplies a floor, not a ceiling, and the eighteen pages that
 * already build a title from real data (a venue's name, a blog post's) are
 * untouched by it.
 *
 * Routes with no entry in the table fall through to `SEOHead`'s own default,
 * which is the marketing string. That is correct for `/`, and for anything
 * else it means the table is missing a row — `scripts/page-titles.mjs` is what
 * notices.
 */
export const RouteMeta = () => {
  const { pathname } = useLocation();
  const match = ROUTE_TITLES.find((r) => matchPath({ path: r.path, end: true }, pathname));
  if (!match) return null;
  return <SEOHead title={match.title} noIndex={match.noIndex} canonical={match.noIndex ? undefined : pathname} />;
};

export default RouteMeta;
