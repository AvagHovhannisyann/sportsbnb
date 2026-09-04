import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ImageOff, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";

interface VenueCardProps {
  id: string;
  name: string;
  image: string;
  location: string;
  sports: string[];
  price: number;
  /** The listing's settlement currency — a Glendale card reads "$" in Yerevan too. */
  currency?: string | null;
  rating: number;
  reviewCount: number;
  available: boolean;
  distance?: number | null;
  isPromoted?: boolean;
  /** Card heading level depends on whether the grid sits directly under a page title or inside a named section. */
  headingLevel?: "h2" | "h3";
}

const VenueCard = ({
  id,
  name,
  image,
  location,
  sports,
  price,
  currency,
  rating,
  reviewCount,
  distance,
  isPromoted,
  headingLevel = "h2",
}: VenueCardProps) => {
  const Heading = headingLevel;
  // Seeded from the prop, not just from onError. venues.image_url is
  // nullable, and an empty string renders <img src=""> — which resolves to the
  // page itself and never fires onError, so a venue listed without a photo got
  // a black void where the earlier 404 fallback should have been.
  const hasImage = typeof image === "string" && image.trim().length > 0;
  const [imageFailed, setImageFailed] = useState(!hasImage);

  // Cards are keyed by venue id today, so React remounts rather than reuses
  // them — but resetting on the prop keeps that from being load-bearing.
  useEffect(() => {
    setImageFailed(!hasImage);
  }, [hasImage, image]);

  return (
    // The name is spelled out because the card's text sits inside an
    // <article>, and `article` does not allow name-from-content — so Chrome
    // computes this link's accessible name as empty, and a screen reader
    // reads the whole venues list as "link, link, link". Verified against
    // Chrome's own computed name rather than assumed.
    <Link
      to={`/venue/${id}`}
      aria-label={`${name}, ${location}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <article
        className={`relative flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none ${
          isPromoted
            ? "border-primary/35 shadow-xs"
            : "border-border group-hover:border-border-strong group-hover:shadow-xs"
        }`}
      >
        {/* Image */}
        <div className="relative aspect-[3/2] overflow-hidden bg-surface-3">
          {imageFailed ? (
            /* Venue images are remote (owner uploads, Unsplash fallbacks). When
               one 404s or the network drops, the browser paints the alt text as
               raw prose over the card — the venue name twice, in the wrong
               place. A neutral placeholder degrades quietly instead. */
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-1 text-muted-foreground">
              <ImageOff className="h-7 w-7" aria-hidden="true" />
              <span className="text-xs font-medium">Photo unavailable</span>
            </div>
          ) : (
            <img
              src={image}
              alt={`Sports venue at ${name}`}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition-opacity duration-150 motion-reduce:transition-none group-hover:opacity-95"
            />
          )}

          {isPromoted && (
            <Badge className="absolute left-3 top-3 border-white/80 bg-white/95 text-primary shadow-xs">
              Featured
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-1.5 flex items-start justify-between gap-3">
            <Heading className="line-clamp-1 font-display text-lg font-semibold leading-snug tracking-extra-tight text-foreground transition-colors duration-150 motion-reduce:transition-none group-hover:text-primary">
              {name}
            </Heading>
            <div className="flex shrink-0 items-center gap-1 text-sm">
              {/* Formatted rather than printed raw. Every current caller passes
                  a NUMERIC(2,1) from the database, so this changes nothing
                  today — but a computed average, as the venue-details header
                  derives, renders as 4.199999999999999 and squeezes the venue
                  name into an ellipsis. The em-dash keeps unrated venues from
                  showing a zero score. */}
              {rating ? (
                <>
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                  <span className="font-semibold text-foreground">{Number(rating).toFixed(1)}</span>
                  {reviewCount > 0 && (
                    <span className="text-xs text-muted-foreground">({reviewCount})</span>
                  )}
                </>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">New</span>
              )}
            </div>
          </div>

          <p className="mb-3 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{location}</span>
            {distance !== undefined && distance !== null && (
              <span className="shrink-0 font-medium text-foreground-soft">
                {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
              </span>
            )}
          </p>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {sports.slice(0, 2).map((sport) => (
              <span
                key={sport}
                className="inline-flex min-h-6 items-center rounded-full border border-border bg-surface-1 px-2.5 text-xs font-medium text-foreground-soft"
              >
                {sport}
              </span>
            ))}
            {sports.length > 2 && (
              <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-surface-1 px-2.5 text-xs font-medium text-muted-foreground">
                +{sports.length - 2}
              </span>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between border-t border-border pt-3">
            {/* The dram sign is not in JetBrains Mono, so setting the whole
                string in `.stat-numeral` dropped a proportional Armenian glyph
                into a monospaced run — measured, it collided with the first
                digit. <Price> keeps the figures tabular and puts the mark in
                the sans stack it was drawn for. */}
            <Price
              amount={price}
              currency={currency}
              suffix="/ hour"
              className="text-xl font-bold text-foreground"
            />
            <span className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary">
              View venue
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default VenueCard;
