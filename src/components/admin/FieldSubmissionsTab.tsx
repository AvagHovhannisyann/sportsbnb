import React from "react";
import { TONE_CHIP } from "@/lib/chips";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";

const useFieldSubmissions = () => {
  return useQuery({
    queryKey: ["admin-field-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

const useApproveField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submission, approved }: { submission: any; approved: boolean }) => {
      if (approved) {
        // Insert into public_fields
        const { error: insertError } = await supabase.from("public_fields").insert({
          name: submission.name,
          address: submission.address,
          city: submission.city || "Yerevan",
          latitude: submission.latitude,
          longitude: submission.longitude,
          sports: submission.sports,
          surface_type: submission.surface_type,
          has_lighting: submission.has_lighting || false,
          description: submission.description,
          submitted_by: submission.submitted_by,
          is_approved: true,
          condition_rating: 3,
        } as any);
        if (insertError) throw insertError;
      }

      // Update submission status
      const { error } = await supabase
        .from("field_submissions")
        .update({ status: approved ? "approved" : "rejected" } as any)
        .eq("id", submission.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-field-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["public-fields"] });
      toast.success(vars.approved ? "Field approved and added to map!" : "Submission rejected");
    },
    onError: () => toast.error("Failed to process submission"),
  });
};

const FieldSubmissionsTab: React.FC = () => {
  const { data: submissions, isLoading } = useFieldSubmissions();
  const approveField = useApproveField();

  const pending = submissions?.filter(s => s.status === "pending") || [];
  const processed = submissions?.filter(s => s.status !== "pending") || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className={TONE_CHIP.positive}>Approved</Badge>;
      case "rejected":
        return <Badge className={TONE_CHIP.danger}>Rejected</Badge>;
      default:
        return <Badge className={TONE_CHIP.warning}>Pending</Badge>;
    }
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
      {/* Pending submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-amber-500" />
            Pending Field Submissions ({pending.length})
          </CardTitle>
          <CardDescription>Community-submitted fields waiting for review</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No pending submissions</p>
          ) : (
            <div className="space-y-4">
              {pending.map(sub => (
                <div key={sub.id} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{sub.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {sub.sports?.join(", ")} • {sub.surface_type || "Unknown surface"}
                      </p>
                      {sub.address && (
                        <p className="text-sm text-muted-foreground">{sub.address}</p>
                      )}
                      {sub.description && (
                        <p className="text-sm text-muted-foreground mt-1">{sub.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        📍 {sub.latitude.toFixed(4)}, {sub.longitude.toFixed(4)} • 
                        Submitted {format(new Date(sub.created_at), "MMM d, yyyy")}
                        {sub.has_lighting && " • 💡 Has lighting"}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => approveField.mutate({ submission: sub, approved: true })}
                        disabled={approveField.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveField.mutate({ submission: sub, approved: false })}
                        disabled={approveField.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed submissions */}
      {processed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processed Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sports</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processed.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.name}</TableCell>
                    <TableCell>{sub.sports?.join(", ")}</TableCell>
                    <TableCell>{sub.address || `${sub.latitude.toFixed(3)}, ${sub.longitude.toFixed(3)}`}</TableCell>
                    <TableCell>{format(new Date(sub.created_at), "MMM d")}</TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
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

export default FieldSubmissionsTab;
