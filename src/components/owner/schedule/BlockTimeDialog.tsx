import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface BlockTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBlock?: (data: {
    date: Date;
    startTime: string;
    endTime: string;
    reason: string;
    blockType: "time" | "full_day";
  }) => void;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

export function BlockTimeDialog({
  open,
  onOpenChange,
  onBlock,
}: BlockTimeDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  // Full day, not "time".
  //
  // Blocking is stored in `blocked_dates`, which holds a date and nothing else,
  // and `get_available_slots` returns zero rows for any date it finds there.
  // A partial block is therefore not something the backend can express — yet
  // this dialog offered "Specific Time Range" *by default*, and the handler
  // dropped the range into the free-text `reason` column as
  // "Blocked: 18:00 - 20:00" before blocking the whole day anyway. An owner
  // closing two hours for maintenance lost every booking slot that day and was
  // told "Time blocked successfully".
  const [blockType, setBlockType] = useState<"time" | "full_day">("full_day");

  const handleSubmit = () => {
    if (!date) return;
    onBlock?.({
      date,
      startTime,
      endTime,
      reason,
      blockType,
    });
    onOpenChange(false);
    // Reset form
    setReason("");
    setBlockType("full_day");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-warning" aria-hidden="true" />
            Block a full day
          </DialogTitle>
          <DialogDescription>
            Close this venue to new bookings for one calendar day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label id="block-type-label">Block type</Label>
            <Select value={blockType} onValueChange={(v) => setBlockType(v as "time" | "full_day")}>
              <SelectTrigger aria-labelledby="block-type-label" aria-describedby="block-type-hint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_day">Full day</SelectItem>
                {/* Disabled rather than removed: an owner who has used this
                    before should see where it went, not wonder. */}
                <SelectItem value="time" disabled>
                  Specific time range — not yet supported
                </SelectItem>
              </SelectContent>
            </Select>
            <p id="block-type-hint" className="text-xs leading-relaxed text-muted-foreground">
              Partial-day closures are not supported by the current availability system.
            </p>
          </div>

          <div className="space-y-2">
            <p id="block-date-label" className="text-sm font-medium leading-5 text-foreground">
              Date <span aria-hidden="true">*</span>
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  aria-labelledby="block-date-label block-date-value"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon aria-hidden="true" />
                  <span id="block-date-value">{date ? format(date, "PPP") : "Select a date"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {blockType === "time" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label id="block-start-time-label">Start time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger aria-labelledby="block-start-time-label">
                    <Clock aria-hidden="true" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label id="block-end-time-label">End time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger aria-labelledby="block-end-time-label">
                    <Clock aria-hidden="true" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="block-reason">Reason <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="block-reason"
              name="blockReason"
              placeholder="e.g., Maintenance, Private event, School booking..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={!date}>
            Block full day
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BlockTimeDialog;
