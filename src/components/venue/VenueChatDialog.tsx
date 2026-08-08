import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Ban,
  Banknote,
  Car,
  Dumbbell,
  FileText,
  HelpCircle,
  MessageSquare,
  MoreVertical,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useBlockUser,
  useChatMessages,
  useInitializeVenueChat,
  useReportMessage,
  useSendMessage,
  useUpdateLastRead,
} from "@/hooks/useChat";
import { useReducedMotion } from "framer-motion";
import { toast } from "sonner";

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
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializationStartedRef = useRef(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [initializationFailed, setInitializationFailed] = useState(false);
  const [initializationAttempt, setInitializationAttempt] = useState(0);

  const { initializeVenueChat, isLoading: initLoading } = useInitializeVenueChat();
  const {
    data: messages,
    isLoading: messagesLoading,
    isError: messagesError,
    refetch: refetchMessages,
    isFetching: messagesFetching,
  } = useChatMessages(roomId || undefined);
  const sendMessage = useSendMessage();
  const reportMessage = useReportMessage();
  const { mutate: updateLastRead } = useUpdateLastRead();
  const blockUser = useBlockUser();

  // Initialize the venue room only after the user deliberately opens chat.
  useEffect(() => {
    if (!open) {
      initializationStartedRef.current = false;
      setInitializationFailed(false);
      return;
    }
    if (!user || roomId || initializationStartedRef.current) return;

    initializationStartedRef.current = true;
    setInitializationFailed(false);
    initializeVenueChat(venueId, user.id, ownerId, venueName)
      .then(setRoomId)
      .catch((error) => {
        console.error("Error initializing chat:", error);
        setInitializationFailed(true);
        toast.error("Failed to start chat");
      });
  }, [
    open,
    user,
    roomId,
    venueId,
    ownerId,
    venueName,
    initializeVenueChat,
    initializationAttempt,
  ]);

  // Update last read and keep the newest message in view without forcing
  // smooth scrolling for people who have asked for reduced motion.
  useEffect(() => {
    if (roomId && user?.id && messages?.length) {
      updateLastRead(roomId);
      messagesEndRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
  }, [roomId, user?.id, messages?.length, prefersReducedMotion, updateLastRead]);

  const handleSend = (message: string) => {
    if (!roomId) return;
    sendMessage.mutate(
      { roomId, message },
      { onError: () => toast.error("Failed to send message") },
    );
  };

  const handleReport = (messageId: string) => {
    if (!roomId) return;
    reportMessage.mutate(
      { messageId, roomId },
      {
        onSuccess: () => toast.success("Message reported"),
        onError: () => toast.error("Failed to report message"),
      },
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
      },
    );
  };

  const isLoading = initLoading || (!!roomId && messagesLoading);
  const hasMessages = !!messages?.length;

  const headerActions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Conversation actions">
          <MoreVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleBlock}
          disabled={!roomId || blockUser.isPending}
          className="text-destructive"
        >
          <Ban className="mr-2 h-4 w-4" aria-hidden="true" />
          Block owner
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const conversation = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex-1 space-y-3 overflow-y-auto bg-surface-1/45 p-4 sm:p-5"
        role="log"
        aria-label={`Conversation about ${venueName}`}
        aria-live="polite"
      >
        {initializationFailed ? (
          <ErrorPanel
            what="this conversation"
            description="We couldn't connect you with the venue owner. No message was sent."
            onRetry={() => {
              initializationStartedRef.current = false;
              setInitializationAttempt((attempt) => attempt + 1);
            }}
            className="flex min-h-full flex-col justify-center"
          />
        ) : isLoading || (!roomId && open) ? (
          <div className="space-y-4" role="status" aria-label="Loading conversation">
            {[...Array(4)].map((_, index) => (
              <div key={index} className={index % 2 ? "flex justify-end" : "flex gap-2"}>
                {index % 2 === 0 && <Skeleton className="h-8 w-8 shrink-0 rounded-full" />}
                <Skeleton className="h-14 w-[min(70%,15rem)] rounded-xl" />
              </div>
            ))}
          </div>
        ) : messagesError ? (
          <ErrorPanel
            what="these messages"
            onRetry={() => refetchMessages()}
            isRetrying={messagesFetching}
            className="flex min-h-full flex-col justify-center"
          />
        ) : !hasMessages ? (
          <div className="flex min-h-full flex-col items-center justify-center px-2 py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-foreground-soft">
              <MessageSquare className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="font-medium text-foreground">Start a conversation</p>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Ask the owner about the venue, access, or booking details.
            </p>
            <div
              className="mt-5 flex max-w-sm flex-wrap justify-center gap-2"
              aria-label="Suggested questions"
            >
              {QUICK_QUESTIONS.map((question) => (
                <Button
                  key={question.label}
                  type="button"
                  variant="outline"
                  aria-label={`Ask about ${question.label.toLowerCase()}`}
                  onClick={() => handleSend(question.message)}
                  disabled={!roomId || sendMessage.isPending}
                >
                  <question.icon aria-hidden="true" />
                  {question.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages?.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === user?.id}
                onReport={message.is_reported ? undefined : handleReport}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {hasMessages && (
        <div className="border-t border-border bg-background px-3 py-2 sm:px-4">
          <div className="flex gap-2 overflow-x-auto" aria-label="Suggested questions">
            {QUICK_QUESTIONS.slice(0, 4).map((question) => (
              <Button
                key={question.label}
                type="button"
                variant="ghost"
                className="shrink-0"
                aria-label={`Ask about ${question.label.toLowerCase()}`}
                onClick={() => handleSend(question.message)}
                disabled={!roomId || sendMessage.isPending}
              >
                <question.icon aria-hidden="true" />
                {question.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <ChatInput
        onSend={handleSend}
        disabled={!roomId || initializationFailed || sendMessage.isPending}
      />
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[88dvh] gap-0 rounded-t-xl p-0">
          <SheetHeader className="border-b border-border px-4 py-3.5 pr-14">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <SheetTitle>Message owner</SheetTitle>
                <p className="truncate text-sm text-muted-foreground">About {venueName}</p>
              </div>
              {headerActions}
            </div>
          </SheetHeader>
          {conversation}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(42rem,calc(100dvh-2rem))] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3.5 pr-14">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle>Message owner</DialogTitle>
              <p className="truncate text-sm text-muted-foreground">About {venueName}</p>
            </div>
            {headerActions}
          </div>
        </DialogHeader>
        {conversation}
      </DialogContent>
    </Dialog>
  );
};
