import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReview, useUpdateReview } from "@/hooks/useReviews";
import { toast } from "sonner";

interface ReviewFormProps {
  venueId: string;
  userId: string;
  existingReview?: {
    id: string;
    rating: number;
    comment: string | null;
  };
  onSuccess?: () => void;
}

const ReviewForm = ({ venueId, userId, existingReview, onSuccess }: ReviewFormProps) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || "");

  const createReview = useCreateReview();
  const updateReview = useUpdateReview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    try {
      if (existingReview) {
        await updateReview.mutateAsync({
          reviewId: existingReview.id,
          rating,
          comment: comment.trim(),
          venueId,
        });
        toast.success("Review updated!");
      } else {
        await createReview.mutateAsync({
          venueId,
          userId,
          rating,
          comment: comment.trim(),
        });
        toast.success("Review submitted!");
      }
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review");
    }
  };

  const isSubmitting = createReview.isPending || updateReview.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Your Rating
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              /* Five identical unnamed buttons: a screen reader read the
                 rating control as "button button button button button",
                 so there was no way to leave a rating without sight. */
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              aria-pressed={rating === star}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? "fill-primary text-primary"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Your Review (optional)
        </label>
        <Textarea
          placeholder="Share your experience at this venue..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-24"
          maxLength={500}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {existingReview ? "Updating..." : "Submitting..."}
          </>
        ) : existingReview ? (
          "Update Review"
        ) : (
          "Submit Review"
        )}
      </Button>
    </form>
  );
};

export default ReviewForm;
