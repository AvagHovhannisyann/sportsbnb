import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { ErrorPanel, StatusPanel } from "@/components/common/StatusPanel";
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
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">Loading team details…</p>
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
        <div className="container">
          <StatusPanel
            icon={UsersRound}
            title="Team not found"
            description="This team doesn't exist or you don't have access."
          >
            <Button onClick={() => navigate("/teams")}>Back to teams</Button>
          </StatusPanel>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container max-w-3xl py-8 md:py-10">
          <div className="mb-8 flex items-start gap-3">
            <Button aria-label="Back" variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div className="pt-0.5">
              <p className="eyebrow mb-2">Team settings</p>
              <h1 className="page-title">Edit Team</h1>
              <p className="max-w-xl text-muted-foreground">
                Update {team.name}'s identity, roster size, and join visibility.
              </p>
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
