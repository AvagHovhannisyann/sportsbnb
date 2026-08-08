import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useCreateGame } from "@/hooks/useGames";
import { useVenues } from "@/hooks/useVenues";
import { useUserTeams } from "@/hooks/useTeams";
import { sportTypes, timeSlots } from "@/data/constants";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { LocationAutocomplete, LocationPlace } from "@/components/location/LocationAutocomplete";

const CreateGamePage = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: venues = [] } = useVenues();
  const { data: userTeams } = useUserTeams();
  const createGame = useCreateGame();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    sport: "",
    skillLevel: "all",
    location: "",
    venueId: "",
    gameDate: "",
    gameTime: "",
    durationHours: "1",
    maxPlayers: "10",
    pricePerPlayer: "0",
    latitude: null as number | null,
    longitude: null as number | null,
    playMode: "individual",
    teamId: "",
  });

  // All teams the user has
  const allTeams = [...(userTeams?.owned || []), ...(userTeams?.member || [])];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Generate date options for the next 30 days
  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      value: format(date, "yyyy-MM-dd"),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(date, "EEE, MMM d"),
    };
  });

  const handleVenueSelect = (venueId: string) => {
    const venue = venues.find(v => v.id === venueId);
    if (venue) {
      setFormData(prev => ({
        ...prev,
        venueId,
        location: venue.address || venue.city,
        latitude: venue.latitude || null,
        longitude: venue.longitude || null,
      }));
    }
  };

  const handleLocationSelect = (place: LocationPlace) => {
    setFormData(prev => ({
      ...prev,
      location: place.formattedAddress,
      latitude: place.latitude,
      longitude: place.longitude,
      venueId: "", // Clear venue selection when manually selecting location
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!formData.title.trim() || !formData.sport || !formData.gameDate || !formData.gameTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.location.trim()) {
      toast.error("Please enter a location or select a venue");
      return;
    }

    try {
      await createGame.mutateAsync({
        host_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        sport: formData.sport,
        skill_level: formData.skillLevel,
        location: formData.location.trim(),
        venue_id: formData.venueId || undefined,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
        game_date: formData.gameDate,
        game_time: formData.gameTime,
        duration_hours: parseInt(formData.durationHours),
        max_players: parseInt(formData.maxPlayers),
        price_per_player: parseFloat(formData.pricePerPlayer) || 0,
        play_mode: formData.playMode as "individual" | "team",
        team_id: formData.teamId || undefined,
      });

      toast.success("Game created successfully!");
      navigate("/games");
    } catch (error) {
      console.error("Error creating game:", error);
      toast.error("Failed to create game");
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container max-w-3xl py-16 text-center" role="status" aria-label="Loading the game form">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">Preparing the game form…</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container max-w-3xl py-8 md:py-10">
          {/* Header */}
          <div className="mb-8 flex items-start gap-3">
            <Button aria-label="Back" variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div className="pt-0.5">
              <p className="eyebrow mb-2">Host a match</p>
              <h1 className="page-title">Create a Game</h1>
              <p className="max-w-xl text-muted-foreground">
                Set the essentials now. Players will see the time, place, skill level, and cost before requesting to join.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-card shadow-xs"
          >
            {/* Game Details */}
            <section className="border-b border-border p-5 md:p-6" aria-labelledby="game-details-heading">
              <div className="mb-5">
                <h2 id="game-details-heading" className="text-xl font-semibold text-foreground">Game details</h2>
                <p className="mt-1 text-sm text-muted-foreground">Give players a clear idea of what they are joining.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Game Title *</Label>
                  <Input
                    id="title"
                    aria-required="true"
                    placeholder="e.g., Sunday Football Match"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell players about the game, rules, what to bring..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-24"
                    maxLength={500}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sport">Sport *</Label>
                    <Select
                      value={formData.sport}
                      onValueChange={(value) => setFormData({ ...formData, sport: value })}
                    >
                      <SelectTrigger id="sport" aria-label="Sport" aria-required="true">
                        <SelectValue placeholder="Select sport" />
                      </SelectTrigger>
                      <SelectContent>
                        {sportTypes.map((sport) => (
                          <SelectItem key={sport} value={sport}>
                            {sport}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skill-level">Skill Level</Label>
                    <Select
                      value={formData.skillLevel}
                      onValueChange={(value) => setFormData({ ...formData, skillLevel: value })}
                    >
                      <SelectTrigger id="skill-level" aria-label="Skill level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All levels welcome</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </section>

            {/* Play Mode */}
            {allTeams.length > 0 && (
              <section className="border-b border-border p-5 md:p-6" aria-labelledby="play-mode-heading">
                <div className="mb-5">
                  <h2 id="play-mode-heading" className="flex items-center gap-2 text-xl font-semibold text-foreground">
                    <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                    Play mode
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">Choose who this match represents.</p>
                </div>
                <div className="space-y-4">
                  <RadioGroup
                    aria-label="Play mode"
                    value={formData.playMode}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        playMode: value,
                        teamId: value === "individual" ? "" : formData.teamId,
                      })
                    }
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <div className="relative">
                      <RadioGroupItem value="individual" id="play-mode-individual" className="peer sr-only" />
                      <Label
                        htmlFor="play-mode-individual"
                        className="flex min-h-[5rem] cursor-pointer flex-col justify-center rounded-lg border border-border-interactive bg-background p-4 text-left transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none hover:bg-surface-1 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary-soft peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
                      >
                        <span className="font-semibold text-foreground">Individual</span>
                        <span className="mt-1 text-sm font-normal text-muted-foreground">Play as yourself</span>
                      </Label>
                    </div>
                    <div className="relative">
                      <RadioGroupItem value="team" id="play-mode-team" className="peer sr-only" />
                      <Label
                        htmlFor="play-mode-team"
                        className="flex min-h-[5rem] cursor-pointer flex-col justify-center rounded-lg border border-border-interactive bg-background p-4 text-left transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none hover:bg-surface-1 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary-soft peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
                      >
                        <span className="font-semibold text-foreground">As a team</span>
                        <span className="mt-1 text-sm font-normal text-muted-foreground">Represent one of your teams</span>
                      </Label>
                    </div>
                  </RadioGroup>
                  {formData.playMode === "team" && (
                    <div className="space-y-2">
                      <Label htmlFor="team">Select Team *</Label>
                      <Select
                        value={formData.teamId}
                        onValueChange={(value) => setFormData({ ...formData, teamId: value })}
                      >
                        <SelectTrigger id="team" aria-label="Team" aria-required="true">
                          <SelectValue placeholder="Choose your team" />
                        </SelectTrigger>
                        <SelectContent>
                          {allTeams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name} ({team.sport})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Location */}
            <section className="border-b border-border p-5 md:p-6" aria-labelledby="game-location-heading">
              <div className="mb-5">
                <h2 id="game-location-heading" className="flex items-center gap-2 text-xl font-semibold text-foreground">
                  <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                  Location
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Use a listed venue or choose another place.</p>
              </div>
              <div className="space-y-4">
                {venues.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="venue">Select a Venue (optional)</Label>
                    <Select value={formData.venueId} onValueChange={handleVenueSelect}>
                      <SelectTrigger id="venue" aria-label="Venue">
                        <SelectValue placeholder="Choose from listed venues" />
                      </SelectTrigger>
                      <SelectContent>
                        {venues.map((venue) => (
                          <SelectItem key={venue.id} value={venue.id}>
                            {venue.name} - {venue.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="location">Location Address *</Label>
                  {/* The id has to reach the inner input. Without it this label
                      pointed at nothing and the field was named by its
                      placeholder — a different string from the one printed
                      beside it, which is WCAG 2.5.3. */}
                  <LocationAutocomplete
                    id="location"
                    value={formData.location}
                    onSelect={handleLocationSelect}
                    onClear={() => setFormData(prev => ({ 
                      ...prev, 
                      location: "", 
                      latitude: null, 
                      longitude: null 
                    }))}
                    placeholder="Search for a location..."
                  />
                  <p id="location-hint" className="text-xs text-muted-foreground">
                    Start typing and select from the suggestions
                  </p>
                </div>
              </div>
            </section>

            {/* Date & Time */}
            <section className="border-b border-border p-5 md:p-6" aria-labelledby="date-time-heading">
              <div className="mb-5">
                <h2 id="date-time-heading" className="flex items-center gap-2 text-xl font-semibold text-foreground">
                  <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
                  Date and time
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose a start time within the next 30 days.</p>
              </div>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="game-date">Date *</Label>
                    <Select
                      value={formData.gameDate}
                      onValueChange={(value) => setFormData({ ...formData, gameDate: value })}
                    >
                      <SelectTrigger id="game-date" aria-label="Date" aria-required="true">
                        <SelectValue placeholder="Select date" />
                      </SelectTrigger>
                      <SelectContent>
                        {dateOptions.map((date) => (
                          <SelectItem key={date.value} value={date.value}>
                            {date.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="game-time">Time *</Label>
                    <Select
                      value={formData.gameTime}
                      onValueChange={(value) => setFormData({ ...formData, gameTime: value })}
                    >
                      <SelectTrigger id="game-time" aria-label="Time" aria-required="true">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="game-duration">Duration</Label>
                  <Select
                    value={formData.durationHours}
                    onValueChange={(value) => setFormData({ ...formData, durationHours: value })}
                  >
                    <SelectTrigger id="game-duration" aria-label="Duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="3">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Players & Cost */}
            <section className="p-5 md:p-6" aria-labelledby="players-cost-heading">
              <div className="mb-5">
                <h2 id="players-cost-heading" className="flex items-center gap-2 text-xl font-semibold text-foreground">
                  <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                  Players and cost
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Set the roster size and each player's share.</p>
              </div>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="max-players">Max Players</Label>
                    <Select
                      value={formData.maxPlayers}
                      onValueChange={(value) => setFormData({ ...formData, maxPlayers: value })}
                    >
                      <SelectTrigger id="max-players" aria-label="Max players">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 4, 6, 8, 10, 12, 14, 16, 20, 22].map((num) => (
                          <SelectItem key={num} value={String(num)}>
                            {num} players
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Cost per Player (֏)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0 for free"
                      value={formData.pricePerPlayer}
                      onChange={(e) => setFormData({ ...formData, pricePerPlayer: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Submit */}
            <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex gap-3 border-t border-border bg-card/95 p-4 backdrop-blur-sm md:bottom-0 md:justify-end md:p-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1 md:flex-none"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createGame.isPending} className="flex-1 md:min-w-40 md:flex-none">
                {createGame.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Creating...
                  </>
                ) : (
                  "Create Game"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateGamePage;
