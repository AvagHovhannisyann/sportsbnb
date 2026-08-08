import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useChatMessages,
  useSendMessage,
  useReportMessage,
  useUpdateLastRead,
} from "@/hooks/useChat";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useReducedMotion } from "framer-motion";

interface ChatRoomProps {
  roomId: string;
  title?: string;
}

export const ChatRoom = ({ roomId, title }: ChatRoomProps) => {
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useChatMessages(roomId);
  const sendMessage = useSendMessage();
  const reportMessage = useReportMessage();
  const updateLastRead = useUpdateLastRead();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
    }
  }, [messages, prefersReducedMotion]);

  // Update last read when viewing chat
  useEffect(() => {
    if (roomId && user?.id) {
      updateLastRead.mutate(roomId);
    }
  }, [roomId, user?.id, messages?.length]);

  const handleSend = (message: string) => {
    sendMessage.mutate(
      { roomId, message },
      {
        onError: () => {
          toast.error("Failed to send message");
        },
      }
    );
  };

  const handleReport = (messageId: string) => {
    reportMessage.mutate(
      { messageId, roomId },
      {
        onSuccess: () => {
          toast.success("Message reported");
        },
        onError: () => {
          toast.error("Failed to report message");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "" : "justify-end"}`}>
              {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
              <Skeleton className="h-12 w-48 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {title && (
        <div className="px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h3 className="font-semibold">{title}</h3>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 space-y-3 overflow-y-auto bg-surface-1/45 p-4 sm:p-5"
        role="log"
        aria-label="Conversation messages"
        aria-live="polite"
      >
        {messages && messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-muted-foreground">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-foreground-soft">
              <MessageSquare className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="font-medium text-foreground">No messages yet</p>
            <p className="mt-1 text-sm">Send the first message when you are ready.</p>
          </div>
        ) : (
          messages?.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
              onReport={handleReport}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={handleSend} disabled={sendMessage.isPending} />
    </div>
  );
};
