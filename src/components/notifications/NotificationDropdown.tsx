import { Bell, Check, CheckCheck, Trash2, Calendar, Users, Star, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  type Notification,
} from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "booking":
      return <Calendar className="h-4 w-4 text-primary" />;
    case "game":
      return <Users className="h-4 w-4 text-success" />;
    case "review":
      return <Star className="h-4 w-4 text-warning" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (link: string | null) => void;
}

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onDelete,
  onNavigate,
}: NotificationItemProps) => {
  const handleOpen = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      // Use setTimeout to allow the dropdown to close first
      setTimeout(() => {
        onNavigate(notification.link);
      }, 0);
    }
  };

  const content = (
    <>
      <div className="mt-0.5 shrink-0" aria-hidden="true">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            !notification.is_read ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </>
  );

  return (
    <div
      className={`flex items-start border-b border-border transition-colors duration-150 last:border-b-0 motion-reduce:transition-none ${
        !notification.is_read ? "bg-primary/5" : ""
      }`}
    >
      {notification.link ? (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={`Open notification: ${notification.title}`}
          className="flex min-h-16 min-w-0 flex-1 items-start gap-3 rounded-lg p-3 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
        >
          {content}
        </button>
      ) : (
        <div className="flex min-h-16 min-w-0 flex-1 items-start gap-3 p-3">
          {content}
        </div>
      )}

      <div className="flex shrink-0 items-start gap-0.5 py-2 pr-2">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-foreground"
            aria-label={`Mark "${notification.title}" as read`}
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Delete "${notification.title}"`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const unreadCount = useUnreadNotificationCount();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  const handleNavigate = (link: string | null) => {
    if (link) {
      navigate(link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
          }
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-xs font-medium text-primary-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-popover">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 gap-1 text-xs"
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications && notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={(id) => markAsRead.mutate(id)}
                onDelete={(id) => deleteNotification.mutate(id)}
                onNavigate={handleNavigate}
              />
            ))
          ) : (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center text-sm cursor-pointer"
          onClick={() => navigate("/profile")}
        >
          Notification Settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
