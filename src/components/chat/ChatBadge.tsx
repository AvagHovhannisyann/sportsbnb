import { useUnreadMessageCount } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

interface ChatBadgeProps {
  className?: string;
}

export const ChatBadge = ({ className }: ChatBadgeProps) => {
  const { data: unreadCount } = useUnreadMessageCount();

  if (!unreadCount || unreadCount === 0) return null;

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center",
        "bg-destructive-solid text-destructive-foreground text-xs font-medium rounded-full",
        className
      )}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
};
