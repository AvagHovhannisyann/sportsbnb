import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Clock, Users, Calendar, ChevronRight, Star, TrendingUp, UserPlus, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useGames, useUserGames } from "@/hooks/useGames";
import { useVenues } from "@/hooks/useVenues";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, isTomorrow, formatDistanceToNow } from "date-fns";

// Haversine formula for distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const formatGameDate = (dateStr: string): string => {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, MMM d");
};

const formatGameTime = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

interface GameCardProps {
  game: any;
  participantCount: number;
  distance?: number;
  showParticipants?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ game, participantCount, distance, showParticipants = true }) => {
  const spotsLeft = game.max_players - participantCount;
  const isFilling = spotsLeft <= 3 && spotsLeft > 0;
  const isFull = spotsLeft <= 0;

  return (
    <Link to={`/game/${game.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-medium">
                {game.sport}
              </Badge>
              {game.skill_level !== 'all' && (
                <Badge variant="outline" className="text-xs capitalize">
                  {game.skill_level}
                </Badge>
              )}
            </div>
            {isFilling && !isFull && (
              <Badge className="bg-amber-500 text-white animate-pulse">
                {spotsLeft} spots left
              </Badge>
            )}
            {isFull && (
              <Badge variant="secondary" className="bg-muted">
                Full
              </Badge>
            )}
          </div>

          <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
            {game.title}
          </h3>

          <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>{formatGameDate(game.game_date)}</span>
              <Clock className="h-3.5 w-3.5 ml-2 text-primary" />
              <span>{formatGameTime(game.game_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="truncate">{game.location}</span>
              {distance !== undefined && (
                <span className="text-xs text-primary font-medium ml-auto shrink-0">
                  {distance.toFixed(1)} km
                </span>
              )}
            </div>
          </div>

          {showParticipants && (
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {participantCount}/{game.max_players} joined
                </span>
              </div>
              <div className="flex -space-x-2">
                {[...Array(Math.min(participantCount, 4))].map((_, i) => (
                  <Avatar key={i} className="h-6 w-6 border-2 border-background">
                    <AvatarFallback className="text-xs bg-primary/10">
                      {String.fromCharCode(65 + i)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {participantCount > 4 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                    +{participantCount - 4}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

const CommunityPage = () => {
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { data: publicGames = [], isLoading: gamesLoading } = useGames({ userLocation });
  const { data: userGamesData, isLoading: userGamesLoading } = useUserGames(user?.id);
  const { data: venues = [], isLoading: venuesLoading } = useVenues();
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [playedWith, setPlayedWith] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("discover");

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Location permission denied")
      );
    }
  }, []);

  // Fetch participant counts for all games
  useEffect(() => {
    const fetchParticipantCounts = async () => {
      const gameIds = publicGames.map(g => g.id);
      if (gameIds.length === 0) return;

      const { data } = await supabase
        .from('game_participants')
        .select('game_id')
        .in('game_id', gameIds)
        .eq('status', 'confirmed');

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(p => {
          counts[p.game_id] = (counts[p.game_id] || 0) + 1;
        });
        setParticipantCounts(counts);
      }
    };

    fetchParticipantCounts();
  }, [publicGames]);

  // Fetch people user has played with
  useEffect(() => {
    const fetchPlayedWith = async () => {
      if (!user) return;

      // Get games user participated in
      const { data: myParticipations } = await supabase
        .from('game_participants')
        .select('game_id')
        .eq('user_id', user.id);

      if (!myParticipations || myParticipations.length === 0) return;

      const gameIds = myParticipations.map(p => p.game_id);

      // Get other participants from those games
      const { data: otherParticipants } = await supabase
        .from('game_participants')
        .select('user_id')
        .in('game_id', gameIds)
        .neq('user_id', user.id);

      if (!otherParticipants) return;

      // Get unique user IDs
      const uniqueUserIds = [...new Set(otherParticipants.map(p => p.user_id))].slice(0, 10);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('*')
        .in('user_id', uniqueUserIds);

      setPlayedWith(profiles || []);
    };

    fetchPlayedWith();
  }, [user]);

  // Calculate games with distance
  const gamesWithDistance = publicGames.map(game => {
    let distance: number | undefined;
    if (userLocation && game.latitude && game.longitude) {
      distance = calculateDistance(userLocation.lat, userLocation.lng, game.latitude, game.longitude);
    }
    return { ...game, distance };
  });

  // Sort games by distance (nearest first)
  const nearbyGames = [...gamesWithDistance]
    .filter(g => g.distance !== undefined)
    .sort((a, b) => (a.distance || 0) - (b.distance || 0))
    .slice(0, 6);

  // Trending games (most participants)
  const trendingGames = [...publicGames]
    .sort((a, b) => (participantCounts[b.id] || 0) - (participantCounts[a.id] || 0))
    .slice(0, 4);

  // Recently added venues
  const recentVenues = [...venues]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  // Get all user games as a flat array
  const allUserGames = [
    ...(userGamesData?.hosted || []),
    ...(userGamesData?.joined || [])
  ];

  // User's upcoming sessions
  const upcomingSessions = allUserGames
    .filter(g => new Date(g.game_date) >= new Date())
    .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
    .slice(0, 4);

  const isLoading = gamesLoading || venuesLoading;

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Community</h1>
            <p className="text-muted-foreground">
              Discover games, connect with players, and join the action near you.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
              <TabsTrigger value="discover" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Discover
              </TabsTrigger>
              <TabsTrigger value="my-activity" className="gap-2">
                <Calendar className="h-4 w-4" />
                My Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discover" className="space-y-8">
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground mt-2">Loading community...</p>
                </div>
              ) : (
                <>
                  {/* Nearby Open Games */}
                  {nearbyGames.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            Nearby Open Games
                          </h2>
                          <p className="text-sm text-muted-foreground">Games happening close to you</p>
                        </div>
                        <Link to="/games">
                          <Button variant="ghost" size="sm">
                            View all <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {nearbyGames.map(game => (
                          <GameCard
                            key={game.id}
                            game={game}
                            participantCount={participantCounts[game.id] || 0}
                            distance={game.distance}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Trending in Your Area */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          Trending Games
                        </h2>
                        {/* Subtitle describes the list, so it only holds while
                            there is one. "Popular games filling up fast" above
                            "No trending games yet" contradicted itself. */}
                        {trendingGames.length > 0 && (
                          <p className="text-sm text-muted-foreground">Popular games filling up fast</p>
                        )}
                      </div>
                      {/* "View all" led to an equally empty list. */}
                      {trendingGames.length > 0 && (
                        <Link to="/games">
                          <Button variant="ghost" size="sm">
                            View all <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                    {trendingGames.length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {trendingGames.map(game => (
                          <GameCard
                            key={game.id}
                            game={game}
                            participantCount={participantCounts[game.id] || 0}
                          />
                        ))}
                      </div>
                    ) : (
                      <Card className="p-8 text-center">
                        <p className="text-muted-foreground">No trending games yet</p>
                        <Link to="/create-game" className="mt-4 inline-block">
                          <Button>Create a game</Button>
                        </Link>
                      </Card>
                    )}
                  </section>

                  {/* People You Played With */}
                  {user && playedWith.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-primary" />
                            People You've Played With
                          </h2>
                          <p className="text-sm text-muted-foreground">Connect with familiar faces</p>
                        </div>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {playedWith.map((person) => (
                          <Card key={person.id} className="shrink-0 w-36 text-center p-4 hover:shadow-md transition-shadow">
                            <Avatar className="h-16 w-16 mx-auto mb-2">
                              <AvatarImage src={person.avatar_url} />
                              <AvatarFallback className="bg-primary/10 text-lg">
                                {(person.full_name || person.username || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-sm text-foreground truncate">
                              {person.full_name || person.username || 'Player'}
                            </p>
                            {person.preferred_sports && person.preferred_sports.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate">
                                {person.preferred_sports[0]}
                              </p>
                            )}
                          </Card>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Recently Added Venues */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                          <Star className="h-5 w-5 text-primary" />
                          Recently Added Venues
                        </h2>
                        {recentVenues.length > 0 && (
                          <p className="text-sm text-muted-foreground">New places to play</p>
                        )}
                      </div>
                      {recentVenues.length > 0 && (
                        <Link to="/venues">
                          <Button variant="ghost" size="sm">
                            View all <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                    {recentVenues.length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {recentVenues.map(venue => (
                          <Link key={venue.id} to={`/venue/${venue.id}`}>
                            <Card className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] group">
                              <div className="aspect-[16/10] relative">
                                <img
                                  src={venue.image_url || '/placeholder.svg'}
                                  alt={venue.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                <div className="absolute bottom-2 left-2 right-2">
                                  <Badge variant="secondary" className="mb-1 text-xs">
                                    {venue.sports?.[0] || 'Sports'}
                                  </Badge>
                                </div>
                              </div>
                              <CardContent className="p-3">
                                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                  {venue.name}
                                </h3>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{venue.city}</span>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-muted-foreground">
                                    Added {formatDistanceToNow(new Date(venue.created_at), { addSuffix: true })}
                                  </span>
                                  {venue.rating > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                      <span className="text-xs font-medium">{venue.rating}</span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <Card className="p-8 text-center">
                        <p className="text-muted-foreground">No venues added yet</p>
                        {/* The games empty state offers a way out; this one
                            was a dead end. Owners can seed the catalogue. */}
                        <Link to="/for-owners" className="mt-4 inline-block">
                          <Button variant="outline">List your venue</Button>
                        </Link>
                      </Card>
                    )}
                  </section>
                </>
              )}
            </TabsContent>

            <TabsContent value="my-activity" className="space-y-8">
              {!user ? (
                <Card className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Join the Community</h3>
                  <p className="text-muted-foreground mb-4">
                    Sign in to see your activity and connect with other players.
                  </p>
                  <Link to="/login">
                    <Button>Sign In</Button>
                  </Link>
                </Card>
              ) : userGamesLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </div>
              ) : (
                <>
                  {/* Your Upcoming Sessions */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          Your Upcoming Sessions
                        </h2>
                        <p className="text-sm text-muted-foreground">Games you're participating in</p>
                      </div>
                      <Link to="/dashboard">
                        <Button variant="ghost" size="sm">
                          View all <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                    {upcomingSessions.length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {upcomingSessions.map(game => (
                          <GameCard
                            key={game.id}
                            game={game}
                            participantCount={participantCounts[game.id] || 0}
                          />
                        ))}
                      </div>
                    ) : (
                      <Card className="p-8 text-center">
                        <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground mb-4">No upcoming games</p>
                        <div className="flex gap-3 justify-center">
                          <Link to="/games">
                            <Button variant="outline">Find a game</Button>
                          </Link>
                          <Link to="/create-game">
                            <Button>Create a game</Button>
                          </Link>
                        </div>
                      </Card>
                    )}
                  </section>

                  {/* People You Played With */}
                  {playedWith.length > 0 && (
                    <section>
                      <div className="mb-4">
                        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                          <UserPlus className="h-5 w-5 text-primary" />
                          People You've Played With
                        </h2>
                        <p className="text-sm text-muted-foreground">Your sports network</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {playedWith.map((person) => (
                          <Card key={person.id} className="text-center p-4 hover:shadow-md transition-shadow">
                            <Avatar className="h-16 w-16 mx-auto mb-2">
                              <AvatarImage src={person.avatar_url} />
                              <AvatarFallback className="bg-primary/10 text-lg">
                                {(person.full_name || person.username || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-sm text-foreground truncate">
                              {person.full_name || person.username || 'Player'}
                            </p>
                            {person.city && (
                              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {person.city}
                              </p>
                            )}
                          </Card>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default CommunityPage;
