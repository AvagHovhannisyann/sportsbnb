import { useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "react-router-dom";
import { MessageCircle, Loader2, ArrowLeft, Gamepad2, MapPin, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Layout from "@/components/layout/Layout";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { OwnerChatView } from "@/components/venue/OwnerChatView";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { formatTimeOfDay } from "@/lib/time";

interface ChatRoomWithDetails {
  room_id: string;
  last_read_at: string | null;
  role: string;
  type: "game" | "booking" | "venue";
  reference_id: string;
  title: string;
  subtitle: string;
  updated_at: string;
  unread_count: number;
  other_user_id?: string;
  /** Newest message in the room, for the list preview. */
  last_message?: { content: string; fromMe: boolean };
}

const MessagesPage = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithDetails | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);

  const handleCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    const returnTarget = returnFocusRef.current;
    setSelectedRoom(null);
    requestAnimationFrame(() => returnTarget?.focus());
  };

  // Get user's chat rooms with details
  const {
    data: chatRoomsWithDetails,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["user-chat-rooms-details", user?.id],
    queryFn: async () => {
      // Get all rooms where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from("chat_members")
        .select("room_id, last_read_at, role")
        .eq("user_id", user!.id);

      if (memberError) throw memberError;
      if (!memberships || memberships.length === 0) return [];

      // Get room details
      const roomIds = memberships.map(m => m.room_id);
      const { data: rooms, error: roomError } = await supabase
        .from("chat_rooms")
        .select("*")
        .in("id", roomIds)
        .order("updated_at", { ascending: false });

      if (roomError) throw roomError;
      if (!rooms) return [];

      // Get game/booking details and unread counts
      const roomsWithDetails: ChatRoomWithDetails[] = [];

      for (const room of rooms) {
        const membership = memberships.find(m => m.room_id === room.id);
        if (!membership) continue;

        let title = "";
        let subtitle = "";

        if (room.type === "game") {
          const { data: game } = await supabase
            .from("games")
            .select("title, sport, location")
            .eq("id", room.reference_id)
            .single();
          
          title = game?.title || "Game Chat";
          subtitle = game ? `${game.sport} • ${game.location}` : "";
        } else if (room.type === "booking") {
          const { data: booking } = await supabase
            .from("bookings")
            .select("venue_name, booking_date, booking_time")
            .eq("id", room.reference_id)
            .single();
          
          title = booking?.venue_name || "Booking Chat";
          subtitle = booking ? `${booking.booking_date} at ${formatTimeOfDay(booking.booking_time)}` : "";
        } else if (room.type === "venue") {
          const { data: venue } = await supabase
            .from("venues")
            .select("name, city, address")
            .eq("id", room.reference_id)
            .single();
          
          title = venue?.name || "Venue Chat";
          // No emoji pin: this is now the fallback line for a room with
          // no messages, and it reads as prose rather than a fake icon.
          subtitle = venue ? `${venue.address || venue.city}` : "Question about venue";
        }

        // Get the other user in venue chats
        let otherUserId: string | undefined;
        if (room.type === "venue") {
          const { data: members } = await supabase
            .from("chat_members")
            .select("user_id")
            .eq("room_id", room.id)
            .neq("user_id", user!.id);
          
          if (members && members.length > 0) {
            otherUserId = members[0].user_id;
          }
        }

        // Get unread count
        const { count } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .gt("created_at", membership.last_read_at || "1970-01-01");

        // The newest message, for the list preview. A conversation list whose
        // second line is the venue's street address tells you where the place
        // is, not what was said — which is the one thing the list exists to
        // show. This is one more round trip inside a loop that already makes
        // two or three per room; the N+1 is pre-existing in kind, and worth
        // one more call to stop the list being about the wrong subject.
        const { data: newest } = await supabase
          .from("chat_messages")
          .select("message_text, sender_id")
          .eq("room_id", room.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        roomsWithDetails.push({
          room_id: room.id,
          last_read_at: membership.last_read_at,
          role: membership.role,
          type: room.type as "game" | "booking" | "venue",
          reference_id: room.reference_id,
          title,
          subtitle,
          updated_at: room.updated_at,
          unread_count: count || 0,
          other_user_id: otherUserId,
          last_message: newest
            ? { content: newest.message_text, fromMe: newest.sender_id === user!.id }
            : undefined,
        });
      }

      return roomsWithDetails;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  if (!user) {
    return (
      <Layout>
        {/* Same `<Link><button>` nesting as the empty state below, and the
            same job as the sign-in gate on /community — which is already an
            EmptyState. */}
        <div className="container">
          <EmptyState
            icon={MessageCircle}
            title="Sign in to view messages"
            description="Your conversations with game hosts and venue owners live here."
            actionLabel="Sign in"
            actionHref="/login"
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <div className="mb-7 max-w-3xl border-b border-border pb-6 sm:mb-8 sm:pb-7">
            <Link
              to="/dashboard"
              className="focus-ring mb-4 inline-flex min-h-11 items-center rounded-md pr-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to dashboard
            </Link>
            <p className="eyebrow mb-2">Inbox</p>
            <h1 className="page-title text-balance">Messages</h1>
            <p className="mt-2 max-w-2xl text-pretty text-foreground-soft">
              Keep booking details and game plans in one place with hosts and venue owners.
            </p>
          </div>

          {/* Chat List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16" role="status" aria-label="Loading messages">
              <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
            </div>
          ) : chatRoomsWithDetails && chatRoomsWithDetails.length > 0 ? (
            <ul className="max-w-3xl space-y-2" aria-label="Conversations">
              {chatRoomsWithDetails.map((room) => (
                <li key={room.room_id}>
                  <button
                    type="button"
                    className="card-lift focus-ring group w-full rounded-xl border border-border bg-card p-4 text-left shadow-xs sm:p-5"
                    onClick={(event) => {
                      returnFocusRef.current = event.currentTarget;
                      setSelectedRoom(room);
                      setIsChatOpen(true);
                    }}
                    aria-haspopup="dialog"
                    aria-label={`Open conversation: ${room.title}${room.unread_count > 0 ? `, ${room.unread_count} unread` : ""}`}
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4">
                      {/* Was 🎮 / 📍 / 📅. Emoji as an icon sets in whatever
                          face the OS supplies, at a size and weight nothing
                          else on the page shares; every other icon in the app
                          is lucide. */}
                      <Avatar className="h-11 w-11 shrink-0 sm:h-12 sm:w-12">
                        <AvatarFallback className="border border-border bg-primary-soft text-primary">
                          {room.type === "game" ? (
                            <Gamepad2 className="h-5 w-5" aria-hidden="true" />
                          ) : room.type === "venue" ? (
                            <MapPin className="h-5 w-5" aria-hidden="true" />
                          ) : (
                            <CalendarDays className="h-5 w-5" aria-hidden="true" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="truncate font-display text-base font-semibold tracking-tight text-foreground">
                            {room.title}
                          </h2>
                          <time
                            dateTime={room.updated_at}
                            className="shrink-0 text-xs text-muted-foreground"
                          >
                            {formatDistanceToNow(new Date(room.updated_at), { addSuffix: true })}
                          </time>
                        </div>
                        {/* The last message, not the venue's street address.
                            `subtitle` still carries the context line and is
                            the fallback for a room nobody has written in yet. */}
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm text-muted-foreground">
                            {room.last_message ? (
                              <>
                                {room.last_message.fromMe && (
                                  <span className="text-muted-foreground/70">You: </span>
                                )}
                                {room.last_message.content}
                              </>
                            ) : (
                              room.subtitle || "No messages yet"
                            )}
                          </p>
                          {room.unread_count > 0 && (
                            <Badge variant="default" className="min-w-6 shrink-0 justify-center px-1.5" aria-hidden="true">
                              {room.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : isError ? (
            /* "No messages yet" on a failed fetch reads as "nobody has
               contacted you", which is a claim about other people's behaviour
               that we have no basis for. */
            /* `max-w-2xl`, left, like the list it stands in for. Measured at
               1440: the list sits at x=40 and so does the page heading, while
               these two states were centred at x=496 — so emptying your inbox
               shifted the page content 344px sideways under a heading that had
               not moved.

               Note the comment form: inside a ternary branch this must be a
               plain block comment, not `{...}`. A JSX comment container here is
               a second expression and does not parse — as the line above it
               already demonstrated, correctly, before I broke it. */
            <Card className="max-w-2xl">
              <ErrorPanel
                what="your messages"
                onRetry={() => refetch()}
                isRetrying={isFetching}
              />
            </Card>
          ) : (
            // The ninth hand-rolled empty state, missed when the other eight
            // were unified because its heading is an h2 rather than an h3.
            // Its two actions were `<Link><button>` — a link wrapping a
            // button, which is the same invalid nesting already fixed on
            // /my-venues — styled as underlined text and separated by a
            // bullet that vanished below sm.
            <EmptyState
              bordered
              icon={MessageCircle}
              title="No messages yet"
              description="Join a game or make a booking to start chatting."
              actionLabel="Find games"
              actionHref="/games"
              secondaryLabel="Browse venues"
              secondaryHref="/venues"
              className="max-w-2xl"
            />
          )}
        </div>
      </div>

      {/* Chat Dialog */}
      {selectedRoom && selectedRoom.type === "venue" && selectedRoom.role === "owner" ? (
        isMobile ? (
          <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
            <SheetContent
              side="bottom"
              className="h-[88dvh] gap-0 overflow-hidden rounded-t-xl p-0"
              onCloseAutoFocus={handleCloseAutoFocus}
            >
              <SheetHeader className="border-b border-border px-4 py-3.5 pr-14">
                <SheetTitle className="truncate">{selectedRoom.title}</SheetTitle>
              </SheetHeader>
              <OwnerChatView
                roomId={selectedRoom.room_id}
                venueName={selectedRoom.title}
                customerId={selectedRoom.other_user_id || ""}
              />
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
            <DialogContent
              className="flex h-[min(42rem,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
              onCloseAutoFocus={handleCloseAutoFocus}
            >
              <DialogHeader className="border-b border-border px-4 py-3.5 pr-14 text-left">
                <DialogTitle className="truncate">{selectedRoom.title}</DialogTitle>
              </DialogHeader>
              <OwnerChatView
                roomId={selectedRoom.room_id}
                venueName={selectedRoom.title}
                customerId={selectedRoom.other_user_id || ""}
              />
            </DialogContent>
          </Dialog>
        )
      ) : selectedRoom ? (
        <ChatDialog
          open={isChatOpen}
          onOpenChange={setIsChatOpen}
          onCloseAutoFocus={handleCloseAutoFocus}
          type={selectedRoom.type}
          referenceId={selectedRoom.reference_id}
          title={selectedRoom.title}
          userRole={selectedRoom.role as "host" | "player" | "owner" | "customer"}
        />
      ) : null}
    </Layout>
  );
};

export default MessagesPage;
