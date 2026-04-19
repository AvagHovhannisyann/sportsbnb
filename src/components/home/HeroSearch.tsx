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
import { sportTypes } from "@/data/constants";
import { toast } from "sonner";

const HeroSearch = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [sport, setSport] = useState("");
  const [when, setWhen] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (sport && sport !== "any") params.set("sport", sport);
    if (location) params.set("location", location);
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
        navigate(`/venues?${params.toString()}`);
      },
      () => {
        setIsLocating(false);
        toast.error("Unable to get your location. Please enable location services.");
      }
    );
  };

  return (
    <div className="rounded-2xl bg-card shadow-2xl border border-border p-1.5 md:p-2 ring-1 ring-foreground/5">
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
            <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground block">
              Sport
            </label>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-full border-0 p-0 h-auto shadow-none bg-transparent text-sm font-medium focus:ring-0">
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
            <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground block">
              When
            </label>
            <Select value={when} onValueChange={setWhen}>
              <SelectTrigger className="w-full border-0 p-0 h-auto shadow-none bg-transparent text-sm font-medium focus:ring-0">
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
    </div>
  );
};

export default HeroSearch;
