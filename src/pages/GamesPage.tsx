import { useState, useCallback, useMemo } from "react";
import SEOHead from "@/components/seo/SEOHead";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MotionProps, Variants } from "framer-motion";
import { easeOutExpo, transitionBase, transitionFast } from "@/lib/motion";
import { Search, Filter, X, Plus, Loader2, Calendar, MapPin, Users, Clock, LayoutGrid, Map, Navigation, MapPinOff, Banknote } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { FilterChips } from "@/components/ui/filter-chips";
import { describeActiveGameFilters } from "@/features/games/activeFilters";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { EmptyState } from "@/components/ui/empty-state";
import { useGames, type Game } from "@/hooks/useGames";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import GamesMapView from "@/components/games/GamesMapView";
import { toast } from "sonner";
import { formatTimeOfDay } from "@/lib/time";
import { formatPrice } from "@/lib/pricing";
import { skillLevelChip, skillLevelLabel } from "@/lib/chips";

type GameWithDistance = Game & { distance?: number | null };

/* ------------------------------------------------------------------
   Motion.

   Durations and easings come from lib/motion, which mirrors the
   --dur-* / --ease-out-expo custom properties in index.css, so this
   page agrees with /venues and / on what "fast" means.

   Under `prefers-reduced-motion: reduce` the animation props are not
   passed at all rather than given a zero duration: the final state
   renders outright, so nothing here depends on a frame that never
   runs. That is the convention HomePage and DiscoverPage established.

   Only transform and opacity are animated. The roster bar in
   particular scales rather than growing its width, so a grid of
   twenty-odd cards costs no layout work while it fills.
   ------------------------------------------------------------------ */

/** Gap between one card's entrance and the next. */
const CARD_STAGGER_STEP = 0.045;
/**
 * The index past which every remaining card shares the last delay.
 *
 * `/games` is unpaginated, so an uncapped stagger would still be dealing
 * out cards a second after the data landed and would read as slowness
 * rather than sequence. Capped, the stagger costs 360ms whether there
 * are nine games or ninety, and the cards past the fold arrive together.
 */
const CARD_STAGGER_CAP = 8;
/**
 * How long after its card settles the roster bar starts filling.
 *
 * The bar is a consequence of the card, not a second thing arriving at
 * the same time — the eye reads "here is a game", then "and it is
 * two-thirds full". Overlapping them turns both into noise.
 */
const ROSTER_FILL_LEAD = 0.12;

/**
 * The grid only fades on the way *out*; the entrance belongs to the
 * cards. Giving both an opacity animation would double it up.
 */
const resultsVariants: Variants = {
  hidden: {},
  visible: {},
  exit: { opacity: 0, transition: transitionFast },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: easeOutExpo,
      delay: Math.min(index, CARD_STAGGER_CAP) * CARD_STAGGER_STEP,
    },
  }),
};

/**
 * Press feedback, and the reduced-motion answer to it.
 *
 * The shared `Button` carries `active:scale-[0.98]` for every button in
 * the app and no `prefers-reduced-motion` escape, so the join CTA
 * shrinks under the finger even for someone who has asked the system
 * for less movement. Scoped to this grid rather than fixed in
 * `components/ui/button.tsx`, which this page does not own.
 *
 * Deliberately narrow: it names `:active` transforms on the two
 * controls only. A blanket `transform: none` here would also flatten
 * the roster bar's scaleX and render every game as full.
 */
const GAMES_MOTION_CSS = `
@media (prefers-reduced-motion: reduce) {
  [data-games-grid] a:active,
  [data-games-grid] button:active {
    transform: none;
  }
}
`;

