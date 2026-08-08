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

  const isActive = (path: string) => {
    const pathname = location.pathname;
    const isOwnerManagementRoute =
      pathname === "/owner-dashboard" ||
      pathname.startsWith("/owner/") ||
      pathname === "/add-venue" ||
      /^\/venue\/[^/]+\/(edit|availability)$/.test(pathname);

    switch (path) {
      case "/venues":
        return (
          pathname === "/venues" ||
          pathname.startsWith("/venues/") ||
          pathname.startsWith("/nearby") ||
          pathname === "/games" ||
          pathname === "/create-game" ||
          pathname.startsWith("/game/") ||
          pathname === "/teams" ||
          pathname === "/create-team" ||
          pathname.startsWith("/team/") ||
          pathname.startsWith("/join-team/") ||
          pathname === "/community" ||
          (pathname.startsWith("/venue/") && !isOwnerManagementRoute)
        );
      case "/messages":
        return pathname === "/messages" || pathname.startsWith("/messages/");
      case "/owner-dashboard":
        return isOwnerManagementRoute;
      case "/dashboard":
        return (
          pathname === "/dashboard" ||
          pathname === "/my-bookings" ||
          pathname.startsWith("/booking/") ||
          pathname.startsWith("/book/") ||
          pathname.startsWith("/pay/")
        );
      case "/profile":
        return pathname === "/profile";
      case "/for-owners":
        return pathname === "/for-owners" || pathname === "/demo";
      case "/login":
        return ["/login", "/signup", "/forgot-password", "/reset-password"].includes(pathname);
      default:
        return pathname === path;
    }
  };

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="safe-area-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background shadow-[0_-1px_8px_hsl(var(--foreground)/0.06)] md:hidden"
    >
      <div
        className="grid h-16"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr)) 4rem` }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              aria-current={active ? "page" : undefined}
              className="relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 transition-colors duration-150"
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
              )}
              <Icon
                className={`h-[22px] w-[22px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden="true"
              />
              <span
                className={`max-w-full truncate text-xs tracking-tight leading-none ${
                  active ? "text-primary font-semibold" : "text-muted-foreground font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
        {/* The final column is reserved for AIChatbot's mobile dock button.
            Keeping it in the navigation grid prevents the global launcher
            from covering booking controls, article links, or page copy. */}
        <span aria-hidden="true" />
      </div>
    </nav>
  );
};

export default MobileNav;
