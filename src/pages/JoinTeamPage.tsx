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
      <div className="container max-w-lg py-12 md:py-20" role="status" aria-live="polite">
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary-soft text-primary">
            <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Joining team</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            We're checking the invite and your access. You'll continue to the team when this is complete.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default JoinTeamPage;
