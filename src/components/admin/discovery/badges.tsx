import React from "react";
import { Badge } from "@/components/ui/badge";
import { TONE_CHIP } from "@/lib/chips";
import { Sparkles, AlertTriangle } from "lucide-react";

export const getConfidenceBadge = (score: number) => {
  if (score >= 0.85) return <Badge className={TONE_CHIP.positive}>{(score * 100).toFixed(0)}%</Badge>;
  if (score >= 0.7) return <Badge className={TONE_CHIP.warning}>{(score * 100).toFixed(0)}%</Badge>;
  return <Badge className={TONE_CHIP.danger}>{(score * 100).toFixed(0)}%</Badge>;
};

export const getStatusBadge = (status: string) => {
  switch (status) {
    case "auto_approved":
      return <Badge className={TONE_CHIP.positive}><Sparkles className="h-3 w-3 mr-1" />Auto-Approved</Badge>;
    case "needs_review":
      return <Badge className={TONE_CHIP.warning}><AlertTriangle className="h-3 w-3 mr-1" />Needs Review</Badge>;
    case "approved":
      return <Badge className={TONE_CHIP.positive}>Approved</Badge>;
    case "rejected":
      return <Badge className={TONE_CHIP.danger}>Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
