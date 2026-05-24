import { Helmet } from "react-helmet-async";

const SITE_URL = "https://sportsbnb.lovable.app";
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
export const createWebsiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Sportsbnb",
  "url": SITE_URL,
  "description": "Find and book sports venues, join open games, and connect with players in your area.",
  "applicationCategory": "SportsApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "500",
  },
});

export const createLocalBusinessJsonLd = (venue: {
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
  ...(venue.rating
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: venue.rating,
          reviewCount: venue.reviewCount || 0,
        },
      }
    : {}),
  "priceRange": `$${venue.pricePerHour}/hr`,
  "url": `${SITE_URL}/venue/${venue.name}`,
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
