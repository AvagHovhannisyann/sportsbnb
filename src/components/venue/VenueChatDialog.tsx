import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Flag, 
  Ban, 
  MoreVertical,
  Banknote,
  FileText,
  Dumbbell,
  Car,
  XCircle,
  HelpCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useInitializeVenueChat, useChatMessages, useSendMessage, useReportMessage, useUpdateLastRead, useBlockUser } from "@/hooks/useChat";
import { ChatInput } from "@/components/chat/ChatInput";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VenueChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string;
  venueName: string;
  ownerId: string;
}

const QUICK_QUESTIONS = [
  { icon: Banknote, label: "Price", message: "Hi! I have a question about pricing." },
  { icon: FileText, label: "Rules", message: "Hi! Could you tell me about the venue rules?" },
  { icon: Dumbbell, label: "Equipment", message: "Hi! What equipment is available at the venue?" },
  { icon: Car, label: "Parking", message: "Hi! Is parking available at the venue?" },
  { icon: XCircle, label: "Cancellation", message: "Hi! What is your cancellation policy?" },
  { icon: HelpCircle, label: "Other", message: "Hi! I have a question about the venue." },
];

export const VenueChatDialog = ({
  open,
  onOpenChange,
  venueId,
  venueName,
  ownerId,
}: VenueChatDialogProps) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  const { initializeVenueChat, isLoading: initLoading } = useInitializeVenueChat();
  const { data: messages, isLoading: messagesLoading } = useChatMessages(roomId || undefined);
  const sendMessage = useSendMessage();
  const reportMessage = useReportMessage();
  const updateLastRead = useUpdateLastRead();
  const blockUser = useBlockUser();

  // Initialize chat when dialog opens
  useEffect(() => {
    if (open && user && !roomId) {
      initializeVenueChat(venueId, user.id, ownerId, venueName)
        .then(setRoomId)
        .catch((error) => {
          console.error("Error initializing chat:", error);
          toast.error("Failed to start chat");
        });
    }
  }, [open, user, venueId, ownerId, venueName, roomId, initializeVenueChat]);

  // Update last read and scroll to bottom
  useEffect(() => {
    if (roomId && user?.id && messages?.length) {
      updateLastRead.mutate(roomId);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [roomId, user?.id, messages?.length]);

  const handleSend = (message: string) => {
    if (!roomId) return;
    sendMessage.mutate(
      { roomId, message },
      {
        onError: () => toast.error("Failed to send message"),
      }
    );
  };

  const handleQuickQuestion = (message: string) => {
    if (!roomId) return;
    handleSend(message);
  };

  const handleReport = (messageId: string) => {
    if (!roomId) return;
    reportMessage.mutate(
      { messageId, roomId },
      {
        onSuccess: () => toast.success("Message reported"),
        onError: () => toast.error("Failed to report message"),
      }
    );
  };

  const handleBlock = () => {
    if (!roomId) return;
    blockUser.mutate(
      { roomId, blockedId: ownerId, reason: "User initiated block" },
      {
        onSuccess: () => {
          toast.success("User blocked");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to block user"),
      }
    );
  };

  const isLoading = initLoading || messagesLoading;
  const hasMessages = messages && messages.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[600px] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">📍</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-base font-semibold">Message Owner</DialogTitle>
                <p className="text-xs text-muted-foreground">Question about: {venueName}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                  <Ban className="h-4 w-4 mr-2" />
                  Block owner
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        {/* Context Header */}
        <div className="px-4 py-2 bg-muted/50 border-b">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              🏟️ {venueName}
            </Badge>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "" : "justify-end"}`}>
                  {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
                  <Skeleton className="h-12 w-48 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : !hasMessages ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">Start a conversation</p>
              <p className="text-xs text-muted-foreground mb-6">
                Ask the owner about the venue
              </p>
              
              {/* Quick Question Chips */}
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {QUICK_QUESTIONS.map((q) => (
                  <Button
                    key={q.label}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => handleQuickQuestion(q.message)}
                    disabled={!roomId}
                  >
                    <q.icon className="h-3 w-3" />
                    {q.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages?.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    message.sender_id === user?.id ? "justify-end" : "justify-start"
                  )}
                >
                  {message.sender_id !== user?.id && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={message.sender?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {message.sender?.full_name?.[0] || "O"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                      message.sender_id === user?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted",
                      message.message_type === "system" && "bg-transparent text-muted-foreground text-center text-xs italic w-full max-w-full"
                    )}
                  >
                    {message.message_type !== "system" && message.sender_id !== user?.id && (
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {message.sender?.full_name || "Owner"}
                      </p>
                    )}
                    <p className="break-words">{message.message_text}</p>
                    
                    {/* Report option for other's messages */}
                    {message.sender_id !== user?.id && message.message_type !== "system" && !message.is_reported && (
                      <button
                        onClick={() => handleReport(message.id)}
                        className="mt-1 text-xs opacity-50 hover:opacity-100 flex items-center gap-1"
                      >
                        <Flag className="h-3 w-3" />
                        Report
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Quick Questions (when there are messages) */}
        {hasMessages && (
          <div className="px-4 py-2 border-t bg-muted/30">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {QUICK_QUESTIONS.slice(0, 4).map((q) => (
                <Button
                  key={q.label}
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs shrink-0 h-7"
                  onClick={() => handleQuickQuestion(q.message)}
                  disabled={!roomId}
                >
                  <q.icon className="h-3 w-3" />
                  {q.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={!roomId || sendMessage.isPending} />
      </DialogContent>
    </Dialog>
  );
};
