import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  MapPin, Calendar, Clock, ArrowLeft, Loader2, 
  Share2, Banknote, AlertTriangle, CreditCard, Check, X, UserPlus, CalendarX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Layout from "@/components/layout/Layout";
import { StatusPanel, ErrorPanel } from "@/components/common/StatusPanel";
import { useAuth } from "@/hooks/useAuth";
import { 
  useGameById, 
  useRequestToJoinGame,
  useLeaveGame, 
  useCancelGame,
  useApproveParticipant,
  useRejectParticipant,
  type GameParticipant
} from "@/hooks/useGames";
import { ChatButton } from "@/components/chat/ChatButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatTimeRange } from "@/lib/time";
import { skillLevelChip, skillLevelLabel } from "@/lib/chips";

const GameDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  const {
    data: game,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGameById(id);
  const requestToJoin = useRequestToJoinGame();
  const leaveGame = useLeaveGame();
  const cancelGame = useCancelGame();
  const approveParticipant = useApproveParticipant();
  const rejectParticipant = useRejectParticipant();

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </Layout>
    );
  }

  // A failed request is not evidence that the game is gone.
  if (isError) {
    return (
      <Layout>
        <div className="container">
          <ErrorPanel what="this game" onRetry={() => refetch()} isRetrying={isFetching}>
            <Button variant="outline" asChild>
              <Link to="/games">Back to games</Link>
            </Button>
          </ErrorPanel>
        </div>
      </Layout>
    );
  }

  if (!game) {
    return (
      <Layout>
        <div className="container">
          <StatusPanel
            icon={CalendarX}
            title="Game not found"
            description="This game may have been cancelled by its host, or the link is out of date."
          >
            <Button asChild>
              <Link to="/games">Browse games</Link>
            </Button>
          </StatusPanel>
        </div>
      </Layout>
    );
  }

  const isHost = user?.id === game.host_id;
  const isParticipant = game.participants?.some(p => p.user_id === user?.id);
  const isPendingParticipant = (game as any).pending_participants?.some((p: GameParticipant) => p.user_id === user?.id);
  const pendingParticipants = (game as any).pending_participants || [];
  const spotsLeft = game.max_players - (game.participant_count || 0);
  const isFull = spotsLeft <= 0;
  const isCancelled = game.status === "cancelled";
  const isPaidGame = game.price_per_player > 0;

  const handleRequestToJoin = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    // For paid games, start a payment (spot is confirmed after payment)
    if (isPaidGame) {
      setIsProcessingPayment(true);
      try {
        const { data, error } = await supabase.functions.invoke("payments-init", {
          body: { gameId: game.id, provider: import.meta.env.DEV ? "mock" : "ameria" },
        });

        if (error) throw new Error(error.message);

        if (data.formAction && data.formFields) {
          // Form-post providers (Idram)
          const form = document.createElement("form");
          form.method = "POST";
          form.action = data.formAction;
          form.style.display = "none";
          for (const [name, value] of Object.entries(data.formFields as Record<string, string>)) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = name;
            input.value = value;
            form.appendChild(input);
          }
          document.body.appendChild(form);
          form.submit();
          return;
        }

        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          throw new Error("No payment URL received");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to process payment";
        toast.error(message);
        setIsProcessingPayment(false);
      }
      return;
    }

    // For free games, send join request
    try {
      await requestToJoin.mutateAsync({ gameId: game.id, userId: user.id });
      toast.success("Join request sent! Waiting for host approval.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send join request";
      toast.error(message);
    }
  };

  const handleLeave = async () => {
    if (!user) return;

    try {
      await leaveGame.mutateAsync({ gameId: game.id, userId: user.id });
      toast.success("You've left the game");
    } catch (error) {
      toast.error("Failed to leave game");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelGame.mutateAsync(game.id);
      toast.success("Game cancelled");
      navigate("/games");
    } catch (error) {
      toast.error("Failed to cancel game");
    }
  };

  const handleApprove = async (participant: GameParticipant) => {
    try {
      await approveParticipant.mutateAsync({ 
        participantId: participant.id, 
        gameId: game.id, 
        userId: participant.user_id 
      });
      toast.success(`${participant.profile?.full_name || "Player"} approved!`);
    } catch (error) {
      toast.error("Failed to approve player");
    }
  };

  const handleReject = async (participant: GameParticipant) => {
    try {
      await rejectParticipant.mutateAsync({ 
        participantId: participant.id, 
        gameId: game.id, 
        userId: participant.user_id 
      });
      toast.success("Request declined");
    } catch (error) {
      toast.error("Failed to decline request");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const hostInitials = game.host?.full_name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase() || "H";

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        {/* Back Navigation */}
        <div className="container py-4">
          <Link
            to="/games"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to games
          </Link>
        </div>

        <div className="container pb-16">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div>
                {isCancelled && (
                  <div className="flex items-center gap-2 text-destructive mb-4">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">This game has been cancelled</span>
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="secondary">{game.sport}</Badge>
                  <Badge className={`capitalize ${skillLevelChip(game.skill_level)}`}>
                    {skillLevelLabel(game.skill_level)}
                  </Badge>
                  {isFull && !isCancelled && (
                    <Badge variant="outline">Full</Badge>
                  )}
                </div>
                
                <h1 className="text-3xl font-bold text-foreground mb-4">{game.title}</h1>
                
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={game.host?.avatar_url || undefined} />
                    <AvatarFallback>{hostInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-muted-foreground">Hosted by</p>
                    <p className="font-medium text-foreground">
                      {game.host?.full_name || "Anonymous"}
                      {isHost && " (You)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Game Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium text-foreground">
                          {format(new Date(game.game_date), "EEEE, MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Time</p>
                        <p className="font-medium text-foreground">
                          {formatTimeRange(game.game_time, game.duration_hours)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium text-foreground">{game.location}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Banknote className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cost</p>
                        <p className="font-medium text-foreground">
                          {game.price_per_player > 0 ? `֏${game.price_per_player.toLocaleString()} per player` : "Free"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Description */}
              {game.description && (
                <section className="panel">
                  <h2 className="section-title">About this game</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap">{game.description}</p>
                </section>
              )}

              {/* Pending Requests - Only visible to host */}
              {isHost && pendingParticipants.length > 0 && (
                <section className="panel">
                  <h2 className="section-title flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Join Requests ({pendingParticipants.length})
                  </h2>
                    <div className="space-y-3">
                      {pendingParticipants.map((participant: GameParticipant) => {
                        const initials = participant.profile?.full_name
                          ?.split(" ")
                          .map(n => n[0])
                          .join("")
                          .toUpperCase() || "U";
                        
                        return (
                          <div 
                            key={participant.id}
                            className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={participant.profile?.avatar_url || undefined} />
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">
                                  {participant.profile?.full_name || "Anonymous"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Requested {format(new Date(participant.joined_at), "MMM d, h:mm a")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleReject(participant)}
                                disabled={rejectParticipant.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleApprove(participant)}
                                disabled={approveParticipant.isPending || isFull}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                </section>
              )}

              {/* Participants */}
              <section className="panel">
                <h2 className="section-title">
                  Players ({game.participant_count || 0}/{game.max_players})
                </h2>

                {game.participants && game.participants.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {game.participants.map((participant) => {
                      const initials = participant.profile?.full_name
                        ?.split(" ")
                        .map(n => n[0])
                        .join("")
                        .toUpperCase() || "U";
                      
                      return (
                        <div 
                          key={participant.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={participant.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground truncate">
                            {participant.profile?.full_name || "Anonymous"}
                            {participant.user_id === user?.id && " (You)"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No players have joined yet. Be the first!</p>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {/* The panel is headed by what it does *now*. It said
                        "Join Game" unconditionally, so a player already in the
                        game read "Join Game" above a "Leave Game" button, and
                        the host read it above their own management actions. */}
                    <span>{isHost ? "Your game" : isParticipant ? "You're in" : "Join Game"}</span>
                    <Badge variant={isFull ? "secondary" : "default"}>
                      {spotsLeft} spots left
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Players</span>
                      <span className="font-medium">{game.participant_count || 0} / {game.max_players}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cost</span>
                      <span className="font-medium">
                        {game.price_per_player > 0 ? `֏${game.price_per_player.toLocaleString()}` : "Free"}
                      </span>
                    </div>
                    {pendingParticipants.length > 0 && isHost && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pending requests</span>
                        <Badge variant="secondary">{pendingParticipants.length}</Badge>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {isCancelled ? (
                    <Button className="w-full" disabled>
                      Game Cancelled
                    </Button>
                  ) : isHost ? (
                    <div className="space-y-2">
                      <Button asChild variant="outline" className="w-full">
                        <Link to={`/game/${game.id}/edit`}>Edit Game</Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full">
                            Cancel Game
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Game</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel this game? All participants will be notified.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Game</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleCancel}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Cancel Game
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : isParticipant ? (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleLeave}
                      disabled={leaveGame.isPending}
                    >
                      {leaveGame.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Leaving...
                        </>
                      ) : (
                        "Leave Game"
                      )}
                    </Button>
                  ) : isPendingParticipant ? (
                    <div className="space-y-2">
                      <Button className="w-full" disabled>
                        <Clock className="h-4 w-4 mr-2" />
                        Awaiting Approval
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full text-muted-foreground" 
                        onClick={handleLeave}
                        disabled={leaveGame.isPending}
                      >
                        Cancel Request
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      className="w-full" 
                      onClick={handleRequestToJoin}
                      disabled={isFull || requestToJoin.isPending || isProcessingPayment}
                    >
                      {requestToJoin.isPending || isProcessingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isProcessingPayment ? "Processing..." : "Requesting..."}
                        </>
                      ) : isFull ? (
                        "Game Full"
                      ) : isPaidGame ? (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay & Join (֏{game.price_per_player.toLocaleString()})
                        </>
                      ) : (
                        "Request to Join"
                      )}
                    </Button>
                  )}

                  {/* Chat button - visible to host and participants */}
                  {(isHost || isParticipant) && !isCancelled && (
                    <ChatButton
                      type="game"
                      referenceId={game.id}
                      title={`${game.title} - Game Chat`}
                      userRole={isHost ? "host" : "player"}
                      variant="outline"
                      className="w-full"
                    />
                  )}

                  <Button variant="ghost" className="w-full" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Game
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GameDetailsPage;