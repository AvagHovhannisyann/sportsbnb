import { useParams, Link } from "react-router-dom";
import SEOHead, { createLocalBusinessJsonLd, createBreadcrumbJsonLd } from "@/components/seo/SEOHead";
import { useState } from "react";
import { MapPin, Star, Clock, Wifi, Car, Droplets, CheckCircle, ArrowLeft, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import BookingHandoffDialog from "@/components/booking/BookingHandoffDialog";
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
import { timeSlots } from "@/data/constants";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { getCustomerPrice, formatPrice } from "@/lib/pricing";

const VenueDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  
  const { data: venue, isLoading: venueLoading } = useVenueById(id);
  const { data: reviews = [], isLoading: reviewsLoading } = useVenueReviews(id);
  const { data: venueImages = [] } = useVenueImages(id);
  const { data: userReview } = useUserReviewForVenue(id, user?.id);
  const { data: venueHours = [] } = useVenueHours(id);
  const { data: blockedDates = [] } = useBlockedDates(id);
  const deleteReview = useDeleteReview();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  if (venueLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </Layout>
    );
  }

  if (!venue) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Venue not found</h1>
          <Link to="/venues">
            <Button>Back to Venues</Button>
          </Link>
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

  // Generate next 5 days for date selection
  const dates = Array.from({ length: 5 }, (_, i) => {
    const date = addDays(new Date(), i);
    const dayOfWeek = date.getDay();
    const venueHour = venueHours.find(h => h.day_of_week === dayOfWeek);
    const dateStr = format(date, "yyyy-MM-dd");
    const isBlocked = blockedDates.some(b => b.blocked_date === dateStr);
    const isClosed = venueHour?.is_closed || isBlocked;
    
    return {
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(date, "EEE, MMM d"),
      value: dateStr,
      disabled: isClosed,
      dayOfWeek,
    };
  });

  // Get available time slots based on venue hours
  const getAvailableSlots = () => {
    if (!selectedDate) return [];
    const selectedDateObj = dates.find(d => d.value === selectedDate);
    if (!selectedDateObj) return [];
    
    const venueHour = venueHours.find(h => h.day_of_week === selectedDateObj.dayOfWeek);
    if (!venueHour || venueHour.is_closed) return timeSlots.slice(6, 14); // Default hours if not set
    
    // Filter time slots based on venue hours
    return timeSlots.filter(slot => {
      const slotTime = slot.replace(" AM", "").replace(" PM", "");
      const [slotHour] = slotTime.split(":");
      let hour = parseInt(slotHour);
      if (slot.includes("PM") && hour !== 12) hour += 12;
      if (slot.includes("AM") && hour === 12) hour = 0;
      
      const openHour = parseInt(venueHour.open_time.split(":")[0]);
      const closeHour = parseInt(venueHour.close_time.split(":")[0]);
      
      return hour >= openHour && hour < closeHour;
    });
  };

  const availableSlots = getAvailableSlots();

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

              {/* Availability */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Availability</h2>
                
                {/* Date Selection */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-3">Select date</h3>
                  <div className="flex flex-wrap gap-2">
                    {dates.map((date) => (
                      <Button
                        key={date.value}
                        variant={selectedDate === date.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedDate(date.value);
                          setSelectedTime(null);
                        }}
                        disabled={date.disabled}
                      >
                        {date.label}
                        {date.disabled && " (Closed)"}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">Select time</h3>
                    {availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot}
                            variant={selectedTime === slot ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTime(slot)}
                            className="text-sm"
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No available slots for this date</p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

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
              <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-foreground">{formatPrice(getCustomerPrice(venue.price_per_hour))}</span>
                  <span className="text-muted-foreground">/ hour</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">
                  Indicative price — final price is confirmed by the venue owner.
                </p>

                {selectedDate && selectedTime ? (
                  <div className="space-y-2 mb-6 p-3 rounded-lg bg-muted/50 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Preferred date</span>
                      <span className="font-medium text-foreground">
                        {dates.find((d) => d.value === selectedDate)?.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Preferred time</span>
                      <span className="font-medium text-foreground">{selectedTime}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-6">
                    Optionally pick a preferred date and time below — or just message the owner directly.
                  </p>
                )}

                <Button
                  className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2"
                  size="lg"
                  onClick={() => setIsBookingOpen(true)}
                >
                  <MessageCircle className="h-5 w-5" />
                  Book via WhatsApp
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-3">
                  Booking is confirmed directly with the venue owner.
                </p>

                {/* Message Owner Button */}
                <div className="mt-4 pt-4 border-t">
                  <VenueChatButton
                    venueId={venue.id}
                    venueName={venue.name}
                    ownerId={venue.owner_id}
                  />
                </div>

                <BookingHandoffDialog
                  isOpen={isBookingOpen}
                  onClose={() => setIsBookingOpen(false)}
                  venue={{
                    id: venue.id,
                    name: venue.name,
                    location,
                    phone: venue.phone ?? null,
                    contactName: venue.contact_name ?? null,
                    whatsappEnabled: venue.whatsapp_enabled ?? true,
                    smsEnabled: venue.sms_enabled ?? true,
                  }}
                  preselected={{
                    date: selectedDate,
                    dateLabel: dates.find((d) => d.value === selectedDate)?.label ?? null,
                    time: selectedTime,
                  }}
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
      </div>
    </Layout>
  );
};

export default VenueDetailsPage;
