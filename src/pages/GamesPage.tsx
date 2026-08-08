import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Banknote,
  Calendar,
  Clock,
  Filter,
  LayoutGrid,
  Loader2,
  Map,
  MapPin,
  MapPinOff,
  Navigation,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import GamesMapView from "@/components/games/GamesMapView";
import Layout from "@/components/layout/Layout";
import { ErrorPanel } from "@/components/common/StatusPanel";
import SEOHead from "@/components/seo/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filter-chips";
import { Input } from "@/components/ui/input";
import { Price } from "@/components/ui/price";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { sportTypes } from "@/data/constants";
import { describeActiveGameFilters } from "@/features/games/activeFilters";
import { useAuth } from "@/hooks/useAuth";
import { useGames, type Game } from "@/hooks/useGames";
import { skillLevelChip, skillLevelLabel } from "@/lib/chips";
import { formatTimeOfDay } from "@/lib/time";

type GameWithDistance = Game & { distance?: number | null };

const GameCard = ({ game }: { game: GameWithDistance }) => {
  const participantCount = Math.max(0, game.participant_count || 0);
  const spotsLeft = game.max_players - participantCount;
  const isFull = spotsLeft <= 0;
  const rosterFill =
    game.max_players > 0
      ? Math.min(100, Math.round((participantCount / game.max_players) * 100))
      : 0;

  return (
    <article className="card-lift flex h-full flex-col rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{game.sport}</Badge>
            <Badge className={`capitalize ${skillLevelChip(game.skill_level)}`}>
              {skillLevelLabel(game.skill_level)}
            </Badge>
          </div>
          <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground">
            {game.title}
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={
              isFull
                ? "text-sm font-semibold text-muted-foreground"
                : "stat-numeral text-lg font-semibold text-primary"
            }
          >
            {isFull ? "Full" : Math.max(0, spotsLeft)}
          </p>
          {!isFull && (
            <p className="text-xs text-muted-foreground">
              {spotsLeft === 1 ? "spot left" : "spots left"}
            </p>
          )}
        </div>
      </div>

      <div
        className="mb-4 h-1 overflow-hidden rounded-full bg-surface-3"
        role="img"
        aria-label={`${participantCount} of ${game.max_players} players joined`}
      >
        <div
          className={isFull ? "h-full bg-muted-foreground/50" : "h-full bg-primary"}
          style={{ width: `${rosterFill}%` }}
        />
      </div>

      <div className="mb-5 space-y-2.5 text-sm text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="sr-only">Location:</span>
          <span className="min-w-0 flex-1 truncate">{game.location}</span>
          {game.distance !== null && game.distance !== undefined && (
            <span className="shrink-0 text-xs font-medium text-foreground-soft">
              {game.distance < 1
                ? `${Math.round(game.distance * 1000)} m`
                : `${game.distance.toFixed(1)} km`}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="sr-only">Date:</span>
            <span>{format(new Date(game.game_date), "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="sr-only">Time:</span>
            <span>{formatTimeOfDay(game.game_time)}</span>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Host:</span>
          <span className="truncate">Hosted by {game.host?.full_name || "Anonymous"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Banknote className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Price:</span>
          <span>
            {game.price_per_player ? (
              <Price
                amount={game.price_per_player}
                suffix="/ player"
                className="text-sm font-semibold text-foreground"
              />
            ) : (
              <span className="font-semibold text-success">Free</span>
            )}
          </span>
        </div>
      </div>

      <Button asChild variant={isFull ? "outline" : "default"} className="mt-auto w-full">
        <Link to={`/game/${game.id}`} aria-label={`View ${game.title}`}>
          View game
        </Link>
      </Button>
    </article>
  );
};

const GameCardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className="mb-3 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="ml-auto h-6 w-8" />
        <Skeleton className="h-4 w-14" />
      </div>
    </div>
    <Skeleton className="mb-4 h-1 w-full rounded-full" />
    <div className="mb-5 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-4 w-2/5" />
    </div>
    <Skeleton className="h-11 w-full" />
  </div>
);

const GamesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
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

  const hasActiveFilters = Boolean(searchQuery || selectedSport || selectedLevel || userLocation);

  const activeFilters = useMemo(
    () =>
      describeActiveGameFilters({
        searchQuery,
        selectedSport,
        selectedLevel,
        hasLocation: Boolean(userLocation),
      }),
    [searchQuery, selectedSport, selectedLevel, userLocation],
  );

  const clearGameFilter = (key: string) => {
    if (key === "query") setSearchQuery("");
    else if (key === "sport") setSelectedSport("");
    else if (key === "level") setSelectedLevel("");
    else if (key === "location") setUserLocation(null);
  };

  const handleCreateGame = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/create-game");
  };

  const locationControl = userLocation ? (
    <Button variant="soft" className="h-12 w-full lg:w-auto" onClick={clearLocation}>
      <MapPinOff className="h-4 w-4" aria-hidden="true" />
      Near me on
    </Button>
  ) : (
    <Button variant="outline" className="h-12 w-full lg:w-auto" onClick={handleGetLocation} disabled={isLocating}>
      {isLocating ? (
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <Navigation className="h-4 w-4" aria-hidden="true" />
      )}
      Near me
    </Button>
  );

  return (
    <Layout>
      <SEOHead
        title="Find Pickup Games & Open Matches"
        description="Join pickup basketball, football, tennis, and other sports games near you. Create your own game and find players to fill your team."
        canonical="/games"
      />
      <div className="min-h-screen bg-background">
        <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/90">
          <div className="container py-3 md:py-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_auto]">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  aria-label="Search games or locations"
                  placeholder="Search games or locations…"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-12 pl-11"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 lg:flex">
                  {locationControl}
                  <Select value={selectedSport} onValueChange={setSelectedSport}>
                    <SelectTrigger aria-label="Sport type" className="h-12 w-[9.5rem]">
                      <SelectValue placeholder="Sport" />
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
                    <SelectTrigger aria-label="Skill level" className="h-12 w-[9.5rem]">
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
                    <Button variant="ghost" className="h-12" onClick={clearFilters}>
                      <X className="h-4 w-4" aria-hidden="true" />
                      Clear
                    </Button>
                  )}
                </div>

                <Sheet open={showFilters} onOpenChange={setShowFilters}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="h-12 flex-1 lg:hidden">
                      <Filter className="h-4 w-4" aria-hidden="true" />
                      Filters
                      {activeFilters.length > 0 && (
                        <Badge className="ml-1 min-h-5 min-w-5 justify-center px-1.5">
                          {activeFilters.length}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom">
                    <SheetHeader>
                      <SheetTitle>Filter open games</SheetTitle>
                      <SheetDescription>
                        Narrow by sport, skill level, or your current location.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-4 py-2 sm:grid-cols-2">
                      <div className="sm:col-span-2">{locationControl}</div>
                      <Select value={selectedSport} onValueChange={setSelectedSport}>
                        <SelectTrigger aria-label="Sport type" className="h-12 w-full">
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
                        <SelectTrigger aria-label="Skill level" className="h-12 w-full">
                          <SelectValue placeholder="Skill level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="all">All levels</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <SheetFooter>
                      {hasActiveFilters && (
                        <Button variant="ghost" onClick={clearFilters}>
                          Clear all
                        </Button>
                      )}
                      <Button onClick={() => setShowFilters(false)}>Show games</Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>

                <Button className="h-12 flex-1 lg:flex-none" onClick={handleCreateGame}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="sm:hidden">Create</span>
                  <span className="hidden sm:inline">Create game</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-8 md:py-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Find a match</p>
              <h1 className="page-title">Open Games</h1>
              <p className="text-muted-foreground" aria-live="polite">
                {isLoading
                  ? "Finding available games…"
                  : `${games.length} ${games.length === 1 ? "game" : "games"} looking for players`}
              </p>
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as "grid" | "map")}
              aria-label="Game results view"
              className="shrink-0"
            >
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              </ToggleGroupItem>
              <ToggleGroupItem value="map" aria-label="Map view">
                <Map className="h-4 w-4" aria-hidden="true" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <FilterChips
            className="mb-6"
            chips={activeFilters}
            onRemove={clearGameFilter}
            onClearAll={clearFilters}
          />

          {isLoading ? (
            <div
              className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
              role="status"
              aria-label="Loading games"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <GameCardSkeleton key={index} />
              ))}
            </div>
          ) : games.length > 0 ? (
            viewMode === "map" ? (
              <GamesMapView games={games} />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-games-grid>
                {games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )
          ) : isError ? (
            <div className="max-w-3xl rounded-xl border border-destructive/25 bg-destructive/5">
              <ErrorPanel what="games" onRetry={() => refetch()} isRetrying={isFetching} />
            </div>
          ) : (
            <div className="max-w-3xl">
              <EmptyState
                bordered
                icon={Search}
                title="No games found"
                description={
                  hasActiveFilters
                    ? "Try widening your filters, or create the game you want to play."
                    : "Be the first to create a game and find players."
                }
                actionLabel="Create game"
                onAction={handleCreateGame}
                secondaryLabel={hasActiveFilters ? "Clear filters" : undefined}
                onSecondaryAction={clearFilters}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default GamesPage;
