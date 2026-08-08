import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Logo from "@/components/brand/Logo";
import { useAuth } from "@/hooks/useAuth";

// This page is deprecated - owners now go directly to the dashboard
// and add venues from there using the AddVenuePage
const OwnerOnboarding = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate("/login", { replace: true });
      } else if (profile?.user_type === 'owner') {
        navigate("/owner-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, profile, isLoading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-xs" role="status" aria-label="Opening your Sportsbnb workspace">
        <div className="flex justify-center">
          <Logo variant="full" className="h-10 w-auto" />
        </div>
        <Loader2 className="mx-auto mt-7 h-6 w-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-foreground">Opening your workspace</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          We’re taking you to the right dashboard for your account.
        </p>
      </div>
    </div>
  );
};

export default OwnerOnboarding;
