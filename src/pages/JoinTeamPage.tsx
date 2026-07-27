import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useJoinTeamByCode } from "@/hooks/useTeams";
import { toast } from "sonner";

const JoinTeamPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const joinByCode = useJoinTeamByCode();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?redirect=/join-team/${code}`);
      return;
    }
    if (!code) {
      navigate("/teams");
      return;
    }

    const join = async () => {
      try {
        const result = await joinByCode.mutateAsync(code);
        toast.success(result.message);
        navigate(`/team/${result.team.id}`);
      } catch (e: any) {
        toast.error(e.message || "Invalid invite link");
        navigate("/teams");
      }
    };

    join();
  }, [user, authLoading, code]);

  return (
    <Layout>
      <div className="container py-16 text-center" role="status" aria-label="Loading the team">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Joining team...</p>
      </div>
    </Layout>
  );
};

export default JoinTeamPage;
