import { Link, useLocation } from "react-router-dom";
import { Search, LayoutDashboard, User, MessageCircle, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const MobileNav = () => {
  const location = useLocation();
  const { user, profile } = useAuth();
  const isOwner = profile?.user_type === "owner" || user?.user_metadata?.user_type === "owner";

  const navItems = user
    ? isOwner
      ? [
          { href: "/venues", label: "Explore", icon: Search },
          { href: "/messages", label: "Messages", icon: MessageCircle },
          { href: "/owner-dashboard", label: "Manage", icon: Building2 },
          { href: "/dashboard", label: "Activity", icon: LayoutDashboard },
          { href: "/profile", label: "Profile", icon: User },
        ]
      : [
          { href: "/venues", label: "Explore", icon: Search },
          { href: "/messages", label: "Messages", icon: MessageCircle },
          { href: "/dashboard", label: "Activity", icon: LayoutDashboard },
          { href: "/profile", label: "Profile", icon: User },
        ]
    : [
        { href: "/venues", label: "Explore", icon: Search },
        { href: "/for-owners", label: "For Owners", icon: Building2 },
        { href: "/login", label: "Sign in", icon: User },
      ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/85 safe-area-bottom shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)]">
      <div className={`grid h-16`} style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className="relative flex flex-col items-center justify-center gap-1 transition-colors"
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
              )}
              <Icon
                className={`h-[22px] w-[22px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span
                className={`text-[10px] tracking-tight leading-none ${
                  active ? "text-primary font-semibold" : "text-muted-foreground font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
