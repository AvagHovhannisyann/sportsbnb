import { useEffect, useState } from "react";
import { usePendingReviewPrompts, useDismissReviewPrompt, useCompleteReviewPrompt } from "@/hooks/useReviewPrompts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ReviewPromptModal = () => {
  const navigate = useNavigate();
  const { data: prompts = [] } = usePendingReviewPrompts();
  const dismiss = useDismissReviewPrompt();
  const complete = useCompleteReviewPrompt();
  const [currentPrompt, setCurrentPrompt] = useState<any>(null);
  const [venueName, setVenueName] = useState("");

  useEffect(() => {
    if (prompts.length > 0 && !currentPrompt) {
      const prompt = prompts[0];
      setCurrentPrompt(prompt);
      // Get venue name
      supabase
        .from("venues")
        .select("name")
        .eq("id", prompt.venue_id)
        .single()
        .then(({ data }) => {
          if (data) setVenueName(data.name);
        });
    }
  }, [prompts, currentPrompt]);

  if (!currentPrompt) return null;

  const handleReview = () => {
    complete.mutate(currentPrompt.id);
    navigate(`/venue/${currentPrompt.venue_id}`);
    setCurrentPrompt(null);
  };

  const handleDismiss = () => {
    dismiss.mutate(currentPrompt.id);
    setCurrentPrompt(null);
  };

  return (
    <Dialog open={!!currentPrompt} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary fill-primary" />
            How was your experience?
          </DialogTitle>
          <DialogDescription>
            You recently visited <strong>{venueName}</strong>. Would you like to leave a review?
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center py-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className="h-8 w-8 text-primary/30 cursor-pointer hover:text-primary hover:fill-primary transition-colors"
                onClick={handleReview}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleReview} className="flex-1">
            Write a Review
          </Button>
          <Button variant="outline" onClick={handleDismiss}>
            Not Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewPromptModal;
