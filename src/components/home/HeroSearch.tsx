import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Loader2, MapPin, Navigation, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { sportTypes } from "@/data/constants";

const HeroSearch = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [sport, setSport] = useState("");
  const [when, setWhen] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (sport && sport !== "any") params.set("sport", sport);
    // `q`, not `location`. Discover reads `q`, `city`, `sport`, `lat`/`lng`
    // and `maxPrice`; it has never read `location`, so what the user typed
    // into the field labelled Location was written to the URL and then
    // ignored — the results were the unfiltered catalogue, presented as the
    // answer to a search. `q` is the free-text filter, and it matches on
    // venue name *or* address/city, which is what a typed place name wants.
    if (location.trim()) params.set("q", location.trim());
    setSheetOpen(false);
    navigate(`/venues?${params.toString()}`);
  };

  const handleNearMe = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const params = new URLSearchParams();
        params.set("lat", latitude.toString());
        params.set("lng", longitude.toString());
        if (sport && sport !== "any") params.set("sport", sport);
        setIsLocating(false);
        setSheetOpen(false);
        navigate(`/venues?${params.toString()}`);
      },
      () => {
        setIsLocating(false);
        toast.error("Unable to get your location. Please enable location services.");
      },
    );
  };

  // Both the mobile sheet and desktop bar stay mounted at the same time.
  // A prefix keeps their labels and controls uniquely associated in the DOM.
  const renderFormBody = (idPrefix: string) => {
    const locationId = `${idPrefix}-location`;
    const sportId = `${idPrefix}-sport`;
    const whenId = `${idPrefix}-when`;

    return (
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-stretch">
        <label
          htmlFor={locationId}
          className="flex min-h-[4.5rem] items-center gap-3 rounded-lg border border-border bg-surface-1 px-3.5 transition-colors duration-150 motion-reduce:transition-none hover:border-border-strong focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20"
        >
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold leading-4 text-foreground-soft">Location</span>
            <input
              id={locationId}
              type="text"
              placeholder="City or neighborhood"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              // The wrapping label carries the field's focus-within highlight,
              // but that paints outside this input's own box — so the input
              // itself repainted not one pixel when focused, which is what
              // WCAG 2.4.7 is about and what focus-visible.mjs measures. An
              // inset ring keeps the whole-field treatment and gives the
              // focused control its own visible edge instead of relying on an
              // ancestor to show it.
              className="block min-h-8 w-full rounded-sm bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            />
          </span>
        </label>

        <div className="rounded-lg border border-border bg-surface-1 px-3.5 py-1.5 transition-colors duration-150 motion-reduce:transition-none hover:border-border-strong focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
          <label htmlFor={sportId} className="block text-xs font-semibold leading-4 text-foreground-soft">
            Sport
          </label>
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger
              id={sportId}
              className="h-11 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0"
            >
              <SelectValue placeholder="Any sport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any sport</SelectItem>
              {/* Not `s.toLowerCase()`. Venues are tagged with these strings
                  verbatim and Discover filters with a case-sensitive
                  `sports.includes(...)`, so the lower-cased value travelled
                  into the URL and matched nothing. */}
              {sportTypes.map((sportType) => (
                <SelectItem key={sportType} value={sportType}>
                  {sportType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border bg-surface-1 px-3.5 py-1.5 transition-colors duration-150 motion-reduce:transition-none hover:border-border-strong focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
          <label htmlFor={whenId} className="block text-xs font-semibold leading-4 text-foreground-soft">
            When
          </label>
          <Select value={when} onValueChange={setWhen}>
            <SelectTrigger
              id={whenId}
              className="h-11 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0"
            >
              <SelectValue placeholder="Any time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="this-week">This week</SelectItem>
              <SelectItem value="this-weekend">This weekend</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 md:col-span-2 lg:col-span-1">
          <Button
            type="button"
            onClick={handleNearMe}
            variant="outline"
            disabled={isLocating}
            className="h-full min-h-12 px-3.5"
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Navigation className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{isLocating ? "Locating…" : "Near me"}</span>
          </Button>
          <Button
            type="button"
            onClick={handleSearch}
            className="h-full min-h-12 px-6 font-semibold"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border bg-card px-4 text-left shadow-sm outline-none transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:bg-surface-1"
            >
              <Search className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-5 text-foreground">
                  Find a court
                </span>
                <span className="block truncate text-xs leading-4 text-muted-foreground">
                  Location, sport, and time
                </span>
              </span>
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[90dvh] gap-0 overflow-y-auto rounded-t-2xl border-border bg-card p-0 pb-[max(1rem,env(safe-area-inset-bottom))] data-[state=closed]:!duration-150 data-[state=open]:!duration-200 motion-reduce:data-[state=closed]:!animate-none motion-reduce:data-[state=open]:!animate-none [&>button]:right-3 [&>button]:top-3 [&>button]:h-11 [&>button]:w-11 [&>button]:rounded-lg"
          >
            <SheetHeader className="border-b border-border px-5 py-4 pr-16 text-left">
              <SheetTitle>Find a court</SheetTitle>
              <SheetDescription>Choose a location, sport, and preferred time.</SheetDescription>
            </SheetHeader>
            <div className="p-4">{renderFormBody("hero-mobile")}</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden rounded-xl border border-border bg-card p-2 shadow-sm md:block">
        {renderFormBody("hero-desktop")}
      </div>
    </>
  );
};

export default HeroSearch;
