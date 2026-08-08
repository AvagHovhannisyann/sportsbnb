import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Calendar, Edit, Eye, MapPin, MoreHorizontal, Plus, Settings, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues, getVenueImage } from "@/hooks/useVenues";

const OwnerVenuesPage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isProfileLoading } = useAuth();
  const {
    data: myVenues = [],
    isLoading: venuesLoading,
    isError: venuesError,
    isFetching: venuesFetching,
    refetch: refetchVenues,
  } = useOwnerVenues(user?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
    // isProfileLoading, not just authLoading: authLoading covers the
    // session only, so without it this reads user_type off a null profile
    // and bounces the owner. RequireRole already guards this route; keeping
    // the check correct here means it stays safe if that ever changes.
    if (!authLoading && !isProfileLoading && user && profile?.user_type !== "owner") {
      navigate("/dashboard");
    }
  }, [user, profile, authLoading, isProfileLoading, navigate]);

  if (authLoading) {
    return (
      <OwnerLayout title="My Venues">
        <div className="space-y-4" role="status" aria-label="Loading your venues">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <Skeleton className="aspect-[16/9] w-full rounded-none" />
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="mt-2 h-4 w-44" />
                  <Skeleton className="mt-5 h-5 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </OwnerLayout>
    );
  }

  const activeVenues = myVenues.filter((v) => v.is_active);
  const draftVenues = myVenues.filter((v) => !v.is_active);

  return (
    <OwnerLayout title="My Venues" subtitle="Manage listing status, pricing, and availability.">
      {/* Header Actions */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {venuesError
            ? "Venue count unavailable"
            : venuesLoading
              ? "Loading venue count…"
              : `${myVenues.length} venue${myVenues.length !== 1 ? "s" : ""} total`}
        </p>
        <Button className="w-full sm:w-auto" onClick={() => navigate("/add-venue")}>
          <Plus aria-hidden="true" />
          Add venue
        </Button>
      </div>

      {/* An owner whose venues failed to load must not be told they have none.
          "No venues yet" is a claim about their business, and its call to
          action invites them to re-create a listing that already exists —
          the same argument TeamsPage makes in a comment on its own error
          branch. Measured with the content tables serving 500. */}
      {venuesError ? (
        <Card>
          <ErrorPanel
            what="your venues"
            description="We couldn't retrieve your listings. Nothing was changed, and you can try again safely."
            onRetry={() => refetchVenues()}
            isRetrying={venuesFetching}
          />
        </Card>
      ) : venuesLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading your venue listings">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <Skeleton className="aspect-[16/9] w-full rounded-none" />
              <CardContent className="p-4">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-2 h-4 w-44" />
                <Skeleton className="mt-5 h-5 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : myVenues.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No venues yet"
            description="Create your first venue listing to start accepting bookings from players."
            actionLabel="Add Your First Venue"
            actionHref="/add-venue"
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Active Venues */}
          {activeVenues.length > 0 && (
            <section aria-labelledby="active-venues-heading">
              <h2 id="active-venues-heading" className="mb-4 flex items-center gap-2 font-display text-lg font-semibold tracking-extra-tight text-foreground">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
                Active venues <span className="font-normal text-muted-foreground">({activeVenues.length})</span>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeVenues.map((venue) => (
                  <Card key={venue.id} className="overflow-hidden">
                    <div className="relative aspect-[16/9] bg-surface-1">
                      <img
                        src={getVenueImage(venue)}
                        alt={venue.name} loading="lazy" decoding="async"
                        className="h-full w-full object-cover"
                      />
                      {/* Was bg-emerald-500 with white text: 2.54:1, and it
                          sits over a photo where there is no help from the
                          surface. The app already has an audited solid-fill
                          pair that means exactly this, and using it makes the
                          badge match the confirmed tone elsewhere. */}
                      <Badge className="absolute left-3 top-3 border-0 bg-primary text-primary-foreground shadow-sm">
                        Active
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          {/* `variant="secondary"`, not `bg-white/90 …
                              text-foreground`. Half of that pair was a literal
                              and half was a token: `bg-white` means white in
                              either theme, while `--foreground` is the theme's
                              ink — near-white here. The result was a white pill
                              with a near-white glyph on it, measured at 1.12:1
                              against the 3:1 WCAG 1.4.11 asks of an icon that
                              is the whole control. It is the only way into a
                              venue's actions, and on a photo card it was
                              invisible.

                              `secondary` is the same light-pill-on-a-photo look
                              as a matched token pair, which `contrast-audit`
                              already measures, and is what the equivalent
                              button on MyVenuesPage has always used. */}
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-2 top-2 shadow-sm"
                            aria-label={`Actions for ${venue.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/venue/${venue.id}`)}>
                            <Eye aria-hidden="true" className="mr-2 h-4 w-4" />
                            View listing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/venue/${venue.id}/edit`)}>
                            <Edit aria-hidden="true" className="mr-2 h-4 w-4" />
                            Edit venue
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/venue/${venue.id}/availability`)}>
                            <Calendar aria-hidden="true" className="mr-2 h-4 w-4" />
                            Manage schedule
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/owner/settings?venue=${venue.id}`)}>
                            <Settings aria-hidden="true" className="mr-2 h-4 w-4" />
                            Settings
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="truncate font-display text-lg font-semibold tracking-extra-tight text-foreground">{venue.name}</h3>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
                        <span className="truncate">{venue.address || venue.city}</span>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star aria-hidden="true" className="h-4 w-4 fill-warning text-warning" />
                            <span className="text-sm font-medium">{venue.rating || "—"}</span>
                          </div>
                          <span className="truncate text-xs text-muted-foreground">
                            ({venue.review_count || 0} reviews)
                          </span>
                        </div>
                        <span className="inline-flex shrink-0 items-baseline gap-0.5 whitespace-nowrap text-sm">
                          <span className="text-foreground-soft" aria-hidden="true">֏</span>
                          <span className="stat-numeral font-semibold" aria-hidden="true">{venue.price_per_hour.toLocaleString()}</span>
                          <span className="sr-only">֏{venue.price_per_hour.toLocaleString()} per hour</span>
                          <span className="text-xs text-muted-foreground" aria-hidden="true">/hr</span>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Draft Venues */}
          {draftVenues.length > 0 && (
            <section aria-labelledby="draft-venues-heading">
              <h2 id="draft-venues-heading" className="mb-4 flex items-center gap-2 font-display text-lg font-semibold tracking-extra-tight text-foreground">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-muted-foreground" />
                Draft venues <span className="font-normal text-muted-foreground">({draftVenues.length})</span>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {draftVenues.map((venue) => (
                  <Card key={venue.id} className="overflow-hidden bg-surface-2">
                    <div className="relative aspect-[16/9] bg-surface-1">
                      <img
                        src={getVenueImage(venue)}
                        alt={venue.name} loading="lazy" decoding="async"
                        className="h-full w-full object-cover"
                      />
                      <Badge variant="secondary" className="absolute left-3 top-3 bg-card shadow-sm">
                        Draft
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="truncate font-display text-lg font-semibold tracking-extra-tight text-foreground">{venue.name}</h3>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
                        <span className="truncate">{venue.address || venue.city}</span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        Complete your setup to publish this venue
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4 w-full"
                        onClick={() => navigate(`/venue/${venue.id}/edit`)}
                      >
                        <Edit aria-hidden="true" />
                        Complete setup
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerVenuesPage;