const GameCard = ({
  game,
  entranceDelay = 0,
}: {
  game: GameWithDistance;
  entranceDelay?: number;
}) => {
  const prefersReduced = useReducedMotion();
  const spotsLeft = game.max_players - (game.participant_count || 0);
  const isFull = spotsLeft <= 0;

  /**
   * How much of the roster is taken, 0–1. Clamped both ends: a game can
   * be over-subscribed (`spotsLeft` goes negative), and a bar past 100%
   * would overflow its track.
   */
  const taken = Math.min(Math.max(game.participant_count || 0, 0), game.max_players);
  const fillRatio = game.max_players > 0 ? taken / game.max_players : 0;

  return (
    <div className="card-lift rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{game.sport}</Badge>
            <Badge className={`capitalize ${skillLevelChip(game.skill_level)}`}>
              {skillLevelLabel(game.skill_level)}
            </Badge>
          </div>
          <h2 className="font-semibold text-foreground text-lg">{game.title}</h2>
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

      {/* Roster fill.
          The counter above says how many places remain; this says how far
          along the game already is, which is the thing you compare between
          two cards. It restates numbers the card already carries and adds no
          reading of its own, so it is hidden from assistive tech rather than
          announced twice.

          scaleX, not width: the bar is one composited transform on a grid
          that can hold every open game at once, and it cannot reflow the card
          mid-fill. */}
      <div
        className="mb-4 h-1 w-full overflow-hidden rounded-full bg-surface-3"
        aria-hidden="true"
      >
        <motion.div
          className={`h-full w-full origin-left rounded-full ${
            isFull ? "bg-muted-foreground/40" : "bg-primary"
          }`}
          initial={prefersReduced ? false : { scaleX: 0 }}
          animate={{ scaleX: fillRatio }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : {
                  duration: 0.45,
                  ease: easeOutExpo,
                  delay: entranceDelay + ROSTER_FILL_LEAD,
                }
          }
        />
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
        <Button asChild variant={isFull ? "secondary" : "default"} className="flex-1 w-full" disabled={isFull}>
          <Link to={`/game/${game.id}`}>{isFull ? "Full" : "Request to Join"}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={`/game/${game.id}`}>Details</Link>
        </Button>
      </div>
    </div>
  );
};

/**
 * The loading shape of the card above.
 *
 * `/games` showed one 32px spinner and the words "Loading games..." in an
 * otherwise empty page, while `/discover` — one nav click away — showed a full
 * grid of skeleton cards in the final layout. A spinner says "wait"; a
 * skeleton says "here is what is arriving, and where".
 *
 * Every block mirrors a real element: the two chips, the title, the spots
 * counter on the right, the roster bar, three rows of metadata, and the two
 * footer buttons.
 */
const GameCardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className="mb-3 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full bg-surface-2" />
          <Skeleton className="h-5 w-20 rounded-full bg-surface-2" />
        </div>
        <Skeleton className="h-6 w-3/4 bg-surface-3" />
      </div>
      <div className="shrink-0 space-y-1.5 text-right">
        <Skeleton className="ml-auto h-6 w-8 bg-surface-3" />
        <Skeleton className="ml-auto h-4 w-16 bg-surface-2" />
      </div>
    </div>

    {/* The roster bar's own footprint. Without it the real cards are 20px
        taller than their placeholders and the whole grid steps down on
        load — the shift this skeleton exists to prevent. */}
    <div className="mb-4 h-1 w-full rounded-full bg-surface-3" />

    <div className="mb-4 space-y-2">
      <Skeleton className="h-4 w-2/3 bg-surface-2" />
      <Skeleton className="h-4 w-1/2 bg-surface-2" />
      <Skeleton className="h-4 w-3/5 bg-surface-2" />
    </div>

    <div className="flex items-center gap-3">
      <Skeleton className="h-10 flex-1 bg-surface-3" />
      <Skeleton className="h-10 w-20 bg-surface-2" />
    </div>
  </div>
);

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

  const activeFilters = useMemo(
    () =>
      describeActiveGameFilters({
        searchQuery,
        selectedSport,
        selectedLevel,
        hasLocation: !!userLocation,
      }),
    [searchQuery, selectedSport, selectedLevel, userLocation],
  );

  /** Drop one filter, leaving the rest alone. */
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

  // ── Motion props for the results region (see the block above) ──
  const prefersReduced = useReducedMotion();

  // `initial: false` so the skeletons are simply *there* on first paint.
  // Fading a placeholder in delays the one thing it exists to do, which is
  // to say "something is coming" as early as possible. It still fades out.
  const skeletonMotion: MotionProps = prefersReduced
    ? {}
    : { initial: false, exit: { opacity: 0 }, transition: transitionFast };

  // Not `initial={false}` on <AnimatePresence>: react-query serves this page
  // from cache for a minute, so a return visit renders the grid as the first
  // branch, and suppressing that would drop the stagger on exactly the loads
  // quick enough to enjoy it.
  const gridMotion: MotionProps = prefersReduced
    ? {}
    : { variants: resultsVariants, initial: "hidden", animate: "visible", exit: "exit" };

  const cardMotion = (index: number): MotionProps =>
    prefersReduced ? {} : { variants: cardVariants, custom: index };

  /** The delay the card at `index` settles on, handed to its roster bar. */
  const cardDelay = (index: number) =>
    prefersReduced ? 0 : Math.min(index, CARD_STAGGER_CAP) * CARD_STAGGER_STEP;

  // Opacity only, no transform: the map is a live Google Maps canvas and an
  // animating transform on an ancestor makes it re-rasterise every frame.
  const mapMotion: MotionProps = prefersReduced
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: transitionBase };

  const panelMotion: MotionProps = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0 },
        transition: transitionBase,
      };

  return (
    <Layout>
      <style dangerouslySetInnerHTML={{ __html: GAMES_MOTION_CSS }} />
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
              <p className="eyebrow mb-2">Find a match</p>
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

          {/* Same gap Discover had: the page filtered on four things and
              showed a count of them on the Filters button, which says how many
              are hidden without naming one, and offers no way to drop a single
              one. */}
          <FilterChips
            className="mb-6"
            chips={activeFilters}
            onRemove={clearGameFilter}
            onClearAll={clearFilters}
          />

          {/* `mode="wait"` so the outgoing branch is gone before the next one
              measures itself. Overlapping two of these would mean taking one
              out of flow, and a placeholder that reserves the wrong space is
              worse than a 150ms handover. */}
          <AnimatePresence mode="wait">
          {isLoading ? (
            // Same grid, same card footprint, so nothing moves when the real
            // games land in it.
            <motion.div
              key="loading"
              {...skeletonMotion}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              role="status"
              aria-label="Loading games"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </motion.div>
          ) : games.length > 0 ? (
            viewMode === "map" ? (
              <motion.div key="map" {...mapMotion}>
                <GamesMapView games={games} />
              </motion.div>
            ) : (
              /* The key stays "results" across filter changes on purpose.
                 Only a change of key runs an exit, so narrowing the list
                 re-flows the grid rather than fading the whole thing out and
                 back — and the cards that survive the change never re-animate.
                 What does animate is a game that has just become a result: it
                 mounts under a parent already at "visible" and plays its own
                 entrance. */
              <motion.div
                key="results"
                {...gridMotion}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                data-games-grid
              >
                {games.map((game, index) => (
                  /* The wrapper takes the entrance transform so the card keeps
                     its own: `.card-lift` translates it on hover, and one
                     element cannot hold an entrance and a hover response at
                     once. */
                  <motion.div key={game.id} {...cardMotion(index)}>
                    <GameCard game={game} entranceDelay={cardDelay(index)} />
                  </motion.div>
                ))}
              </motion.div>
            )
          ) : isError ? (
            <motion.div key="error" {...panelMotion}>
              <ErrorPanel what="games" onRetry={() => refetch()} isRetrying={isFetching} />
            </motion.div>
          ) : (
            <motion.div key="empty" {...panelMotion}>
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
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
};

export default GamesPage;
