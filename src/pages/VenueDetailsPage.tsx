import { useParams, Link } from "react-router-dom";
import SEOHead, { createLocalBusinessJsonLd, createBreadcrumbJsonLd } from "@/components/seo/SEOHead";
import { useState } from "react";
import { MapPin, Star, Clock, Wifi, Car, Droplets, CheckCircle, ArrowLeft, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPanel, ErrorPanel } from "@/components/common/StatusPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
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

const VenueDetailsPage = () => {
  const { id } = useParams();
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

  if (venueLoading) {
    return (
      <Layout>
        {/* Skeleton in the page's own shape rather than a centred spinner, so
            the gallery, heading and booking panel land where they were
            already reserved. */}
        <div className="container py-6" role="status" aria-label="Loading venue">
          <Skeleton className="aspect-[21/9] w-full rounded-xl bg-surface-3 md:aspect-[3/1]" />
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
        <div className="container pb-8">
          <VenueGallery
            images={venueImages}
            venueName={venue.name}
            mainImage={venueImage}
          />
        </div>

        <div className="container pb-16">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
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
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-medium text-foreground">{venue.rating}</span>
                    <span>({venue.review_count} reviews)</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              {venue.description && (
                <>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">About this venue</h2>
                    <p className="text-muted-foreground leading-relaxed">{venue.description}</p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Operating Hours */}
              {venueHours.length > 0 && (
                <>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Operating Hours</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {DAYS_OF_WEEK.map((day, index) => {
                        const hour = venueHours.find(h => h.day_of_week === index);
                        return (
                          <div key={day} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{day}</span>
                            <span className="font-medium text-foreground">
                              {hour?.is_closed ? "Closed" : hour ? `${hour.open_time} - ${hour.close_time}` : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Amenities */}
              {venue.amenities.length > 0 && (
                <>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Amenities</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {venue.amenities.map((amenity) => (
                        <div
                          key={amenity}
                          className="flex items-center gap-3 text-muted-foreground"
                        >
                          {amenityIcons[amenity] || <CheckCircle className="h-5 w-5" />}
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}


              {/* Reviews Section */}
              <div>
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
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                  </div>
                ) : (
                  <ReviewList
                    reviews={reviews}
                    currentUserId={user?.id}
                    onDelete={handleDeleteReview}
                  />
                )}
              </div>
            </div>

            {/* Booking Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <BookingPanel venueId={venue.id} pricePerHour={venue.price_per_hour} />

                <div className="rounded-2xl border bg-card p-4">
                  <VenueChatButton
                    venueId={venue.id}
                    venueName={venue.name}
                    ownerId={venue.owner_id}
                  />
                </div>
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
      </div>
    </Layout>
  );
};

export default VenueDetailsPage;
