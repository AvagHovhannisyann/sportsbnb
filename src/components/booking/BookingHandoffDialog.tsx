import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, MessageSquare, Phone, Loader2, Calendar, Users, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useCreateBookingIntent, BookingChannel } from "@/hooks/useBookingIntent";
import {
  buildWhatsAppLink,
  buildSmsLink,
  buildTelLink,
  formatPhoneDisplay,
} from "@/lib/phone";

interface BookingHandoffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  venue: {
    id: string;
    name: string;
    location: string;
    phone: string | null;
    contactName?: string | null;
    whatsappEnabled: boolean;
    smsEnabled: boolean;
  };
  preselected?: {
    date?: string | null;
    dateLabel?: string | null;
    time?: string | null;
  };
}

const buildMessage = (opts: {
  venueName: string;
  code: string;
  contactName?: string | null;
  date?: string | null;
  time?: string | null;
  players?: number | null;
  note?: string | null;
  customerName?: string | null;
}): string => {
  const greeting = opts.contactName ? `Hi ${opts.contactName}` : "Hello";
  const lines = [
    `${greeting}, I found ${opts.venueName} on Sportsbnb and I'd like to book it.`,
  ];
  const details: string[] = [];
  if (opts.date) details.push(`📅 Date: ${opts.date}`);
  if (opts.time) details.push(`🕐 Time: ${opts.time}`);
  if (opts.players) details.push(`👥 Players: ${opts.players}`);
  if (details.length > 0) {
    lines.push("", ...details);
  }
  if (opts.note) {
    lines.push("", `Note: ${opts.note}`);
  }
  lines.push("", `Booking code: ${opts.code}`);
  if (opts.customerName) {
    lines.push(`— ${opts.customerName}`);
  }
  return lines.join("\n");
};

const BookingHandoffDialog = ({
  isOpen,
  onClose,
  venue,
  preselected,
}: BookingHandoffDialogProps) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const createIntent = useCreateBookingIntent();
  const [submitting, setSubmitting] = useState<BookingChannel | null>(null);

  const [date, setDate] = useState(preselected?.date ?? "");
  const [time, setTime] = useState(preselected?.time ?? "");
  const [players, setPlayers] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState(profile?.full_name ?? "");

  const dateDisplay = preselected?.dateLabel || date || null;

  const hasWhatsApp = venue.whatsappEnabled && !!venue.phone;
  const hasSms = venue.smsEnabled && !!venue.phone;
  const hasPhone = !!venue.phone;

  const handleHandoff = async (channel: BookingChannel) => {
    if (!venue.phone) return;
    setSubmitting(channel);

    try {
      const { code } = await createIntent.mutateAsync({
        venueId: venue.id,
        venueName: venue.name,
        userId: user?.id ?? null,
        channelUsed: channel,
        bookingDate: date || null,
        bookingTime: time || null,
        playersCount: players ? parseInt(players, 10) || null : null,
        note: note.trim() || null,
        customerName: name.trim() || null,
      });

      if (channel === "call") {
        const tel = buildTelLink(venue.phone);
        if (tel) window.location.href = tel;
        onClose();
        return;
      }

      const message = buildMessage({
        venueName: venue.name,
        code,
        contactName: venue.contactName,
        date: dateDisplay,
        time,
        players: players ? parseInt(players, 10) : null,
        note,
        customerName: name,
      });

      const url =
        channel === "whatsapp"
          ? buildWhatsAppLink(venue.phone, message)
          : buildSmsLink(venue.phone, message);

      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      onClose();
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {venue.name}</DialogTitle>
          <DialogDescription>
            Booking is confirmed directly with the venue owner. Add details below — they're optional but help the owner reply faster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-lg p-3 text-sm flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{venue.location}</span>
          </div>

          {!user && (
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                placeholder="So the owner knows who's asking"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="players" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Number of players
            </Label>
            <Input
              id="players"
              type="number"
              min="1"
              max="100"
              placeholder="e.g. 10"
              value={players}
              onChange={(e) => setPlayers(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Anything the owner should know..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          {hasWhatsApp && (
            <Button
              size="lg"
              className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2"
              onClick={() => handleHandoff("whatsapp")}
              disabled={submitting !== null}
            >
              {submitting === "whatsapp" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-5 w-5" />
              )}
              Book via WhatsApp
            </Button>
          )}

          {hasSms && (
            <Button
              variant={hasWhatsApp ? "outline" : "default"}
              size="lg"
              className="w-full gap-2"
              onClick={() => handleHandoff("sms")}
              disabled={submitting !== null}
            >
              {submitting === "sms" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-5 w-5" />
              )}
              Book via SMS
            </Button>
          )}

          {hasPhone && (
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={() => handleHandoff("call")}
              disabled={submitting !== null}
            >
              {submitting === "call" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Phone className="h-5 w-5" />
              )}
              Call {formatPhoneDisplay(venue.phone)}
            </Button>
          )}

          {!hasPhone && (
            <p className="text-sm text-muted-foreground text-center py-2">
              This venue hasn't added contact details yet. Please check back soon.
            </p>
          )}
        </DialogFooter>

        <p className="text-xs text-center text-muted-foreground pt-2 border-t">
          Booking is confirmed directly with the venue owner. Sportsbnb tracks the lead so you can follow up if needed.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default BookingHandoffDialog;
