import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, MapPin, Loader2, Edit, Calendar, MoreHorizontal, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Layout from "@/components/layout/Layout";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues, getVenueImage } from "@/hooks/useVenues";

const MyVenuesPage = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const {
    data: myVenues = [],
    isLoading: venuesLoading,
    isError: venuesError,
    refetch: refetchVenues,
    isFetching: venuesFetching,
  } = useOwnerVenues(user?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || venuesLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </Layout>
    );
  }

  const activeVenues = myVenues.filter(v => v.is_active);
  const inactiveVenues = myVenues.filter(v => !v.is_active);

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="page-title">My Venues</h1>
              <p className="text-muted-foreground">
                Manage all your listed venues in one place.
              </p>
            </div>
            <Link to="/add-venue">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Venue
              </Button>
            </Link>
          </div>

          {/* Venues List */}
          {/* Never tell an owner they have no venues on the strength of a
              request that failed — they may have several, and the empty state
              invites them to list a duplicate. */}
          {venuesError ? (
            <Card>
              <ErrorPanel
                what="your venues"
                description="We couldn't reach our servers. Your listings are unaffected."
                onRetry={() => refetchVenues()}
                isRetrying={venuesFetching}
              />
            </Card>
          ) : myVenues.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No venues yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start earning by listing your first sports venue.
                </p>
                <Link to="/add-venue">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Venue
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Active Venues */}
              {activeVenues.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    Active Venues ({activeVenues.length})
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeVenues.map((venue) => (
                      <Card key={venue.id} className="overflow-hidden">
                        <div className="aspect-[16/9] relative">
                          <img
                            src={getVenueImage(venue)}
                            alt={venue.name}
                            className="w-full h-full object-cover"
                          />
                          <Badge className="absolute top-3 left-3 bg-green-500">
                            Active
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="absolute top-3 right-3 h-8 w-8"
                                aria-label={`Actions for ${venue.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/venue/${venue.id}`} className="flex items-center gap-2">
                                  <Eye className="h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/venue/${venue.id}/edit`} className="flex items-center gap-2">
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/venue/${venue.id}/availability`} className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  Manage Schedule
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-foreground mb-1">{venue.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{venue.address || venue.city}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm">
                              <span className="font-medium text-foreground">
                                ֏{venue.price_per_hour.toLocaleString()}
                              </span>
                              <span className="text-muted-foreground">/hr</span>
                            </div>
                            <div className="flex gap-2">
                              {/* Was a Link wrapping a Button — invalid
                                  nesting, and neither carried a name. */}
                              <Button asChild variant="outline" size="sm">
                                <Link
                                  to={`/venue/${venue.id}/availability`}
                                  aria-label={`Schedule for ${venue.name}`}
                                >
                                  <Calendar className="h-4 w-4" aria-hidden="true" />
                                </Link>
                              </Button>
                              <Link to={`/venue/${venue.id}/edit`}>
                                <Button variant="outline" size="sm">
                                  Edit
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Inactive/Draft Venues */}
              {inactiveVenues.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    Draft/Inactive Venues ({inactiveVenues.length})
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inactiveVenues.map((venue) => (
                      <Card key={venue.id} className="overflow-hidden opacity-75">
                        <div className="aspect-[16/9] relative">
                          <img
                            src={getVenueImage(venue)}
                            alt={venue.name}
                            className="w-full h-full object-cover"
                          />
                          <Badge variant="secondary" className="absolute top-3 left-3">
                            Draft
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="absolute top-3 right-3 h-8 w-8"
                                aria-label={`Actions for ${venue.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/venue/${venue.id}/edit`} className="flex items-center gap-2">
                                  <Edit className="h-4 w-4" />
                                  Edit & Publish
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-foreground mb-1">{venue.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{venue.address || venue.city}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm">
                              <span className="font-medium text-foreground">
                                ֏{venue.price_per_hour.toLocaleString()}
                              </span>
                              <span className="text-muted-foreground">/hr</span>
                            </div>
                            <Link to={`/venue/${venue.id}/edit`}>
                              <Button size="sm">
                                Complete Listing
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MyVenuesPage;
