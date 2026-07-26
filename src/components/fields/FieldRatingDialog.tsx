import React, { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FieldRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldId: string;
  fieldName: string;
  onRated: () => void;
}

const FieldRatingDialog: React.FC<FieldRatingDialogProps> = ({
  open, onOpenChange, fieldId, fieldName, onRated,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to rate");
      return;
    }

    setIsSubmitting(true);
    const trimmedComment = comment.trim().slice(0, 500);

    const { error } = await supabase
      .from("field_ratings" as any)
      .upsert({
        field_id: fieldId,
        user_id: user.id,
        rating,
        comment: trimmedComment || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "field_id,user_id" });

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to submit rating");
      return;
    }

    toast.success("Rating submitted!");
    setRating(0);
    setComment("");
    onOpenChange(false);
    onRated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {fieldName}</DialogTitle>
          <DialogDescription>How would you rate the condition of this field?</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(value => (
              <button
                key={value}
                type="button"
                onMouseEnter={() => setHoveredRating(value)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(value)}
                                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                aria-pressed={rating === value}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    (hoveredRating || rating) >= value
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>

          <Textarea
            placeholder="Optional comment about the field condition..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="resize-none"
            rows={3}
            maxLength={500}
          />

          <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting || rating === 0}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              "Submit Rating"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FieldRatingDialog;
