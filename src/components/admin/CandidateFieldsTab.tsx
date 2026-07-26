import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import DiscoveryControls from "./discovery/DiscoveryControls";
import CandidateCard from "./discovery/CandidateCard";
import { getConfidenceBadge, getStatusBadge } from "./discovery/badges";

const useCandidateFields = () => {
  return useQuery({
    queryKey: ["admin-candidate-fields"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_fields")
        .select("*")
        .order("confidence_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

const useApproveCandidate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ candidate, approved, name }: { candidate: any; approved: boolean; name?: string }) => {
      if (approved && name) {
        const { error: insertError } = await supabase.from("verified_fields").insert({
          candidate_id: candidate.id,
          name,
          latitude: candidate.latitude,
          longitude: candidate.longitude,
          sport_type: candidate.detected_sport_type,
          city: "Yerevan",
          is_public: true,
          verification_status: "verified",
        } as any);
        if (insertError) throw insertError;
      }

      const { error } = await supabase
        .from("candidate_fields")
        .update({
          status: approved ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq("id", candidate.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-candidate-fields"] });
      queryClient.invalidateQueries({ queryKey: ["verified-fields"] });
      toast.success(vars.approved ? "Field verified and added to map!" : "Candidate rejected");
    },
    onError: () => toast.error("Failed to process candidate"),
  });
};

const CandidateFieldsTab: React.FC = () => {
  const { data: candidates, isLoading } = useCandidateFields();
  const approveCandidate = useApproveCandidate();
  const [approveNames, setApproveNames] = useState<Record<string, string>>({});

  const needsReview = candidates?.filter(c => c.status === "needs_review") || [];
  const pending = candidates?.filter(c => c.status === "pending") || [];
  const autoApprovedList = candidates?.filter(c => c.status === "auto_approved") || [];
  const processed = candidates?.filter(c => ["approved", "rejected"].includes(c.status)) || [];

  const handleApprove = (candidate: any) => {
    const meta = candidate.raw_metadata as any;
    const name = approveNames[candidate.id] || meta?.ai_suggested_name;
    if (!name?.trim()) {
      toast.error("Please enter a name for this field");
      return;
    }
    approveCandidate.mutate({ candidate, approved: true, name: name.trim() });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DiscoveryControls />

      {/* Flagged for review */}
      {needsReview.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Flagged for Review ({needsReview.length})
            </CardTitle>
            <CardDescription>AI flagged these as suspicious — please verify manually</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {needsReview.map(c => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  showActions
                  approveNames={approveNames}
                  setApproveNames={setApproveNames}
                  onApprove={handleApprove}
                  onReject={(candidate) => approveCandidate.mutate({ candidate, approved: false })}
                  isPending={approveCandidate.isPending}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy pending */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              Pending Candidates ({pending.length})
            </CardTitle>
            <CardDescription>Older candidates awaiting verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pending.map(c => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  showActions
                  approveNames={approveNames}
                  setApproveNames={setApproveNames}
                  onApprove={handleApprove}
                  onReject={(candidate) => approveCandidate.mutate({ candidate, approved: false })}
                  isPending={approveCandidate.isPending}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-approved summary */}
      {autoApprovedList.length > 0 && (
        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-500" />
              Auto-Approved by AI ({autoApprovedList.length})
            </CardTitle>
            <CardDescription>AI verified and automatically added to the map</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>AI Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoApprovedList.map(c => {
                  const meta = c.raw_metadata as any;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{meta?.ai_suggested_name || meta?.name || "—"}</TableCell>
                      <TableCell className="capitalize">{c.detected_sport_type}</TableCell>
                      <TableCell>{getConfidenceBadge(Number(c.confidence_score))}</TableCell>
                      <TableCell className="text-xs">{meta?.address || `${c.latitude.toFixed(3)}, ${c.longitude.toFixed(3)}`}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{meta?.ai_reason || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Processed candidates */}
      {processed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Manually Processed ({processed.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sport</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processed.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium capitalize">{c.detected_sport_type}</TableCell>
                    <TableCell>{getConfidenceBadge(Number(c.confidence_score))}</TableCell>
                    <TableCell>{c.latitude.toFixed(3)}, {c.longitude.toFixed(3)}</TableCell>
                    <TableCell>{format(new Date(c.detection_timestamp), "MMM d")}</TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CandidateFieldsTab;
