import { useState, useCallback } from "react";
import SEOHead from "@/components/seo/SEOHead";
import { Link, useNavigate } from "react-router-dom";
import { Search, Filter, X, Plus, Loader2, Calendar, MapPin, Users, Clock, LayoutGrid, Map, Navigation, MapPinOff, Banknote } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { sportTypes } from "@/data/constants";
import Layout from "@/components/layout/Layout";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { EmptyState } from "@/components/ui/empty-state";
import { useGames, type Game } from "@/hooks/useGames";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import GamesMapView from "@/components/games/GamesMapView";
import { toast } from "sonner";
import { formatTimeOfDay } from "@/lib/time";
import { formatPrice } from "@/lib/pricing";

type GameWithDistance = Game & { distance?: number | null };

const GameCard = ({ game }: { game: GameWithDistance }) => {
  const spotsLeft = game.max_players - (game.participant_count || 0);
  const isFull = spotsLeft <= 0;

  const levelColors: Record<string, string> = {
    beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    all: "bg-primary/10 text-primary",
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{game.sport}</Badge>
            <Badge className={`capitalize ${levelColors[game.skill_level] || levelColors.all}`}>
              {game.skill_level === "all" ? "All levels" : game.skill_level}
            </Badge>
          </div>
          <h3 className="font-semibold text-foreground text-lg">{game.title}</h3>
        </div>
        {/* One statement, not two numbers.
            This read "10 spots" over "of 10 left" — the same figure twice in
            different words, stacked, which scans as two competing counts. What
            someone deciding actually wants is how many places remain. */}
        <div className="text-right shrink-0">
          {isFull ? (
            <div className="text-lg font-semibold text-muted-foreground">Full</div>
          ) : (
            <>
              <div className="stat-numeral text-lg font-semibold tabular-nums text-primary">
                {spotsLeft}
              </div>
              <div className="text-sm text-muted-foreground">
                {spotsLeft === 1 ? "spot left" : "spots left"}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{game.location}</span>
          {game.distance !== null && game.distance !== undefined && (
            <Badge variant="outline" className="ml-auto text-xs">
              {game.distance < 1 
                ? `${Math.round(game.distance * 1000)}m away`
                : `${game.distance.toFixed(1)}km away`
              }
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(game.game_date), "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatTimeOfDay(game.game_time)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Hosted by {game.host?.full_name || "Anonymous"}</span>
          </div>
          {/* The cost was on no card at all, so deciding between three games
              meant opening all three. A free game is worth saying out loud
              rather than leaving as an absence. */}
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            {game.price_per_player ? (
              <span className="font-medium text-foreground">
                {formatPrice(game.price_per_player)}
                <span className="font-normal text-muted-foreground"> per player</span>
              </span>
            ) : (
              <span className="font-medium text-success">Free</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link to={`/game/${game.id}`} className="flex-1">
          <Button variant={isFull ? "secondary" : "default"} className="w-full" disabled={isFull}>
            {isFull ? "Full" : "Request to Join"}
          </Button>
        </Link>
        <Link to={`/game/${game.id}`}>
          <Button variant="outline">Details</Button>
        </Link>
      </div>
    </div>
  );
};

const GamesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const {
    data: games = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGames({
    sport: selectedSport || undefined,
    level: selectedLevel || undefined,
    search: searchQuery || undefined,
    userLocation,
  });

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
        toast.success("Showing games near you!");
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information unavailable");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out");
            break;
          default:
            toast.error("Unable to get your location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    toast.info("Location filter cleared");
  }, []);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSport("");
    setSelectedLevel("");
    setUserLocation(null);
  };

  const hasActiveFilters = searchQuery || selectedSport || selectedLevel || userLocation;

  const handleCreateGame = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/create-game");
  };

  return (
    <Layout>
      <SEOHead
        title="Find Pickup Games & Open Matches"
        description="Join pickup basketball, football, tennis, and other sports games near you. Create your own game and find players to fill your team."
        canonical="/games"
      />
      <div className="bg-background min-h-screen">
        {/* Search Header */}
        <div className="bg-card border-b border-border sticky top-16 z-40">
          <div className="container py-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search games or locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              
              <div className="hidden md:flex items-center gap-3">
                {userLocation ? (
                  <Button 
                    variant="secondary" 
                    className="h-12"
                    onClick={clearLocation}
                  >
                    <MapPinOff className="h-4 w-4 mr-2" />
                    Near Me
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="h-12"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4 mr-2" />
                    )}
                    Near Me
                  </Button>
                )}
                
                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger aria-label="Sport type" className="w-[160px] h-12">
                    <SelectValue placeholder="Sport type" />
                  </SelectTrigger>
                  <SelectContent>
                    {sportTypes.map((sport) => (
                      <SelectItem key={sport} value={sport}>
                        {sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger aria-label="Skill level" className="w-[160px] h-12">
                    <SelectValue placeholder="Skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="all">All levels</SelectItem>
                  </SelectContent>
                </Select>
                
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
                
                <Button onClick={handleCreateGame}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Game
                </Button>
              </div>
              
              <Button
                variant="outline"
                className="md:hidden"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge className="ml-2 h-5 w-5 p-0 justify-center">
                    {[searchQuery, selectedSport, selectedLevel].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </div>
            
            {/* Mobile Filters */}
            {showFilters && (
              <div className="md:hidden pt-4 flex flex-col gap-3">
                {userLocation ? (
                  <Button 
                    variant="secondary" 
                    className="w-full h-12"
                    onClick={clearLocation}
                  >
                    <MapPinOff className="h-4 w-4 mr-2" />
                    Near Me (Active)
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full h-12"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4 mr-2" />
                    )}
                    Games Near Me
                  </Button>
                )}
                
                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger aria-label="Sport type" className="h-12">
                    <SelectValue placeholder="Sport type" />
                  </SelectTrigger>
                  <SelectContent>
                    {sportTypes.map((sport) => (
                      <SelectItem key={sport} value={sport}>
                        {sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger aria-label="Skill level" className="h-12">
                    <SelectValue placeholder="Skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="all">All levels</SelectItem>
                  </SelectContent>
                </Select>
                
                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear all filters
                  </Button>
                )}
                
                <Button className="w-full" onClick={handleCreateGame}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Game
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="container py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="page-title">Open Games</h1>
              <p className="text-muted-foreground">
                {games.length} {games.length === 1 ? "game" : "games"} looking for players
              </p>
            </div>
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "grid" | "map")}>
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="map" aria-label="Map view">
                <Map className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading games...</p>
            </div>
          ) : games.length > 0 ? (
            viewMode === "map" ? (
              <GamesMapView games={games} />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )
          ) : isError ? (
            <ErrorPanel what="games" onRetry={() => refetch()} isRetrying={isFetching} />
          ) : (
            <EmptyState
              icon={Search}
              title="No games found"
              description={
                hasActiveFilters
                  ? "Try adjusting your filters or create your own game"
                  : "Be the first to create a game and find players!"
              }
              actionLabel="Create Game"
              onAction={handleCreateGame}
              secondaryLabel={hasActiveFilters ? "Clear filters" : undefined}
              onSecondaryAction={clearFilters}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default GamesPage;
