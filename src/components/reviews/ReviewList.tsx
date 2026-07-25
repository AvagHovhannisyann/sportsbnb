import { Star, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import type { Review } from "@/hooks/useReviews";

interface ReviewListProps {
  reviews: Review[];
  currentUserId?: string;
  onDelete?: (reviewId: string) => void;
}

const ReviewList = ({ reviews, currentUserId, onDelete }: ReviewListProps) => {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No reviews yet. Be the first to review this venue!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => {
        const profile = review.profiles;
        const initials = profile?.full_name
          ?.split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase() || "U";

        return (
          <div key={review.id} className="border-b border-border pb-6 last:border-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-foreground">
                    {profile?.full_name || "Anonymous"}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? "fill-primary text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              {currentUserId === review.user_id && onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete your review"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(review.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {review.comment && (
              <p className="mt-3 text-foreground/80 pl-13">{review.comment}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReviewList;
