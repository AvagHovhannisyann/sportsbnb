import React from "react";
import { Building2, CheckCircle, Eye, MapPin, Sparkles, Star, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { getConfidenceBadge, getStatusBadge } from "./badges";

interface CandidateCardProps {
  candidate: any;
  showActions: boolean;
  approveNames: Record<string, string>;
  setApproveNames: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onApprove: (candidate: any) => void;
  onReject: (candidate: any) => void;
  isPending: boolean;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate, showActions, approveNames, setApproveNames, onApprove, onReject, isPending
}) => {
  const meta = candidate.raw_metadata as any;
  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-foreground capitalize">{candidate.detected_sport_type}</span>
            {getConfidenceBadge(Number(candidate.confidence_score))}
            {getStatusBadge(candidate.status)}
          </div>
          {meta?.ai_suggested_name && (
            <p className="flex items-center gap-1 text-sm font-medium text-foreground">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            {meta.ai_suggested_name}
          </p>
          )}
          {meta?.name && meta.name !== meta?.ai_suggested_name && (
            <p className="text-xs text-muted-foreground">Google: {meta.name}</p>
          )}
          <p className="text-sm text-muted-foreground">
            <MapPin className="mr-1 inline h-3 w-3" aria-hidden="true" />
          {meta?.address || `${candidate.latitude.toFixed(4)}, ${candidate.longitude.toFixed(4)}`}
          </p>
          {meta?.rating && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-current" aria-hidden="true" />
            {meta.rating} ({meta.user_rating_count || 0} reviews)
          </p>
          )}
          {meta?.ai_reason && (
            <p className="mt-1 flex items-start gap-1 text-xs italic text-muted-foreground">
            <Sparkles className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
            <span>AI: {meta.ai_reason}</span>
          </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Detected: {format(new Date(candidate.detection_timestamp), "MMM d, yyyy HH:mm")}
          </p>
        </div>
      </div>
      {showActions && (
        <div className="flex items-center gap-2">
          <Input
            placeholder={meta?.ai_suggested_name || "Enter field name..."}
            value={approveNames[candidate.id] || ""}
            onChange={e => setApproveNames(prev => ({ ...prev, [candidate.id]: e.target.value }))}
            className="flex-1"
          />
          <Button size="sm" onClick={() => onApprove(candidate)} disabled={isPending}>
            <CheckCircle className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReject(candidate)} disabled={isPending}>
            <XCircle className="h-4 w-4 mr-1" /> Reject
          </Button>
        </div>
      )}
      {/* Yandex's URL parameters are longitude-first, like the rest of its
          API: `ll` and `pt` are "<lng>,<lat>". Swapping them here would put
          the reviewer somewhere else entirely — the same trap the in-app
          maps have, so it is spelled out rather than left to the reader. */}
      <a
        href={`https://yandex.com/maps/?ll=${candidate.longitude},${candidate.latitude}&z=18&pt=${candidate.longitude},${candidate.latitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline flex items-center gap-1"
      >
        <Eye className="h-3 w-3" /> View on Yandex Maps
      </a>
    </div>
  );
};

export default CandidateCard;
