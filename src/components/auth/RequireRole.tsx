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
  const { user, profile, isLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();

  if (isLoading || (role === "admin" && roleLoading)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
