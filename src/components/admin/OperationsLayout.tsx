import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChevronLeft,
  LogOut,
  Menu,
  Send,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export interface OperationsLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

interface OperationsNavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  end?: boolean;
}

const operationsNavigation: OperationsNavigationItem[] = [
  { name: "Admin", href: "/admin", icon: ShieldCheck, end: true },
  { name: "Operator", href: "/operator", icon: BarChart3, end: true },
  { name: "Outreach", href: "/operator/outreach", icon: Send, end: true },
];

interface OperationsSidebarProps {
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  initials: string;
  onNavigate?: () => void;
  onSignOut: () => Promise<void>;
}

function OperationsSidebar({
  fullName,
  email,
  avatarUrl,
  initials,
  onNavigate,
  onSignOut,
}: OperationsSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex min-h-16 items-center border-b border-sidebar-border px-4 pr-16 lg:pr-4">
        <Link
          to="/"
          className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
          onClick={onNavigate}
        >
          <img src="/favicon.png" alt="" className="h-7 w-7 rounded-md" />
          <span className="min-w-0">
            <span className="block truncate font-display text-ui font-semibold leading-5 tracking-extra-tight">
              Sportsbnb
            </span>
            <span className="block truncate text-xs font-medium leading-4 text-muted-foreground">
              Operations
            </span>
          </span>
        </Link>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Operations workspace" className="px-3 py-4">
          <p className="mb-1.5 px-3 text-xs font-semibold leading-4 tracking-wide text-muted-foreground">
            Workspaces
          </p>
          <div className="space-y-0.5">
            {operationsNavigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar lg:min-h-9 lg:py-1.5 motion-reduce:transition-none",
                    isActive
                      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-sidebar-primary"
                      />
                    )}
                    <item.icon
                      aria-hidden="true"
                      className={cn(
                        "h-[1.125rem] w-[1.125rem] shrink-0",
                        isActive && "text-sidebar-primary",
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={avatarUrl || ""} alt="" />
            <AvatarFallback className="bg-primary-soft text-sm font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {fullName || "Operations user"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{email || ""}</p>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-[1fr_auto] gap-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="min-h-11 justify-start text-sidebar-foreground hover:bg-sidebar-accent lg:min-h-9"
          >
            <Link to="/profile" onClick={onNavigate}>
              <User aria-hidden="true" />
              Profile
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 min-w-11 px-0 text-destructive hover:bg-destructive/10 hover:text-destructive lg:min-h-9 lg:min-w-9"
            aria-label="Sign out"
            onClick={onSignOut}
          >
            <LogOut aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OperationsLayout({ children, title, subtitle, actions }: OperationsLayoutProps) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [navigationOpen, setNavigationOpen] = useState(false);

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    profile?.email?.charAt(0).toUpperCase() ||
    "A";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const sidebarProps = {
    fullName: profile?.full_name,
    email: profile?.email,
    avatarUrl: profile?.avatar_url,
    initials,
    onSignOut: handleSignOut,
  };

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#operations-main"
        className="sr-only fixed left-4 top-3 z-[100] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      >
        Skip to operations content
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-sidebar-border bg-sidebar lg:block">
        <OperationsSidebar {...sidebarProps} />
      </aside>

      <div className="lg:pl-56">
        <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-2 border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 sm:gap-3 sm:px-5 lg:px-7">
          <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 lg:hidden"
                aria-label="Open operations navigation"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="!w-[calc(100vw-1rem)] !max-w-xs gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-xl data-[state=closed]:!duration-150 data-[state=open]:!duration-200 motion-reduce:data-[state=closed]:!animate-none motion-reduce:data-[state=open]:!animate-none [&>button]:right-2.5 [&>button]:top-2.5 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-lg [&>button]:opacity-100 [&>button]:hover:bg-sidebar-accent"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Operations navigation</SheetTitle>
                <SheetDescription>Move between administration, marketplace metrics, and venue outreach.</SheetDescription>
              </SheetHeader>
              <OperationsSidebar
                {...sidebarProps}
                onNavigate={() => setNavigationOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-semibold leading-6 tracking-extra-tight text-foreground sm:text-xl">
              {title}
            </h1>
            {subtitle && (
              <p className="line-clamp-2 text-xs leading-4 text-muted-foreground sm:line-clamp-1 sm:text-sm sm:leading-5">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="order-3 flex w-full flex-wrap items-center gap-2 pl-[3.25rem] sm:order-none sm:w-auto sm:pl-0">
              {actions}
            </div>
          )}

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-11 min-w-11 shrink-0 px-0 text-muted-foreground hover:text-foreground sm:min-w-0 sm:px-3 lg:h-9"
          >
            <Link to="/" aria-label="Back to site">
              <ChevronLeft aria-hidden="true" className="sm:mr-1" />
              <span className="hidden sm:inline">Back to site</span>
            </Link>
          </Button>
        </header>

        <main
          id="operations-main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[90rem] px-4 py-5 outline-none sm:px-6 sm:py-6 lg:px-7 lg:py-7"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default OperationsLayout;
