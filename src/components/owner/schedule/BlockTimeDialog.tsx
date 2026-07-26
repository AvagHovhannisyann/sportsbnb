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
            <Ban className="h-5 w-5 text-destructive" />
            Block Time
          </DialogTitle>
          <DialogDescription>
            Block off time for maintenance, private events, or other closures.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Block Type */}
          <div className="space-y-2">
            <Label>Block Type</Label>
            <Select value={blockType} onValueChange={(v) => setBlockType(v as "time" | "full_day")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_day">Full Day</SelectItem>
                {/* Disabled rather than removed: an owner who has used this
                    before should see where it went, not wonder. */}
                <SelectItem value="time" disabled>
                  Specific time range — not yet supported
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A block closes the venue for the whole day. Blocking part of a day
              is not available yet.
            </p>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select a date"}
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

          {/* Time Range (only for specific time) */}
          {blockType === "time" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <Clock className="h-4 w-4 mr-2" />
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
                <Label>End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <Clock className="h-4 w-4 mr-2" />
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

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="e.g., Maintenance, Private event, School booking..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!date}>
            Block Time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BlockTimeDialog;
