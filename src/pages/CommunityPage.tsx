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
import { getVenueImage, useVenues } from "@/hooks/useVenues";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { formatTimeOfDay } from "@/lib/time";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { Skeleton } from "@/components/ui/skeleton";
import VenueCard from "@/components/venues/VenueCard";

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

interface PlayerFace {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface GameCardProps {
  game: any;
  participantCount: number;
  /** The first few people actually confirmed for this game. */
  faces?: PlayerFace[];
  distance?: number;
  showParticipants?: boolean;
}

const faceInitial = (p: PlayerFace) =>
  (p.full_name || p.username || "P").charAt(0).toUpperCase();

const GameCard: React.FC<GameCardProps> = ({ game, participantCount, faces = [], distance, showParticipants = true }) => {
  const spotsLeft = game.max_players - participantCount;
  const isFilling = spotsLeft <= 3 && spotsLeft > 0;
  const isFull = spotsLeft <= 0;
  // Anyone joined but not drawn — either past the four we show, or a profile
  // that came back empty. Counted from the real total, never assumed to be
  // `count - 4`.
  const hiddenPlayers = Math.max(0, participantCount - faces.length);

  return (
    <Link
      to={`/game/${game.id}`}
      aria-label={`View ${game.title}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="card-lift h-full overflow-hidden">
        <CardContent className="flex h-full flex-col p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
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
              // Was `bg-amber-500 text-white`: white on amber-500 measures
              // 2.15:1, against 4.5:1 for text this size. The tinted-chip
              // pattern the rest of the app already uses keeps the urgency
              // without the hardcoded fill. `animate-pulse` went with it —
              // scarcity is the message, a throbbing badge is pressure.
              <Badge className="border-warning/20 bg-warning/10 text-warning">
                {spotsLeft === 1 ? "1 spot left" : `${spotsLeft} spots left`}
              </Badge>
            )}
            {isFull && (
              <Badge variant="secondary" className="bg-muted">
                Full
              </Badge>
            )}
          </div>

          <h3 className="mb-2 line-clamp-2 font-semibold leading-snug text-foreground transition-colors duration-150 motion-reduce:transition-none group-hover:text-primary">
            {game.title}
          </h3>

          <div className="mb-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{formatGameDate(game.game_date)}</span>
              <Clock className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
              <span>{formatTimeOfDay(game.game_time)}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{game.location}</span>
              {distance !== undefined && (
                <span className="text-xs text-primary font-medium ml-auto shrink-0">
                  {distance.toFixed(1)} km
                </span>
              )}
            </div>
          </div>

          {showParticipants && (
            <div className="mt-auto flex min-h-7 items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  <span className="tabular-nums">{participantCount}/{game.max_players}</span> joined
                </span>
              </div>
              <div className="flex -space-x-2">
                {faces.map((person, index) => (
                  <Avatar key={`${person.user_id}-${index}`} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={person.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="text-xs bg-primary/10">
                      {faceInitial(person)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {hiddenPlayers > 0 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium tabular-nums">
                    +{hiddenPlayers}
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
  const {
    data: publicGames = [],
    isLoading: gamesLoading,
    isError: gamesError,
    isFetching: gamesFetching,
    refetch: refetchGames,
  } = useGames({ userLocation });
  const { data: userGamesData, isLoading: userGamesLoading } = useUserGames(user?.id);
  const {
    data: venues = [],
    isLoading: venuesLoading,
    isError: venuesError,
    isFetching: venuesFetching,
    refetch: refetchVenues,
  } = useVenues();
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [participantFaces, setParticipantFaces] = useState<Record<string, PlayerFace[]>>({});
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
        .select('game_id, user_id')
        .in('game_id', gameIds)
        .eq('status', 'confirmed');

      if (!data) return;

      const counts: Record<string, number> = {};
      // Only four circles are ever drawn, so only four ids per game are worth
      // resolving — a fifty-player game should not fetch fifty profiles to
      // render four letters.
      const idsPerGame: Record<string, string[]> = {};
      data.forEach(p => {
        counts[p.game_id] = (counts[p.game_id] || 0) + 1;
        const shown = idsPerGame[p.game_id] || (idsPerGame[p.game_id] = []);
        if (shown.length < 4) shown.push(p.user_id);
      });
      setParticipantCounts(counts);

      const wanted = [...new Set(Object.values(idsPerGame).flat())];
      if (wanted.length === 0) return;

      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, full_name, username, avatar_url')
        .in('user_id', wanted);

      const byUser = new Map((profiles || []).map(p => [p.user_id, p as PlayerFace]));
      setParticipantFaces(
        Object.fromEntries(
          Object.entries(idsPerGame).map(([gameId, ids]) => [
            gameId,
            ids.map(id => byUser.get(id)).filter((p): p is PlayerFace => Boolean(p)),
          ])
        )
      );
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
  /**
   * Every section on the Discover tab is derived from these two queries, and
   * every one of them falls back to an EmptyState that says the app has
   * nothing — "No trending games yet", "No venues added yet". Those are claims
   * about the world, and on a failed request they are false ones: measured
   * with the content tables serving 500, /community told the user there were
   * no trending games and offered to let them create the first.
   *
   * TeamsPage already makes this argument in a comment on its own error
   * branch. This is the same bug on a different page.
   */
  const loadFailed = gamesError || venuesError;
  const retryFeed = () => {
    if (gamesError) refetchGames();
    if (venuesError) refetchVenues();
  };

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8 md:py-10">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow mb-2">Who is playing</p>
              <h1 className="page-title">Community</h1>
              <p className="max-w-2xl text-muted-foreground">
                Find a match first, then keep up with the players and places you know.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1 md:flex-none">
                <Link to="/games">Find a game</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 md:flex-none">
                <Link to="/create-game">Create game</Link>
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
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
                <div className="space-y-8" role="status" aria-label="Loading the community">
                  <div>
                    <Skeleton className="mb-2 h-6 w-48" />
                    <Skeleton className="mb-4 h-4 w-64" />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 3 }, (_, index) => (
                        <Skeleton key={index} className="h-52 w-full" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Skeleton className="mb-4 h-6 w-44" />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 3 }, (_, index) => (
                        <Skeleton key={index} className="h-52 w-full" />
                      ))}
                    </div>
                  </div>
                </div>
              ) : loadFailed ? (
                <ErrorPanel
                  what="the community feed"
                  onRetry={retryFeed}
                  isRetrying={gamesFetching || venuesFetching}
                />
              ) : (
                <>
                  {/* Nearby Open Games */}
                  {nearbyGames.length > 0 && (
                    <section className="rounded-xl border border-border bg-surface-1 p-4 md:p-5">
                      <div className="mb-4 flex items-end justify-between gap-3">
                        <div>
                          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                            <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                            Games near you
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">Sorted by distance from your current location</p>
                        </div>
                        <Button asChild variant="ghost" className="shrink-0">
                          <Link to="/games" aria-label="View all nearby games">
                            View all <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {nearbyGames.map(game => (
                          <GameCard
                            key={game.id}
                            game={game}
                            participantCount={participantCounts[game.id] || 0}
                            faces={participantFaces[game.id] || []}
                            distance={game.distance}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Trending in Your Area */}
                  <section>
                    <div className="mb-4 flex items-end justify-between gap-3">
                      <div>
                        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                          <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
                          Popular now
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
                        <Button asChild variant="ghost">
                          <Link to="/games" aria-label="View all popular games">
                            View all <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      )}
                    </div>
                    {/* Three across, like Nearby Open Games directly above and
                        like /games itself. It was four, so the identical card
                        rendered 440px wide in one section and 328px in the
                        next, one scroll apart on the same screen. */}
                    {trendingGames.length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {trendingGames.map(game => (
                          <GameCard
                            key={game.id}
                            game={game}
                            participantCount={participantCounts[game.id] || 0}
                          faces={participantFaces[game.id] || []}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        bordered
                        compact
                        icon={TrendingUp}
                        title="No trending games yet"
                        description="Start one and it will be the first thing people see here."
                        actionLabel="Create a game"
                        actionHref="/create-game"
                      />
                    )}
                  </section>

                  {/* People You Played With */}
                  {user && playedWith.length > 0 && (
                    <section>
                      <div className="mb-4">
                        <div>
                          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                            <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
                            Familiar players
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">Players from games in your activity</p>
                        </div>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-2" role="list">
                        {playedWith.map((person, index) => (
                          <Card key={person.user_id || person.id || index} className="w-36 shrink-0 p-4 text-center" role="listitem">
                            <Avatar className="mx-auto mb-2 h-14 w-14">
                              <AvatarImage src={person.avatar_url} alt={person.full_name || person.username || "Player"} />
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
                    <div className="mb-4 flex items-end justify-between gap-3">
                      <div>
                        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                          <Star className="h-5 w-5 text-primary" aria-hidden="true" />
                          New places to play
                        </h2>
                        {recentVenues.length > 0 && (
                          <p className="mt-1 text-sm text-muted-foreground">Recently added venues from the marketplace</p>
                        )}
                      </div>
                      {recentVenues.length > 0 && (
                        <Button asChild variant="ghost">
                          <Link to="/venues" aria-label="View all venues">
                            View all <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      )}
                    </div>
                    {/* The games empty state below offers a way out; the
                        venues one was a dead end. Owners can seed the
                        catalogue, so send them there. */}
                    {recentVenues.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {recentVenues.map(venue => (
                          <VenueCard
                            headingLevel="h3"
                            key={venue.id}
                            id={venue.id}
                            name={venue.name}
                            image={getVenueImage(venue)}
                            location={venue.address || venue.city}
                            sports={venue.sports}
                            price={venue.price_per_hour}
                            rating={venue.rating}
                            reviewCount={venue.review_count}
                            available={venue.is_active}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        bordered
                        compact
                        icon={MapPin}
                        title="No venues added yet"
                        description="The first listing here will be the one everybody books."
                        actionLabel="List your venue"
                        actionHref="/for-owners"
                      />
                    )}
                  </section>
                </>
              )}
            </TabsContent>

            <TabsContent value="my-activity" className="space-y-8">
              {!user ? (
                <EmptyState
                  bordered
                  icon={Users}
                  title="Join the Community"
                  description="Sign in to see your activity and connect with other players."
                  actionLabel="Sign In"
                  actionHref="/login"
                />
              ) : userGamesLoading ? (
                <div className="text-center py-12" role="status" aria-label="Loading the community">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                  <p className="mt-3 text-sm text-muted-foreground">Loading your activity…</p>
                </div>
              ) : (
                <>
                  {/* Your Upcoming Sessions */}
                  <section>
                    <div className="mb-4 flex items-end justify-between gap-3">
                      <div>
                        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                          <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
                          Your upcoming games
                        </h2>
                        <p className="text-sm text-muted-foreground">Games you're participating in</p>
                      </div>
                      <Button asChild variant="ghost">
                        <Link to="/dashboard" aria-label="View all upcoming games">
                          View all <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                    {upcomingSessions.length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingSessions.map(game => (
                          <GameCard
                            key={game.id}
                            game={game}
                            participantCount={participantCounts[game.id] || 0}
                          faces={participantFaces[game.id] || []}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        bordered
                        compact
                        icon={Calendar}
                        title="No upcoming games"
                        description="Join one that's already filling up, or start your own."
                        actionLabel="Create a game"
                        actionHref="/create-game"
                        secondaryLabel="Find a game"
                        secondaryHref="/games"
                      />
                    )}
                  </section>

                  {/* People You Played With */}
                  {playedWith.length > 0 && (
                    <section>
                      <div className="mb-4">
                        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                          <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
                          Familiar players
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">Players from games in your activity</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {playedWith.map((person, index) => (
                          <Card key={person.user_id || person.id || index} className="p-4 text-center">
                            <Avatar className="h-16 w-16 mx-auto mb-2">
                              <AvatarImage src={person.avatar_url} alt={person.full_name || person.username || "Player"} />
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
