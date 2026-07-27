import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { useAuth } from "@/hooks/useAuth";
import { useTeamById, useUpdateTeam } from "@/hooks/useTeams";
import { TeamForm, type TeamFormValues } from "@/features/teams/TeamForm";
import { toast } from "sonner";

/**
 * Editing a team.
 *
 * `TeamDetailsPage` has offered the captain an "Edit Team" item pointing at
 * `/team/:id/edit` for as long as it has existed, and there was no such route:
 * React Router matched the `path="*"` catch-all and served the 404 page. No
 * error, no log, and every browser audit here loaded the team page and passed.
 * `scripts/dead-routes.mjs` is what found it and what keeps it found.
 *
 * The form is `VenueForm`'s arrangement: one component shared with the create
 * page, differing only in its initial values and its submit label.
 */
const EditTeamPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { data: team, isLoading, isError, refetch, isFetching } = useTeamById(id);
  const updateTeam = useUpdateTeam();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  // Only the owner may edit. The database enforces this too — the check here
  // is so the captain of a team they merely play for is told, rather than
  // filling in a form whose save is going to be rejected.
  useEffect(() => {
    if (team && user && team.owner_id !== user.id) {
      toast.error("Only the team owner can edit this team");
      navigate(`/team/${team.id}`);
    }
  }, [team, user, navigate]);

  const handleSubmit = async (values: TeamFormValues) => {
    if (!id) return;
    try {
      await updateTeam.mutateAsync({
        teamId: id,
        name: values.name,
        description: values.description || null,
        sport: values.sport,
        team_size: values.teamSize,
        logo_url: values.logoUrl,
        visibility: values.visibility,
      });
      toast.success("Team updated");
      navigate(`/team/${id}`);
    } catch {
      toast.error("Failed to update team");
    }
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center" role="status" aria-label="Loading the team">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" aria-hidden="true" />
        </div>
      </Layout>
    );
  }

  // A failed request is not an absent team. Saying "this team doesn't exist"
  // when the fetch fell over is the class of claim `error-affordance.mjs`
  // exists to catch.
  if (isError) {
    return (
      <Layout>
        <div className="container max-w-lg py-12">
          <ErrorPanel
            what="this team"
            description="We couldn't load the team. Nothing has been changed."
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        </div>
      </Layout>
    );
  }

  if (!team) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Team Not Found</h1>
          <p className="text-muted-foreground mb-4">This team doesn't exist or you don't have access.</p>
          <Button onClick={() => navigate("/teams")}>Back to Teams</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8 max-w-2xl">
          <div className="flex items-center gap-4 mb-8">
            <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div>
              <h1 className="page-title">Edit Team</h1>
              <p className="text-muted-foreground">Update {team.name}</p>
            </div>
          </div>

          <TeamForm
            mode="edit"
            initialValues={{
              name: team.name ?? "",
              description: team.description ?? "",
              sport: team.sport ?? "",
              teamSize: team.team_size ?? 10,
              visibility: team.visibility ?? "public",
              logoUrl: team.logo_url ?? null,
            }}
            onSubmit={handleSubmit}
            isSubmitting={updateTeam.isPending}
          />
        </div>
      </div>
    </Layout>
  );
};

export default EditTeamPage;
