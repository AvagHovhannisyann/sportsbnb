import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Calendar, Navigation } from "lucide-react";
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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { sportTypes } from "@/data/constants";
import { toast } from "sonner";

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
    if (location) params.set("location", location);
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
      }
    );
  };

  // Shared form body — used inside the mobile sheet AND inline on desktop
  const FormBody = (
    <div className="flex flex-col md:flex-row md:items-stretch gap-1 md:gap-0">
      {/* Location */}
      <div className="flex-1 flex items-center gap-3 px-4 py-3 md:py-2 md:border-r border-border">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground block">
            Location
          </label>
          <input
            type="text"
            placeholder="City or neighborhood"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 text-sm font-medium focus:outline-none"
          />
        </div>
      </div>

      {/* Sport */}
      <div className="flex-1 flex items-center gap-3 px-4 py-3 md:py-2 md:border-r border-border">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          {/* The visible label had no htmlFor, so it labelled nothing and
              the control announced only its current value. Associating it is
              better than an aria-label: the name a screen reader reads then
              matches the word on screen. */}
          <label
            htmlFor="hero-sport"
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground block"
          >
            Sport
          </label>
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger id="hero-sport" className="w-full border-0 p-0 h-auto shadow-none bg-transparent text-sm font-medium focus:ring-0">
              <SelectValue placeholder="Any sport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any sport</SelectItem>
              {sportTypes.map((s) => (
                <SelectItem key={s} value={s.toLowerCase()}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* When */}
      <div className="flex-1 flex items-center gap-3 px-4 py-3 md:py-2 md:border-r border-border">
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          {/* The visible label had no htmlFor, so it labelled nothing and
              the control announced only its current value. Associating it is
              better than an aria-label: the name a screen reader reads then
              matches the word on screen. */}
          <label
            htmlFor="hero-when"
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground block"
          >
            When
          </label>
          <Select value={when} onValueChange={setWhen}>
            <SelectTrigger id="hero-when" className="w-full border-0 p-0 h-auto shadow-none bg-transparent text-sm font-medium focus:ring-0">
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
      </div>

      {/* Buttons */}
      <div className="flex gap-2 p-1.5 md:p-1">
        <Button
          onClick={handleNearMe}
          variant="outline"
          disabled={isLocating}
          className="h-12 px-4 rounded-xl"
        >
          <Navigation className={`h-4 w-4 ${isLocating ? "animate-pulse" : ""}`} />
          <span className="hidden sm:inline">{isLocating ? "Locating…" : "Near me"}</span>
        </Button>
        <Button
          onClick={handleSearch}
          className="flex-1 md:flex-none h-12 px-7 rounded-xl font-semibold shadow-md hover:shadow-lg"
        >
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* MOBILE — single tap target that opens a sheet (Airbnb-style) */}
      <div className="md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center gap-3 rounded-2xl bg-card shadow-2xl border border-border ring-1 ring-foreground/5 px-5 py-4 text-left hover:border-border-strong transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md">
                <Search className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  Where do you want to play?
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Any sport · Any time · Near you
                </p>
              </div>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl p-0 max-h-[90vh] overflow-y-auto">
            <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
              <SheetTitle className="text-left">Find a court</SheetTitle>
            </SheetHeader>
            <div className="p-3">{FormBody}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* DESKTOP — full inline bar */}
      <div className="hidden md:block rounded-2xl bg-card shadow-2xl border border-border p-1.5 md:p-2 ring-1 ring-foreground/5">
        {FormBody}
      </div>
    </>
  );
};

export default HeroSearch;
