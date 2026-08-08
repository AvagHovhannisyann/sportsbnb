import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag, MoreVertical, Crown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/useChat";

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onReport?: (messageId: string) => void;
}

const getRoleLabel = (role?: string) => {
  switch (role) {
    case "host":
      return "Host";
    case "player":
      return "Player";
    case "owner":
      return "Venue Owner";
    case "customer":
      return "Customer";
    default:
      return null;
  }
};

const isHostRole = (role?: string) => role === "host" || role === "owner";

export const ChatBubble = ({ message, isOwn, onReport }: ChatBubbleProps) => {
  if (message.message_type === "system") {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1.5 rounded-full">
          {message.message_text}
        </div>
      </div>
    );
  }

  const senderName = message.sender?.full_name || "User";
  const roleLabel = getRoleLabel(message.sender_role);
  const isHost = isHostRole(message.sender_role);
  const senderInitials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "group flex gap-2",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!isOwn && (
        <Avatar className={cn("h-8 w-8 flex-shrink-0", isHost && "ring-2 ring-primary ring-offset-2")}>
          <AvatarImage src={message.sender?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{senderInitials}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex max-w-[82%] flex-col sm:max-w-[72%]", isOwn ? "items-end" : "items-start")}>
        {!isOwn && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-xs font-medium text-foreground">
              {senderName}
            </span>
            {roleLabel && (
              <Badge 
                variant={isHost ? "default" : "secondary"} 
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4",
                  isHost && "bg-primary/90"
                )}
              >
                {isHost && <Crown className="h-2.5 w-2.5 mr-0.5" />}
                {roleLabel}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-end gap-0.5">
          <div
            className={cn(
              "rounded-xl px-3.5 py-2.5 shadow-xs",
              isOwn
                ? "rounded-br-sm bg-primary text-primary-foreground"
                : "rounded-bl-sm border border-border bg-card"
            )}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.message_text}
            </p>
          </div>

          {!isOwn && onReport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Message actions"
                  className="opacity-60 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 motion-reduce:transition-none"
                >
                  <MoreVertical className="h-3 w-3" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem 
                  onClick={() => onReport(message.id)}
                  className="text-destructive"
                >
                  <Flag className="h-4 w-4 mr-2" aria-hidden="true" />
                  Report Message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <span className="text-[10px] text-muted-foreground mt-1 px-1">
          {format(new Date(message.created_at), "HH:mm")}
        </span>
      </div>
    </div>
  );
};
