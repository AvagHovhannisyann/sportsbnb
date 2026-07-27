import { Helmet } from "react-helmet-async";

/**
 * The host production actually serves, with the www.
 *
 * This said `https://sportsbnb.org` and that is not where the site lives.
 * Measured against the live deployment:
 *
 *   https://sportsbnb.org/      302 → https://www.sportsbnb.org/
 *   https://www.sportsbnb.org/  200
 *
 * So every canonical this component emitted pointed at a URL that redirects,
 * and `public/sitemap.xml` — which uses www throughout — was submitting one
 * host while the pages it listed claimed another. A canonical pointing at a
 * redirect is not a canonical: the target wins, the declared URL is discarded,
 * and Search Console reports the mismatch instead of indexing the page. Every
 * `url` and `item` in the JSON-LD below is built from this constant too, so
 * all of it pointed at the redirecting host as well.
 *
 * One more thing needs doing outside this repository, and it is in
 * docs/handover.md: that redirect is a **302**, not a 301. A 302 is temporary
 * and tells search engines to keep the source URL indexed rather than
 * consolidate signals onto the target — the opposite of what host
 * canonicalisation is for. It is a Vercel domain setting, not a code change.
 */
const SITE_URL = "https://www.sportsbnb.org";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const SITE_NAME = "Sportsbnb";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SEOHead = ({
  title,
  description = "Find and book sports venues in Armenia and California. Join open games, create teams, and play with your community on Sportsbnb.",
  canonical,
  image = DEFAULT_IMAGE,
  type = "website",
  noIndex = false,
  jsonLd,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Book Sports Venues & Join Games Near You`;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

// Pre-built JSON-LD generators
/**
 * The home page's structured data.
 *
 * There was an `aggregateRating` here — `ratingValue: "4.8"`, `reviewCount:
 * "500"` — and both numbers were invented. No query produced them; they were
 * string literals on the marketplace's most visible page. Google's structured
 * data policy requires that a rating reflect genuine user reviews and be
 * visible on the page carrying the markup, and the stated remedy for markup
 * that does not is a manual action against the site. That is a real risk taken
 * for nothing: Google does not show a rating snippet for `WebApplication`
 * anyway, so the fabricated numbers bought no rich result and staked the
 * domain's standing on a claim that could not be substantiated.
 *
 * What replaces it is three things that are true. `WebSite` with a
 * `SearchAction` declares the site search — the query parameter is `q`, which
 * is what DiscoverPage actually reads — and is what a sitelinks searchbox is
 * built from. `Organization` says what Sportsbnb is, which is the entity an
 * answer engine needs in order to attribute anything to it. `WebApplication`
 * stays, minus the invented rating and with the free tier priced in the
 * currency this marketplace settles in.
 */
export const createWebsiteJsonLd = () => [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    "name": SITE_NAME,
    "url": `${SITE_URL}/`,
    "publisher": { "@id": `${SITE_URL}/#organization` },
    // `q` because that is the parameter DiscoverPage reads. `sport` and `city`
    // are also read but a SearchAction takes one query input, and free text is
    // the one a search box maps onto.
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SITE_URL}/venues?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    "name": SITE_NAME,
    "url": `${SITE_URL}/`,
    "logo": {
      "@type": "ImageObject",
      "url": `${SITE_URL}/favicon.png`,
    },
    "description":
      "Sportsbnb is a sports venue booking marketplace in Armenia. Players find and book courts, pitches and pools by the hour and pay in the app; venue owners list their facilities and manage bookings.",
    // Where the business operates. Stated because an answer engine asked
    // "where can I book a pitch in Yerevan" has no way to connect this site to
    // Armenia otherwise — nothing else in the served HTML says so.
    "areaServed": [
      { "@type": "Country", "name": "Armenia" },
      { "@type": "AdministrativeArea", "name": "Yerevan" },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": SITE_NAME,
    "url": `${SITE_URL}/`,
    "description":
      "Find and book sports venues, join open games, and connect with players near you.",
    "applicationCategory": "SportsApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "AMD",
    },
  },
];

/**
 * A venue, as a `SportsActivityLocation`.
 *
 * Two things here were wrong and both concerned the URL. The `url` property
 * was built as `${SITE_URL}/venue/${venue.name}` — the venue's *name*, not its
 * id — so for a venue called "Kentron Arena" it produced
 * `https://www.sportsbnb.org/venue/Kentron Arena`: a path with a space in it,
 * matching no route, resolving to the 404 page. Structured data whose `url`
 * does not resolve is structured data Google discards, and it contradicted the
 * page's own canonical, which VenueDetailsPage sets correctly to
 * `/venue/${id}`. The id is now required rather than derived.
 *
 * The price was `priceRange: "$8000/hr"`. Dollars, for a venue priced in dram
 * — the same 400x misstatement `src/lib/pricing.ts` documents at length — and
 * not a range either. It is now an `Offer` carrying an explicit `AMD` currency
 * and a `UnitPriceSpecification` with `unitCode: "HUR"`, which is the UN/CEFACT
 * code for an hour. That is machine-readable and unambiguous, which is exactly
 * what an answer engine asked "how much is a pitch in Yerevan" needs.
 *
 * `aggregateRating` stays and is honest: `venues.rating` and
 * `venues.review_count` are maintained by the `update_venue_rating` trigger
 * from the real `reviews` table, and the reviews are rendered on the same page,
 * which is what Google's policy requires. It is omitted when there are no
 * reviews rather than sent as zero.
 */
export const createLocalBusinessJsonLd = (venue: {
  id: string;
  name: string;
  address?: string | null;
  city: string;
  description?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  pricePerHour: number;
  sports: string[];
  image?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) => ({
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  "name": venue.name,
  "description": venue.description || `Book ${venue.sports.join(", ")} at ${venue.name} in ${venue.city}`,
  "address": {
    "@type": "PostalAddress",
    "streetAddress": venue.address || "",
    "addressLocality": venue.city,
  },
  ...(venue.latitude && venue.longitude
    ? {
        geo: {
          "@type": "GeoCoordinates",
          latitude: venue.latitude,
          longitude: venue.longitude,
        },
      }
    : {}),
  ...(venue.image ? { image: venue.image } : {}),
  // Both must be real for this to be sent at all. Google rejects an
  // aggregateRating whose reviewCount is 0, and a rating with no reviews
  // behind it is the fabrication this file just had removed from it.
  ...(venue.rating && venue.reviewCount
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: venue.rating,
          reviewCount: venue.reviewCount,
          bestRating: 5,
          worstRating: 1,
        },
      }
    : {}),
  "sport": venue.sports,
  "offers": {
    "@type": "Offer",
    "price": venue.pricePerHour,
    "priceCurrency": "AMD",
    "availability": "https://schema.org/InStock",
    "url": `${SITE_URL}/venue/${venue.id}`,
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": venue.pricePerHour,
      "priceCurrency": "AMD",
      // HUR is the UN/CEFACT common code for "hour". This venue is priced by
      // the hour and saying so in a code beats saying it in English.
      "unitCode": "HUR",
    },
  },
  "url": `${SITE_URL}/venue/${venue.id}`,
});

export const createBreadcrumbJsonLd = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "name": item.name,
    "item": `${SITE_URL}${item.url}`,
  })),
});

export const createFAQJsonLd = (faqs: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map((faq) => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer,
    },
  })),
});

export default SEOHead;
