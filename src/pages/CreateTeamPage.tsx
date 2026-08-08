import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useCreateTeam } from "@/hooks/useTeams";
import { TeamForm, type TeamFormValues } from "@/features/teams/TeamForm";
import { toast } from "sonner";

const CreateTeamPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createTeam = useCreateTeam();

  const handleSubmit = async (values: TeamFormValues) => {
    if (!user) return;
    try {
      const team = await createTeam.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        sport: values.sport,
        team_size: values.teamSize,
        logo_url: values.logoUrl || undefined,
        visibility: values.visibility,
      });

      // Sonner draws its own success mark; the 🎉 was a second one.
      toast.success("Team created");
      navigate(`/team/${team.id}`);
    } catch {
      toast.error("Failed to create team");
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container max-w-3xl py-8 md:py-10">
          <div className="mb-8 flex items-start gap-3">
            <Button aria-label="Back" variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div className="pt-0.5">
              <p className="eyebrow mb-2">Build your squad</p>
              <h1 className="page-title">Create a Team</h1>
              <p className="max-w-xl text-muted-foreground">
                Create a shared identity, set the roster size, and decide how players can join.
              </p>
            </div>
          </div>

          <TeamForm mode="create" onSubmit={handleSubmit} isSubmitting={createTeam.isPending} />
        </div>
      </div>
    </Layout>
  );
};

export default CreateTeamPage;
