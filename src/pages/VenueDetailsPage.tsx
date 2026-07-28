import { useParams, Link, useSearchParams } from "react-router-dom";
import { formatTimeOfDay } from "@/lib/time";
import SEOHead, { createLocalBusinessJsonLd, createBreadcrumbJsonLd } from "@/components/seo/SEOHead";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { MotionProps, Variants } from "framer-motion";
import { easeOutExpo } from "@/lib/motion";
import { MapPin, Star, Wifi, Car, Droplets, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPanel, ErrorPanel } from "@/components/common/StatusPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import { Price } from "@/components/ui/price";
import BookingPanel from "@/features/booking/BookingPanel";
import ReviewForm from "@/components/reviews/ReviewForm";
import ReviewList from "@/components/reviews/ReviewList";
import WeatherWidget from "@/components/venue/WeatherWidget";
import { VenueChatButton } from "@/components/venue/VenueChatButton";
import VenueGallery from "@/components/venue/VenueGallery";
import { useVenueImages } from "@/hooks/useVenueImages";
import { useAuth } from "@/hooks/useAuth";
import { useVenueById, getVenueImage } from "@/hooks/useVenues";
import { useVenueReviews, useUserReviewForVenue, useDeleteReview } from "@/hooks/useReviews";
import { useVenueHours, useBlockedDates, DAYS_OF_WEEK } from "@/hooks/useAvailability";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Motion.

   Three things move on this page and nothing else: the gallery arrives,
   the amenities deal in as they come into view, and the mobile booking
   bar rises into place. The heading, the opening hours and the reviews
   stay still — they are what someone opened this page to read, and
   staging them only puts a delay between the click and the answer.

   Durations and easing come from lib/motion, which mirrors the --dur-*
   and --ease-out-expo custom properties in index.css, so this page's
   framer-motion side and VenueGallery's CSS side agree on what "fast"
   means.

   Under `prefers-reduced-motion: reduce` the animation props are not
   passed at all rather than being given a zero duration: the final
   state renders outright, so nothing here depends on a frame that never
   runs. That is the convention HomePage and DiscoverPage established.
   ------------------------------------------------------------------ */

/**
 * The gallery's entrance — the only thing above the fold that moves.
 *
 * It is deliberately the whole gallery rather than each tile: the tiles
 * are one photograph cropped four ways, and dealing them out separately
 * turns a single object into four, which is the opposite of what the
 * hero is for.
 */
const galleryVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOutExpo } },
};

/** Gap between one amenity's entrance and the next. */
const AMENITY_STAGGER_STEP = 0.05;
/**
 * The index past which every remaining amenity shares the last delay.
 *
 * `venues.amenities` is an owner-supplied array and nothing in the venue
 * form caps its length, so the run has to be bounded here instead.
 * Capped at six it costs 300ms whether a venue lists four amenities or
 * forty, and the tail arrives together — which is what someone who has
 * already scrolled past them wants anyway.
 */
const AMENITY_STAGGER_CAP = 6;

/** The grid only carries the variant label down to its children. */
const amenityListVariants: Variants = { hidden: {}, visible: {} };

const amenityVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: easeOutExpo,
      delay: Math.min(index, AMENITY_STAGGER_CAP) * AMENITY_STAGGER_STEP,
    },
  }),
};

/**
 * Amenities sit below the description and the hours, so on every screen
 * narrower than a desktop they are off-screen at load. Playing the
 * stagger on mount would spend it where nobody is looking; this waits
 * until the section is actually approaching. `as const` keeps `margin`
 * a literal, which is what framer's MarginType wants.
 */
const amenityViewport = { once: true, margin: "-64px" } as const;

/**
 * The mobile booking bar's reveal.
 *
 * `y: "100%"` is the bar's own height rather than a fixed distance, so
 * it starts exactly clear of its resting position however the price
 * line wraps. It is a transform on a fixed element, so nothing behind it
 * reflows, and at its start position the bar is behind the mobile nav
 * (z-50 against this bar's z-40) and the viewport edge.
 *
 * The short delay lets the page settle first. A persistent piece of
 * chrome that appears in the same frame as everything else reads as
 * part of the layout arriving late; arriving just after, moving, it
 * reads as an offer being made.
 */
const bookingBarVariants: Variants = {
  hidden: { opacity: 0, y: "100%" },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOutExpo, delay: 0.12 },
  },
};

