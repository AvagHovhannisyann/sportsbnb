import { useState } from "react";
import SEOHead, { createSportsEventJsonLd, createBreadcrumbJsonLd } from "@/components/seo/SEOHead";
import { venueLocalToInstant, addHoursToInstant } from "@/lib/venueTime";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  MapPin, Calendar, Clock, ArrowLeft, Loader2, 
  Share2, Banknote, AlertTriangle, CreditCard, Check, X, UserPlus, CalendarX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { LIVE_PAYMENT_PROVIDER, submitProviderForm } from "@/features/booking/hooks/useBookingFlow";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatTimeRange } from "@/lib/time";
import { formatPrice } from "@/lib/pricing";
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
        <div className="container py-8 md:py-10" role="status" aria-label="Loading the game">
          <Skeleton className="mb-6 h-11 w-32" />
          <div className="mb-8 max-w-2xl space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-11 w-48" />
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-72 w-full" />
          </div>
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
        // This used to pin the provider to "ameria" — a hardcode that outlived
        // the rail it named. The live provider is declared once, in
        // useBookingFlow, so this call site cannot drift from checkout's.
        const { data, error } = await supabase.functions.invoke("payments-init", {
          body: {
            gameId: game.id,
            provider: import.meta.env.DEV ? "mock" : LIVE_PAYMENT_PROVIDER,
          },
        });

        if (error) throw new Error(error.message);

        // The live rail redirects and sends both of these back null; the branch
        // is kept for a form-post provider, and guards on both being present so
        // a null action never reaches document.
        if (data.formAction && data.formFields) {
          submitProviderForm(data.formAction, data.formFields as Record<string, string>);
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

  // Venue-local wall clock to a real instant, so the Event carries the hour the
  // game actually starts rather than the browser's reading of it.
  const startsAt = venueLocalToInstant(game.game_date, game.game_time);
  const endsAt = startsAt ? addHoursToInstant(startsAt, game.duration_hours) : null;

  return (
    <Layout>
      {/* This page had no SEOHead, so every game shared the route table's
          "Game Details" — one title across every game on the platform. */}
      <SEOHead
        title={`${game.title} — ${game.sport} in ${game.location}`}
        description={
          game.description ||
          `Join this ${game.sport.toLowerCase()} game at ${game.location}. ${
            isCancelled ? "This game has been cancelled." : `${Math.max(0, spotsLeft)} of ${game.max_players} places left.`
          }`
        }
        canonical={`/game/${id}`}
        type="article"
        jsonLd={[
          createSportsEventJsonLd({
            id: id!,
            title: game.title,
            sport: game.sport,
            description: game.description,
            location: game.location,
            startsAt,
            endsAt,
            pricePerPlayer: game.price_per_player ?? 0,
            maxPlayers: game.max_players,
            spotsLeft,
            isCancelled,
            latitude: game.latitude,
            longitude: game.longitude,
          }),
          createBreadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Games", url: "/games" },
            { name: game.title, url: `/game/${id}` },
          ]),
        ]}
      />
      <div className="min-h-screen bg-background">
        {/* Back Navigation */}
        <div className="container py-3 md:py-4">
          <Link
            to="/games"
            className="focus-ring inline-flex min-h-11 items-center rounded-lg pr-3 text-sm font-medium text-muted-foreground transition-colors duration-150 motion-reduce:transition-none hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to games
          </Link>
        </div>

        <div className="container pb-16">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
            {/* Main Content */}
            <div className="contents lg:block lg:space-y-6">
              {/* Header */}
              <header className="order-1">
                {isCancelled && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="status">
                    <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
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
                
                <h1 className="mb-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  {game.title}
                </h1>
                
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={game.host?.avatar_url || undefined}
                      alt={game.host?.full_name || "Game host"}
                    />
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
              </header>

              {/* Game Info */}
              <section className="order-3 overflow-hidden rounded-xl border border-border bg-card">
                <h2 className="sr-only">Game details</h2>
                <dl className="grid sm:grid-cols-2">
                  <div className="flex min-w-0 items-start gap-3 border-b border-border p-4 sm:border-r sm:p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Calendar className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <dt className="text-sm text-muted-foreground">Date</dt>
                      <dd className="font-medium leading-snug text-foreground">
                        {format(new Date(game.game_date), "EEEE, MMMM d, yyyy")}
                      </dd>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-start gap-3 border-b border-border p-4 sm:p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Clock className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <dt className="text-sm text-muted-foreground">Time</dt>
                      <dd className="font-medium leading-snug text-foreground">
                        {formatTimeRange(game.game_time, game.duration_hours)}
                      </dd>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-start gap-3 border-b border-border p-4 sm:border-b-0 sm:border-r sm:p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <dt className="text-sm text-muted-foreground">Location</dt>
                      <dd className="font-medium leading-snug text-foreground">{game.location}</dd>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-start gap-3 p-4 sm:p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Banknote className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <dt className="text-sm text-muted-foreground">Cost</dt>
                      <dd className="font-medium leading-snug text-foreground">
                        {game.price_per_player > 0 ? (
                          <Price
                            amount={game.price_per_player}
                            suffix="/ player"
                            className="text-base font-semibold text-foreground"
                          />
                        ) : (
                          <span className="text-success">Free</span>
                        )}
                      </dd>
                    </div>
                  </div>
                </dl>
              </section>

              {/* Description */}
              {game.description && (
                <section className="panel order-4">
                  <h2 className="section-title">About this game</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap">{game.description}</p>
                </section>
              )}

              {/* Pending Requests - Only visible to host */}
              {isHost && pendingParticipants.length > 0 && (
                <section className="panel order-5">
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
                            className="flex flex-col gap-4 rounded-lg border border-border bg-surface-1 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage
                                  src={participant.profile?.avatar_url || undefined}
                                  alt={participant.profile?.full_name || "Player"}
                                />
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {participant.profile?.full_name || "Anonymous"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Requested {format(new Date(participant.joined_at), "MMM d, h:mm a")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:shrink-0">
                              <Button 
                                size="icon"
                                variant="outline"
                                onClick={() => handleReject(participant)}
                                disabled={rejectParticipant.isPending}
                                aria-label={`Decline ${participant.profile?.full_name || "player"}'s request`}
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button 
                                className="flex-1 sm:flex-none"
                                onClick={() => handleApprove(participant)}
                                disabled={approveParticipant.isPending || isFull}
                              >
                                <Check className="h-4 w-4" aria-hidden="true" />
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
              <section className="panel order-6">
                <h2 className="section-title">
                  Players ({game.participant_count || 0}/{game.max_players})
                </h2>

                {game.participants && game.participants.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {game.participants.map((participant) => {
                      const initials = participant.profile?.full_name
                        ?.split(" ")
                        .map(n => n[0])
                        .join("")
                        .toUpperCase() || "U";
                      
                      return (
                        <div 
                          key={participant.id}
                          className="flex min-w-0 items-center gap-3 rounded-lg bg-surface-1 p-3"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={participant.profile?.avatar_url || undefined}
                              alt={participant.profile?.full_name || "Player"}
                            />
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

            {/* Primary action follows the title on mobile and stays visible on desktop. */}
            <aside className="order-2 self-start lg:order-none lg:sticky lg:top-24">
              <Card className="shadow-sm">
                <CardHeader className="p-5 pb-3">
                  <CardTitle as="h2" className="flex items-center justify-between gap-3 text-lg">
                    {/* The panel is headed by what it does *now*. It said
                        "Join Game" unconditionally, so a player already in the
                        game read "Join Game" above a "Leave Game" button, and
                        the host read it above their own management actions. */}
                    <span>
                      {isHost
                        ? "Your game"
                        : isParticipant
                          ? "You're in"
                          : isPendingParticipant
                            ? "Request pending"
                            : "Join game"}
                    </span>
                    <Badge variant={isCancelled || isFull ? "secondary" : "default"}>
                      {isCancelled
                        ? "Cancelled"
                        : isFull
                          ? "Full"
                          : `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-5 pt-0">
                  <dl className="space-y-2 rounded-lg bg-surface-1 p-3.5">
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">Players</dt>
                      <dd className="stat-numeral font-medium">{game.participant_count || 0} / {game.max_players}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">Cost</dt>
                      <dd className="font-medium">
                        {game.price_per_player > 0 ? (
                          <Price amount={game.price_per_player} className="text-sm font-semibold text-foreground" />
                        ) : (
                          <span className="text-success">Free</span>
                        )}
                      </dd>
                    </div>
                    {pendingParticipants.length > 0 && isHost && (
                      <div className="flex justify-between text-sm">
                        <dt className="text-muted-foreground">Pending requests</dt>
                        <dd><Badge variant="secondary">{pendingParticipants.length}</Badge></dd>
                      </div>
                    )}
                  </dl>

                  <Separator />

                  {isCancelled ? (
                    <Button className="w-full" disabled>
                      Game Cancelled
                    </Button>
                  ) : isHost ? (
                    <div className="space-y-2">
                      {/* "Edit Game" used to be here, linking to
                          /game/:id/edit — a route that has never existed, so
                          the host's most prominent control served the 404
                          page. Removed rather than built: unlike a team, a
                          game has people who joined on its stated time, price
                          and player count, and changing those under them needs
                          a rule about who is told and what happens to anyone
                          who no longer agrees. That is a product decision, not
                          a missing page — see §5 of docs/handover.md. Cancel,
                          below, is the honest recourse in the meantime. */}
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
                              className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
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
                          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                          Leaving...
                        </>
                      ) : (
                        "Leave Game"
                      )}
                    </Button>
                  ) : isPendingParticipant ? (
                    <div className="space-y-2">
                      <Button className="w-full" disabled>
                        <Clock className="h-4 w-4" aria-hidden="true" />
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
                          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                          {isProcessingPayment ? "Processing..." : "Requesting..."}
                        </>
                      ) : isFull ? (
                        "Game Full"
                      ) : isPaidGame ? (
                        <>
                          <CreditCard className="h-4 w-4" aria-hidden="true" />
                          Pay & Join ({formatPrice(game.price_per_player)})
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
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                    Share Game
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GameDetailsPage;
