import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useAdmin";

interface RequireRoleProps {
  role: "owner" | "admin";
  children: ReactNode;
}

/**
 * Role-aware route guard. Wrap inside ProtectedRoute (auth is assumed).
 * - owner: profiles.user_type must be "owner"
 * - admin: user_roles must hold admin/moderator
 */
export function RequireRole({ role, children }: RequireRoleProps) {
  const { user, profile, isLoading, isProfileLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();

  // Wait for the profile too, not just the session. The owner check below
  // reads profile.user_type; deciding it against a not-yet-loaded profile
  // redirected legitimate owners off their own dashboard to /dashboard, and
  // from there PlayerDashboard forwarded them into player onboarding.
  if (
    isLoading ||
    (user && isProfileLoading) ||
    (role === "admin" && roleLoading)
  ) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Checking your access">
        <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (role === "owner" && profile?.user_type !== "owner" && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  if (role === "admin" && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
