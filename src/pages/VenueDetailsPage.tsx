import { useParams, Link, useSearchParams } from "react-router-dom";
import { formatTimeOfDay } from "@/lib/time";
import SEOHead, { createLocalBusinessJsonLd, createBreadcrumbJsonLd } from "@/components/seo/SEOHead";
import { useEffect, useState } from "react";
import { MapPin, Star, Wifi, Car, Droplets, CheckCircle, ArrowLeft } from "lucide-react";
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
        <div className="container py-4 sm:py-6" role="status" aria-label="Loading venue">
          <Skeleton className="mb-5 h-5 w-32 bg-surface-2" />
          <div className="mb-5 space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full bg-surface-2" />
              <Skeleton className="h-6 w-24 rounded-full bg-surface-2" />
            </div>
            <Skeleton className="h-10 w-3/5 bg-surface-3" />
            <Skeleton className="h-5 w-2/5 bg-surface-2" />
          </div>
          {/* Matches VenueGallery exactly: 4/3 stacked below md, a flat 384px
              hero at md and up. It can only match because the gallery is now
              one height for every venue — while that depended on the photo
              count (384px solo, 504px with thumbnails) no placeholder could be
              right, and this one was 69px out. */}
          <Skeleton className="aspect-[4/3] w-full rounded-xl bg-surface-3 md:aspect-auto md:h-96" />
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
            <div className="space-y-4">
              <Skeleton className="mt-8 h-4 w-full bg-surface-2" />
              <Skeleton className="h-4 w-11/12 bg-surface-2" />
              <Skeleton className="h-4 w-4/5 bg-surface-2" />
            </div>
            <Skeleton className="h-[22rem] w-full rounded-xl bg-surface-2" />
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

  const amenityIcons: Record<string, React.ReactNode> = {
    Parking: <Car className="h-5 w-5" aria-hidden="true" />,
    Showers: <Droplets className="h-5 w-5" aria-hidden="true" />,
    Lockers: <CheckCircle className="h-5 w-5" aria-hidden="true" />,
    Wifi: <Wifi className="h-5 w-5" aria-hidden="true" />,
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
      <div className="min-h-screen bg-background">
        {/* Back Navigation */}
        <div className="container py-2 sm:py-3">
          <Link
            to="/venues"
            className="inline-flex min-h-11 items-center rounded-lg pr-3 text-sm font-medium text-muted-foreground outline-none transition-colors duration-150 motion-reduce:transition-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to venues
          </Link>
        </div>

        <div className="container pb-5 sm:pb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {venue.sports.map((sport) => (
              <Badge key={sport} variant="secondary">{sport}</Badge>
            ))}
            {venue.is_indoor && <Badge variant="outline">Indoor</Badge>}
          </div>
          <h1 className="page-title max-w-4xl">{venue.name}</h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{location}</span>
            </span>
            {reviews.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                <span className="font-semibold text-foreground">
                  {(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)}
                </span>
                <span>({reviews.length} {reviews.length === 1 ? "review" : "reviews"})</span>
              </span>
            )}
          </div>
        </div>

        <div className="container pb-8">
          <VenueGallery
            images={venueImages}
            venueName={venue.name}
            mainImage={venueImage}
          />
        </div>

        <div className="container pb-28 lg:pb-16">
          {/* min-w-0 on both columns, not decoration. A grid item defaults to
              `min-width: auto`, which resolves to its min-content — so at
              375px the booking column's intrinsic width sized the single
              column track to 938px and the whole page scrolled sideways.
              Neither column has anything that must not shrink; the date strip
              inside the panel already carries `overflow-x-auto` and simply
              never got the chance to use it. */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
            {/* Main Content */}
            <div className="min-w-0">
              {/* Description */}
              {venue.description && (
                <section className="border-b border-border pb-8">
                  <h2 className="section-title">About this venue</h2>
                  <p className="max-w-[70ch] leading-7 text-foreground-soft">{venue.description}</p>
                </section>
              )}

              {/* Operating Hours */}
              {venueHours.length > 0 && (
                <section className="border-b border-border py-8 first:pt-0">
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
                              "flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm",
                              isToday
                                ? "border-primary/25 bg-primary-soft"
                                : "border-border bg-surface-1",
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
                                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
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
                <section className="border-b border-border py-8 first:pt-0">
                  <h2 className="section-title">Amenities</h2>
                  <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
                    {venue.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex min-h-11 items-center gap-3 text-foreground-soft"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                          {amenityIcons[amenity] || <CheckCircle className="h-5 w-5" aria-hidden="true" />}
                        </span>
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Reviews Section */}
              <section className="py-8 first:pt-0">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-foreground">
                    Reviews ({reviews.length})
                  </h2>
                  {user && !userReview && (
                    <Button
                      variant="outline"
                      className="h-11"
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
                  <div className="space-y-4 py-2" role="status" aria-label="Loading reviews">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={index} className="space-y-2 border-b border-border pb-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ))}
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
                  currency={venue.currency}
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
        <div className="fixed inset-x-0 bottom-14 z-40 border-t border-border bg-card/95 shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-card/90 md:bottom-0 lg:hidden">
          <div className="container flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate">
                <Price
                  amount={venue.price_per_hour}
                  currency={venue.currency}
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
            <Button asChild size="lg" className="h-12 shrink-0 px-6">
              <a href="#booking">Reserve</a>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VenueDetailsPage;
