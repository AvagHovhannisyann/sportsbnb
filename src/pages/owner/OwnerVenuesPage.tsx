import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, MapPin, Star, Settings, Calendar, MoreHorizontal, Edit, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OwnerLayout } from "@/components/owner/OwnerLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues, getVenueImage } from "@/hooks/useVenues";
import { Building2 } from "lucide-react";

const OwnerVenuesPage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isProfileLoading } = useAuth();
  const { data: myVenues = [], isLoading: venuesLoading } = useOwnerVenues(user?.id);

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

  if (authLoading || venuesLoading) {
    return (
      <OwnerLayout title="My Venues">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OwnerLayout>
    );
  }

  const activeVenues = myVenues.filter((v) => v.is_active);
  const draftVenues = myVenues.filter((v) => !v.is_active);

  return (
    <OwnerLayout title="My Venues" subtitle="Manage your venue listings and settings">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-muted-foreground">
          {myVenues.length} venue{myVenues.length !== 1 ? "s" : ""} total
        </div>
        <Button onClick={() => navigate("/add-venue")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Venue
        </Button>
      </div>

      {myVenues.length === 0 ? (
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
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Active Venues ({activeVenues.length})
              </h3>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeVenues.map((venue) => (
                  <Card key={venue.id} className="card-lift group overflow-hidden">
                    <div className="aspect-video relative">
                      <img
                        src={getVenueImage(venue)}
                        alt={venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {/* Was bg-emerald-500 with white text: 2.54:1, and it
                          sits over a photo where there is no help from the
                          surface. The app already has an audited solid-fill
                          pair that means exactly this, and using it makes the
                          badge match the confirmed tone elsewhere. */}
                      <Badge className="absolute top-3 left-3 border-0 bg-primary text-primary-foreground">
                        Active
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 bg-white/90 hover:bg-white text-foreground"
                            aria-label={`Actions for ${venue.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/venue/${venue.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Listing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/venue/${venue.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Venue
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/venue/${venue.id}/availability`)}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Manage Schedule
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/owner/settings?venue=${venue.id}`)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-foreground mb-1 truncate">{venue.name}</h4>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{venue.address || venue.city}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-medium">{venue.rating || "—"}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            ({venue.review_count || 0} reviews)
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold text-foreground">֏{venue.price_per_hour.toLocaleString()}</span>
                          <span className="text-muted-foreground">/hr</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Draft Venues */}
          {draftVenues.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                Draft Venues ({draftVenues.length})
              </h3>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {draftVenues.map((venue) => (
                  <Card key={venue.id} className="overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
                    <div className="aspect-video relative">
                      <img
                        src={getVenueImage(venue)}
                        alt={venue.name}
                        className="w-full h-full object-cover grayscale"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <Badge variant="secondary" className="absolute top-3 left-3">
                        Draft
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-foreground mb-1 truncate">{venue.name}</h4>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{venue.address || venue.city}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Complete your setup to publish this venue
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(`/venue/${venue.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Complete Setup
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </OwnerLayout>
  );
};

export default OwnerVenuesPage;
