import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Layout from "@/components/layout/Layout";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { OwnerChatView } from "@/components/venue/OwnerChatView";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

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
}

const MessagesPage = () => {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithDetails | null>(null);

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
          subtitle = booking ? `${booking.booking_date} at ${booking.booking_time}` : "";
        } else if (room.type === "venue") {
          const { data: venue } = await supabase
            .from("venues")
            .select("name, city, address")
            .eq("id", room.reference_id)
            .single();
          
          title = venue?.name || "Venue Chat";
          subtitle = venue ? `📍 ${venue.address || venue.city}` : "Question about venue";
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
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Please sign in to view messages</h1>
          <Link to="/login">
            <button className="text-primary hover:underline">Sign in</button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to dashboard
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground">Your conversations with game hosts and venue owners</p>
          </div>

          {/* Chat List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chatRoomsWithDetails && chatRoomsWithDetails.length > 0 ? (
            <div className="space-y-2 max-w-2xl">
              {chatRoomsWithDetails.map((room) => (
                <Card 
                  key={room.room_id} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedRoom(room)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {room.type === "game" ? "🎮" : room.type === "venue" ? "📍" : "📅"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-foreground truncate">{room.title}</h3>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(room.updated_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground truncate">{room.subtitle}</p>
                          {room.unread_count > 0 && (
                            <Badge variant="default" className="shrink-0">
                              {room.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError ? (
            /* "No messages yet" on a failed fetch reads as "nobody has
               contacted you", which is a claim about other people's behaviour
               that we have no basis for. */
            <Card className="max-w-md mx-auto">
              <ErrorPanel
                what="your messages"
                onRetry={() => refetch()}
                isRetrying={isFetching}
              />
            </Card>
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="py-16 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">No messages yet</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Join a game or make a booking to start chatting
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Link to="/games">
                    <button className="text-primary hover:underline text-sm">Find games</button>
                  </Link>
                  <span className="text-muted-foreground hidden sm:inline">•</span>
                  <Link to="/venues">
                    <button className="text-primary hover:underline text-sm">Browse venues</button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Chat Dialog */}
      {selectedRoom && selectedRoom.type === "venue" && selectedRoom.role === "owner" ? (
        <Dialog open={!!selectedRoom} onOpenChange={(open) => !open && setSelectedRoom(null)}>
          <DialogContent className="sm:max-w-md h-[600px] flex flex-col p-0">
            <DialogHeader className="px-4 py-3 border-b">
              <DialogTitle>{selectedRoom.title}</DialogTitle>
            </DialogHeader>
            <OwnerChatView
              roomId={selectedRoom.room_id}
              venueName={selectedRoom.title}
              customerId={selectedRoom.other_user_id || ""}
            />
          </DialogContent>
        </Dialog>
      ) : selectedRoom ? (
        <ChatDialog
          open={!!selectedRoom}
          onOpenChange={(open) => !open && setSelectedRoom(null)}
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