const VenueDetailsPage = () => {
  const { id } = useParams();
  // `?date=` and `?time=`, which the embeddable widget's Book Now button has
  // always written and nothing has ever read. See BookingPanel's props.
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const {
    data: venue,
    isLoading: venueLoading,
    isError: venueError,
    refetch: refetchVenue,
    isFetching: venueFetching,
  } = useVenueById(id);
  const { data: reviews = [], isLoading: reviewsLoading } = useVenueReviews(id);
  const { data: venueImages = [] } = useVenueImages(id);
  const { data: userReview } = useUserReviewForVenue(id, user?.id);
  const { data: venueHours = [] } = useVenueHours(id);
  const { data: blockedDates = [] } = useBlockedDates(id);
  const deleteReview = useDeleteReview();

  const [showReviewForm, setShowReviewForm] = useState(false);

  // Above the early returns, with the other hooks — the loading, error and
  // not-found branches all return before the render below.
  const prefersReduced = useReducedMotion();

  // Declares the sticky mobile booking bar to the rest of the app, so the
  // floating AI launcher lifts clear of the Reserve button. See index.css.
  useEffect(() => {
    document.body.classList.add("has-mobile-action-bar");
    return () => document.body.classList.remove("has-mobile-action-bar");
  }, []);

  if (venueLoading) {
    return (
      <Layout>
        {/* Skeleton in the page's own shape rather than a centred spinner, so
            the gallery, heading and booking panel land where they were
            already reserved. */}
        <div className="container py-6" role="status" aria-label="Loading venue">
          {/* Matches VenueGallery exactly: 4/3 stacked below md, a flat 384px
              hero at md and up. It can only match because the gallery is now
              one height for every venue — while that depended on the photo
              count (384px solo, 504px with thumbnails) no placeholder could be
              right, and this one was 69px out. */}
          <Skeleton className="aspect-[4/3] w-full rounded-xl bg-surface-3 md:aspect-auto md:h-96" />
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Skeleton className="h-6 w-40 bg-surface-2" />
              <Skeleton className="h-10 w-3/5 bg-surface-3" />
              <Skeleton className="h-5 w-2/5 bg-surface-2" />
              <Skeleton className="mt-8 h-4 w-full bg-surface-2" />
              <Skeleton className="h-4 w-11/12 bg-surface-2" />
              <Skeleton className="h-4 w-4/5 bg-surface-2" />
            </div>
            <Skeleton className="h-[22rem] w-full rounded-2xl bg-surface-2" />
          </div>
        </div>
      </Layout>
    );
  }

  // A failed request and a genuinely missing venue are not the same thing.
  // useVenueById rethrows on error and returns null only for a real 404, but
  // both landed in `!venue` — so a dropped connection told people the venue
  // did not exist, which is both false and unrecoverable (no retry, and the
  // suggested action is to leave the page).
  if (venueError) {
    return (
      <Layout>
        <div className="container py-12">
          <ErrorPanel
            what="this venue"
            description="The connection dropped on the way to our servers. The venue is probably fine — this is on us."
            onRetry={() => refetchVenue()}
            isRetrying={venueFetching}
          >
            <Button variant="outline" asChild>
              <Link to="/venues">Back to venues</Link>
            </Button>
          </ErrorPanel>
        </div>
      </Layout>
    );
  }

  if (!venue) {
    return (
      <Layout>
        <div className="container py-12">
          <StatusPanel
            icon={MapPin}
            title="Venue not found"
            description="This listing may have been removed by its owner, or the link is out of date."
          >
            <Button asChild>
              <Link to="/venues">Browse all venues</Link>
            </Button>
          </StatusPanel>
        </div>
      </Layout>
    );
  }

  // ── Motion props (see the block above the component) ──
  const galleryMotion: MotionProps = prefersReduced
    ? {}
    : { variants: galleryVariants, initial: "hidden", animate: "visible" };

  const amenityListMotion: MotionProps = prefersReduced
    ? {}
    : {
        variants: amenityListVariants,
        initial: "hidden",
        whileInView: "visible",
        viewport: amenityViewport,
      };

  const amenityMotion = (index: number): MotionProps =>
    prefersReduced ? {} : { variants: amenityVariants, custom: index };

  const bookingBarMotion: MotionProps = prefersReduced
    ? {}
    : { variants: bookingBarVariants, initial: "hidden", animate: "visible" };

  const amenityIcons: Record<string, React.ReactNode> = {
    Parking: <Car className="h-5 w-5" />,
    Showers: <Droplets className="h-5 w-5" />,
    Lockers: <CheckCircle className="h-5 w-5" />,
    Wifi: <Wifi className="h-5 w-5" />,
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!id) return;
    try {
      await deleteReview.mutateAsync({ reviewId, venueId: id });
      toast.success("Review deleted");
    } catch (error) {
      toast.error("Failed to delete review");
    }
  };

  const venueImage = getVenueImage(venue);
  const location = venue.address || venue.city;

  return (
    <Layout>
      <SEOHead
        title={`${venue.name} — Book ${venue.sports.join(", ")} in ${venue.city}`}
        description={venue.description || `Book ${venue.sports.join(", ")} at ${venue.name}, ${venue.city}. Check real-time availability, read reviews, and reserve your court instantly on Sportsbnb.`}
        canonical={`/venue/${id}`}
        jsonLd={[
          createLocalBusinessJsonLd({
            // The id, not the name. The generator used to build its `url` from
            // the name and produce a path with spaces in it.
            id: id!,
            name: venue.name,
            address: venue.address,
            city: venue.city,
            description: venue.description,
            rating: venue.rating,
            reviewCount: venue.review_count,
            pricePerHour: venue.price_per_hour,
            sports: venue.sports,
            image: venue.image_url,
            latitude: venue.latitude,
            longitude: venue.longitude,
          }),
          createBreadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Venues", url: "/venues" },
            { name: venue.name, url: `/venue/${id}` },
          ]),
        ]}
      />
      <div className="bg-background min-h-screen">
        {/* Back Navigation */}
        <div className="container py-4">
          <Link
            to="/venues"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to venues
          </Link>
        </div>

        {/* Image Gallery */}
        <motion.div className="container pb-8" {...galleryMotion}>
          <VenueGallery
            images={venueImages}
            venueName={venue.name}
            mainImage={venueImage}
          />
        </motion.div>

        <div className="container pb-28 lg:pb-16">
          {/* min-w-0 on both columns, not decoration. A grid item defaults to
              `min-width: auto`, which resolves to its min-content — so at
              375px the booking column's intrinsic width sized the single
              column track to 938px and the whole page scrolled sideways.
              Neither column has anything that must not shrink; the date strip
              inside the panel already carries `overflow-x-auto` and simply
              never got the chance to use it. */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="min-w-0 lg:col-span-2 space-y-8">
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {venue.sports.map((sport) => (
                    <Badge key={sport} variant="secondary">
                      {sport}
                    </Badge>
                  ))}
                  {venue.is_indoor && (
                    <Badge variant="outline">Indoor</Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-3">{venue.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{location}</span>
                  </div>
                  {/* Derived from the reviews actually rendered on this page
                      rather than from venues.rating / venues.review_count.
                      Correcting an earlier comment: those columns *are*
                      maintained, by the update_venue_rating trigger. Deriving
                      here is still preferable — it cannot drift from the list
                      directly beneath it, and it needs no second source of
                      truth — but it is a consistency choice, not a fix for a
                      broken column. With no reviews there is no rating to
                      state. */}
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="font-medium text-foreground">
                        {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                      </span>
                      <span>
                        ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {venue.description && (
                <section className="panel">
                  <h2 className="section-title">About this venue</h2>
                  <p className="text-muted-foreground leading-relaxed">{venue.description}</p>
                </section>
              )}

              {/* Operating Hours */}
              {venueHours.length > 0 && (
                <section className="panel">
                  <h2 className="section-title">Operating Hours</h2>
                    {/* Each day sits on its own tinted row. As a bare
                        `justify-between` inside a three-column grid, every
                        time was pushed hard right against the *next* day's
                        label, so the block read as "08:00 - 23:00 Monday"
                        across the columns instead of down them. Two columns
                        with a bound background pairs the label to its value.
                        Today is marked, since that is the question anyone
                        reading opening hours is actually asking. */}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {DAYS_OF_WEEK.map((day, index) => {
                        const hour = venueHours.find(h => h.day_of_week === index);
                        const isToday = index === new Date().getDay();
                        const closed = hour?.is_closed ?? !hour;
                        return (
                          <div
                            key={day}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm",
                              isToday
                                ? "bg-primary/10 ring-1 ring-primary/25"
                                : "bg-surface-1",
                            )}
                          >
                            <span
                              className={cn(
                                "flex items-center gap-2",
                                isToday ? "font-medium text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {day}
                              {isToday && (
                                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                  Today
                                </span>
                              )}
                            </span>
                            <span
                              className={cn(
                                "stat-numeral font-medium tabular-nums",
                                closed ? "text-muted-foreground" : "text-foreground",
                              )}
                            >
                              {hour?.is_closed
                                ? "Closed"
                                : hour
                                  ? // Raw SQL `time` values: this printed
                                    // "08:00:00 – 23:00:00" on the page a
                                    // booking decision is made on, while every
                                    // other time in the app goes through this
                                    // helper. Seconds are never part of an
                                    // opening hour.
                                    `${formatTimeOfDay(hour.open_time)} – ${formatTimeOfDay(hour.close_time)}`
                                  : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                </section>
              )}

              {/* Amenities */}
              {venue.amenities.length > 0 && (
                <section className="panel">
                  <h2 className="section-title">Amenities</h2>
                  <motion.div
                    className="grid grid-cols-2 md:grid-cols-3 gap-4"
                    {...amenityListMotion}
                  >
                    {venue.amenities.map((amenity, index) => (
                      <motion.div
                        key={amenity}
                        className="flex items-center gap-3 text-muted-foreground"
                        {...amenityMotion(index)}
                      >
                        {amenityIcons[amenity] || <CheckCircle className="h-5 w-5" />}
                        <span>{amenity}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </section>
              )}

              {/* Reviews Section */}
              <section className="panel">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    Reviews ({reviews.length})
                  </h2>
                  {user && !userReview && (
                    <Button
                      variant="outline"
                      onClick={() => setShowReviewForm(!showReviewForm)}
                    >
                      Write a Review
                    </Button>
                  )}
                </div>

                {showReviewForm && user && !userReview && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="text-lg">Write Your Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReviewForm
                        venueId={venue.id}
                        userId={user.id}
                        onSuccess={() => setShowReviewForm(false)}
                      />
                    </CardContent>
                  </Card>
                )}

                {userReview && (
                  <Card className="mb-6 border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg">Your Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReviewForm
                        venueId={venue.id}
                        userId={user!.id}
                        existingReview={userReview}
                      />
                    </CardContent>
                  </Card>
                )}

                {reviewsLoading ? (
                  <div className="text-center py-8" role="status" aria-label="Loading the venue">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                  </div>
                ) : (
                  <ReviewList
                    reviews={reviews}
                    currentUserId={user?.id}
                    onDelete={handleDeleteReview}
                  />
                )}
              </section>
            </div>

            {/* Booking Card */}
            <div id="booking" className="min-w-0 scroll-mt-24 lg:col-span-1">
              {/* Above the AI launcher (z-50). The launcher is fixed to the
                  bottom-right and overlapped the Reserve button by 7px at
                  1440 and 27px at 1024 — and being fixed with a higher stack
                  order, it took the clicks. A floating helper must not
                  intercept the primary booking control. */}
              <div className="sticky top-24 z-[60] space-y-4">
                <BookingPanel
                  venueId={venue.id}
                  pricePerHour={venue.price_per_hour}
                  blockedDates={blockedDates}
                  initialDate={searchParams.get("date")}
                  initialTime={searchParams.get("time")}
                />

                <VenueChatButton
                  venueId={venue.id}
                  venueName={venue.name}
                  ownerId={venue.owner_id}
                />
              </div>

              {/* Weather Widget */}
              {venue.latitude && venue.longitude && (
                <WeatherWidget
                  latitude={venue.latitude}
                  longitude={venue.longitude}
                  isIndoor={venue.is_indoor ?? false}
                />
              )}
            </div>
          </div>
        </div>

        {/* Mobile booking bar.
            On a phone the booking panel is the last thing on the page — below
            the description, the opening hours, the amenities and every review.
            Measured on a 375px screen it started 1,190px down a 3,342px page,
            so the price and the only Reserve button on the venue's own listing
            were four screens below the fold. This keeps both in reach without
            reordering the content, which is what every marketplace does on
            mobile for the same reason.

            bottom-14 clears the fixed mobile nav (h-14, md:hidden); at md the
            nav is gone so the bar sits on the edge, and at lg the sticky
            sidebar takes over and this disappears entirely. */}
        <motion.div
          className="fixed inset-x-0 bottom-14 z-40 border-t border-border bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/85 md:bottom-0 lg:hidden"
          {...bookingBarMotion}
        >
          <div className="container flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="truncate">
                <Price
                  amount={venue.price_per_hour}
                  suffix="/ hour"
                  className="text-lg font-bold text-foreground"
                  suffixClassName="text-sm text-muted-foreground"
                />
              </p>
              {/* Deliberately not a cancellation promise. Terms vary per
                  venue and the panel below computes the real one from
                  venue_policies — inventing "free cancellation" here would be
                  the same fabricated refund guarantee that comment warns
                  about, just in a place with less room to qualify it. */}
              <p className="truncate text-xs text-muted-foreground">
                Secure in-app payment
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <a href="#booking">Reserve</a>
            </Button>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default VenueDetailsPage;
