import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Zap, Sparkles, ArrowUpRight, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/pricing";

interface VenueCardProps {
  id: string;
  name: string;
  image: string;
  location: string;
  sports: string[];
  price: number;
  rating: number;
  reviewCount: number;
  available: boolean;
  distance?: number | null;
  isPromoted?: boolean;
}

const VenueCard = ({
  id,
  name,
  image,
  location,
  sports,
  price,
  rating,
  reviewCount,
  distance,
  isPromoted,
}: VenueCardProps) => {
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
    <Link to={`/venue/${id}`} className="group block focus-ring rounded-2xl">
      <article
        className={`relative overflow-hidden rounded-2xl bg-card border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
          isPromoted ? "border-primary/40 ring-1 ring-primary/15" : "border-border hover:border-border-strong"
        }`}
      >
        {/* Image */}
        <div className="relative aspect-[5/4] overflow-hidden bg-surface-3">
          {imageFailed ? (
            /* Venue images are remote (owner uploads, Unsplash fallbacks). When
               one 404s or the network drops, the browser paints the alt text as
               raw prose over the card — the venue name twice, in the wrong
               place. A neutral placeholder degrades quietly instead. */
            <div className="flex h-full w-full items-center justify-center bg-surface-3">
              <ImageOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            </div>
          ) : (
            <img
              src={image}
              alt={name}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          )}
          {/* subtle gradient for label legibility */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />

          {/* Top-left: featured */}
          {isPromoted && (
            <Badge className="absolute top-3 left-3 bg-foreground text-background border-0 gap-1 font-medium">
              <Sparkles className="h-3 w-3" />
              Featured
            </Badge>
          )}

          {/* Top-right: instant booking pill */}
          <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-primary/95 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm">
            <Zap className="h-3 w-3" />
            Instant Book
          </span>

          {/* Distance pill */}
          {distance !== undefined && distance !== null && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-white">
              <MapPin className="h-3 w-3" />
              {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="font-display text-base md:text-lg font-semibold text-foreground tracking-extra-tight leading-snug line-clamp-1 group-hover:text-primary transition-colors">
              {name}
            </h3>
            <div className="flex items-center gap-1 text-sm shrink-0">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span className="font-semibold text-foreground">{rating || "—"}</span>
              {reviewCount > 0 && (
                <span className="text-muted-foreground text-xs">({reviewCount})</span>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{location}</p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {sports.slice(0, 3).map((sport) => (
              <span
                key={sport}
                className="inline-flex items-center rounded-md bg-surface-1 border border-border px-2 py-0.5 text-[11px] font-medium text-foreground-soft"
              >
                {sport}
              </span>
            ))}
            {sports.length > 3 && (
              <span className="inline-flex items-center rounded-md bg-surface-1 border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                +{sports.length - 3}
              </span>
            )}
          </div>

          <div className="flex items-end justify-between pt-3 border-t border-border">
            <div className="flex items-baseline gap-1">
              <span className="stat-numeral text-xl font-bold text-foreground">
                {formatPrice(price)}
              </span>
              <span className="text-xs text-muted-foreground">/ hour</span>
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
              View
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default VenueCard;
