import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useProfileSettings, type NotificationPreferences } from "./hooks/useProfileSettings";

const NOTIFICATION_OPTIONS = [
  {
    key: "bookingConfirmations" as const,
    label: "Booking confirmations",
    description: "Get notified when your booking is confirmed"
  },
  {
    key: "gameUpdates" as const,
    label: "Game updates",
    description: "Receive updates about games you've joined"
  },
  {
    key: "newGamesNearby" as const,
    label: "New games nearby",
    description: "Get notified when new games are posted in your area"
  },
  {
    key: "marketingEmails" as const,
    label: "Marketing emails",
    description: "Receive tips, updates, and promotions"
  },
];

const NotificationsTab = () => {
  const { profile } = useAuth();
  const { saveNotifications, isSavingNotifications } = useProfileSettings();

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    bookingConfirmations: true,
    gameUpdates: true,
    newGamesNearby: false,
    marketingEmails: false,
  });

  useEffect(() => {
    if (profile) {
      // Load notification preferences from profile if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const savedNotifications = (profile as any).notification_preferences as NotificationPreferences | undefined;
      if (savedNotifications) {
        setNotifications(savedNotifications);
      }
    }
  }, [profile]);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle as="h2">Notification preferences</CardTitle>
        <CardDescription>
          Choose what notifications you want to receive.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border rounded-lg border border-border">
          {NOTIFICATION_OPTIONS.map((notification) => (
          <div key={notification.key} className="flex min-h-20 items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <div className="font-medium text-foreground">{notification.label}</div>
              <div className="text-sm text-muted-foreground">{notification.description}</div>
            </div>
            <Switch
              aria-label={notification.label}
              checked={notifications[notification.key]}
              onCheckedChange={(checked) =>
                setNotifications(prev => ({ ...prev, [notification.key]: checked }))
              }
            />
          </div>
          ))}
        </div>
        <Separator className="my-6" />
        <Button onClick={() => saveNotifications(notifications)} disabled={isSavingNotifications}>
          {isSavingNotifications ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Saving...
            </>
          ) : (
            "Save preferences"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default NotificationsTab;
