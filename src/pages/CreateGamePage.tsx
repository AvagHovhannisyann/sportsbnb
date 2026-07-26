import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="container py-16 text-center" role="status" aria-label="Loading the game form">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8 max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div>
              <h1 className="page-title">Create a Game</h1>
              <p className="text-muted-foreground">Find players for your next match</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Game Details */}
            <Card>
              <CardHeader>
                <CardTitle as="h2">Game Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Game Title *</Label>
                  <Input
                    id="title"
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

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sport *</Label>
                    <Select
                      value={formData.sport}
                      onValueChange={(value) => setFormData({ ...formData, sport: value })}
                    >
                      <SelectTrigger aria-label="Sport">
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
                    <Label>Skill Level</Label>
                    <Select
                      value={formData.skillLevel}
                      onValueChange={(value) => setFormData({ ...formData, skillLevel: value })}
                    >
                      <SelectTrigger aria-label="Skill level">
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
              </CardContent>
            </Card>

            {/* Play Mode */}
            {allTeams.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Play Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, playMode: "individual", teamId: "" })}
                      className={`p-4 rounded-lg border text-center transition-colors ${
                        formData.playMode === "individual"
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground hover:border-muted-foreground/50"
                      }`}
                    >
                      <p className="font-medium">Individual</p>
                      <p className="text-xs mt-1">Play as yourself</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, playMode: "team" })}
                      className={`p-4 rounded-lg border text-center transition-colors ${
                        formData.playMode === "team"
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground hover:border-muted-foreground/50"
                      }`}
                    >
                      <p className="font-medium">As Team</p>
                      <p className="text-xs mt-1">Play with your team</p>
                    </button>
                  </div>
                  {formData.playMode === "team" && (
                    <div className="space-y-2">
                      <Label>Select Team *</Label>
                      <Select
                        value={formData.teamId}
                        onValueChange={(value) => setFormData({ ...formData, teamId: value })}
                      >
                        <SelectTrigger aria-label="Team">
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
                </CardContent>
              </Card>
            )}

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {venues.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select a Venue (optional)</Label>
                    <Select value={formData.venueId} onValueChange={handleVenueSelect}>
                      <SelectTrigger aria-label="Venue">
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
                  <LocationAutocomplete
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
                  <p className="text-xs text-muted-foreground">
                    Start typing and select from the suggestions
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Select
                      value={formData.gameDate}
                      onValueChange={(value) => setFormData({ ...formData, gameDate: value })}
                    >
                      <SelectTrigger aria-label="Date">
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
                    <Label>Time *</Label>
                    <Select
                      value={formData.gameTime}
                      onValueChange={(value) => setFormData({ ...formData, gameTime: value })}
                    >
                      <SelectTrigger aria-label="Time">
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
                  <Label>Duration</Label>
                  <Select
                    value={formData.durationHours}
                    onValueChange={(value) => setFormData({ ...formData, durationHours: value })}
                  >
                    <SelectTrigger aria-label="Duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="3">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Players & Cost */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Players & Cost
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Players</Label>
                    <Select
                      value={formData.maxPlayers}
                      onValueChange={(value) => setFormData({ ...formData, maxPlayers: value })}
                    >
                      <SelectTrigger aria-label="Max players">
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
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createGame.isPending} className="flex-1">
                {createGame.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
