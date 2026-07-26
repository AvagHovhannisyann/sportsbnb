import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SPORTS = ["All", "Football", "Tennis", "Basketball", "Swimming"] as const;

interface NearbyPlayer {
  name: string;
  sport: string;
  initials: string;
  level: string;
  city: string;
}

const NearbyPlayers = () => {
  const [state, setState] = useState<"idle" | "loading" | "loaded">("idle");
  const [selectedSport, setSelectedSport] = useState<string>("All");
  const [players, setPlayers] = useState<NearbyPlayer[]>([]);

  const fetchPlayers = async (sport: string) => {
    setState("loading");
    try {
      const query = supabase
        .from("profiles_public")
        .select("full_name, preferred_sports, skill_level, city")
        .eq("user_type", "player")
        .eq("onboarding_completed", true)
        .limit(20);

      const { data, error } = await query;
      if (error) throw error;

      const mapped: NearbyPlayer[] = (data || [])
        .filter((p) => {
          if (sport === "All") return true;
          return p.preferred_sports?.some(
            (s: string) => s.toLowerCase() === sport.toLowerCase()
          );
        })
        .map((p) => {
          const name = p.full_name || "Player";
          const initials = name
            .split(" ")
            .map((w: string) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          const sportLabel =
            sport !== "All"
              ? sport
              : p.preferred_sports?.[0] || "Multi-sport";
          return {
            name,
            sport: sportLabel,
            initials,
            level: p.skill_level || "Beginner",
            city: p.city || "",
          };
        });

      setPlayers(mapped);
    } catch {
      setPlayers([]);
    }
    setState("loaded");
  };

  const handleFind = (sport?: string) => {
    const sportToUse = sport ?? selectedSport;
    fetchPlayers(sportToUse);
  };

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
    if (state === "loaded") {
      handleFind(sport);
    }
  };

  return (
    <div className="text-center">
      {state === "idle" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SPORTS.map((sport) => (
              <Badge
                key={sport}
                variant={selectedSport === sport ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 text-sm rounded-full transition-colors"
                onClick={() => setSelectedSport(sport)}
              >
                {sport}
              </Badge>
            ))}
          </div>
          <Button
            size="lg"
            variant="outline"
            className="h-14 px-10 text-base rounded-xl gap-2"
            onClick={() => handleFind()}
          >
            <Users className="h-5 w-5" />
            Find people nearby
          </Button>
        </div>
      )}

      {state === "loading" && (
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">
              Searching for {selectedSport === "All" ? "players" : selectedSport + " players"}...
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 bg-card border border-border/50 rounded-2xl p-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state === "loaded" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
            {SPORTS.map((sport) => (
              <Badge
                key={sport}
                variant={selectedSport === sport ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 text-sm rounded-full transition-colors"
                onClick={() => handleSportChange(sport)}
              >
                {sport}
              </Badge>
            ))}
          </div>
          {players.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-primary tracking-wide uppercase">
                {players.length} {selectedSport === "All" ? "players" : selectedSport + " players"} found
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-5xl mx-auto">
                {players.map((player, idx) => (
                  <div
                    key={player.name + idx}
                    className="flex items-center gap-4 bg-card border border-border/50 rounded-2xl p-4 hover:shadow-md transition-shadow"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {player.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-foreground truncate">{player.name}</p>
                      <p className="text-sm text-muted-foreground">{player.sport} · <span className="capitalize">{player.level}</span></p>
                      {player.city && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {player.city}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No players found. Be the first to join!</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState("idle")}
            className="text-muted-foreground"
          >
            Hide
          </Button>
        </div>
      )}
    </div>
  );
};

export default NearbyPlayers;
