import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  Braces,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Plug,
  ScrollText,
  Settings,
  Timer,
  User,
  WalletCards,
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

interface OwnerLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

const navigationSections: NavigationSection[] = [
  {
    label: "Workspace",
    items: [
      { name: "Overview", href: "/owner-dashboard", icon: LayoutDashboard, exact: true },
      { name: "Venues", href: "/owner/venues", icon: Building2 },
      { name: "Schedule", href: "/owner/schedule", icon: CalendarDays },
      { name: "Bookings", href: "/owner/bookings", icon: ClipboardCheck },
    ],
  },
  {
    label: "Insights",
    items: [
      { name: "Earnings", href: "/owner/earnings", icon: WalletCards },
      { name: "Analytics", href: "/owner/analytics", icon: ChartNoAxesCombined },
    ],
  },
  {
    label: "Venue setup",
    items: [
      { name: "Opening Hours", href: "/owner/hours", icon: Timer },
      { name: "Pricing", href: "/owner/pricing", icon: BadgeDollarSign },
      { name: "Equipment", href: "/owner/equipment", icon: Package },
      { name: "Policies", href: "/owner/policies", icon: ScrollText },
    ],
  },
  {
    label: "Tools",
    items: [
      { name: "Integrations", href: "/owner/integrations", icon: Plug },
      { name: "Booking Widget", href: "/owner/widget", icon: Braces },
      { name: "Messages", href: "/messages", icon: MessageCircle },
      { name: "Settings", href: "/owner/settings", icon: Settings },
    ],
  },
];

function isNavigationItemActive(pathname: string, item: NavigationItem) {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

interface OwnerSidebarContentProps {
  pathname: string;
  initials: string;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  onNavigate?: () => void;
  onOpenProfile: () => void;
  onSignOut: () => Promise<void>;
}

function OwnerSidebarContent({
  pathname,
  initials,
  fullName,
  email,
  avatarUrl,
  onNavigate,
  onOpenProfile,
  onSignOut,
}: OwnerSidebarContentProps) {
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
            <span className="block truncate font-display text-[0.9375rem] font-semibold leading-5 tracking-extra-tight">
              Sportsbnb
            </span>
            <span className="block truncate text-[0.6875rem] font-medium leading-4 text-muted-foreground">
              Owner workspace
            </span>
          </span>
        </Link>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Owner workspace" className="space-y-5 px-3 py-4">
          {navigationSections.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-3 text-[0.6875rem] font-semibold leading-4 tracking-wide text-muted-foreground">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = isNavigationItemActive(pathname, item);

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar lg:min-h-9 lg:py-1.5",
                        isActive
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                      )}
                      onClick={onNavigate}
                    >
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-sidebar-primary"
                        />
                      )}
                      <item.icon
                        aria-hidden="true"
                        className={cn("h-[1.125rem] w-[1.125rem] shrink-0", isActive && "text-sidebar-primary")}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={avatarUrl || ""} />
            <AvatarFallback className="bg-primary-soft text-sm font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {fullName || "Venue Owner"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{email || ""}</p>
          </div>
        </div>

        <div className="mt-2 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 flex-1 justify-start text-sidebar-foreground hover:bg-sidebar-accent lg:min-h-9"
            onClick={onOpenProfile}
          >
            <User aria-hidden="true" className="mr-1 h-4 w-4" />
            Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 min-w-11 px-0 text-destructive hover:bg-destructive/10 hover:text-destructive lg:min-h-9 lg:min-w-9"
            aria-label="Sign out"
            onClick={onSignOut}
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OwnerLayout({ children, title, subtitle }: OwnerLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleProfileNavigation = () => {
    setSidebarOpen(false);
    navigate("/profile");
  };

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase() || "O";

  const sidebarContentProps = {
    pathname: location.pathname,
    initials,
    fullName: profile?.full_name,
    email: profile?.email,
    avatarUrl: profile?.avatar_url,
    onOpenProfile: handleProfileNavigation,
    onSignOut: handleSignOut,
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-sidebar-border bg-sidebar lg:block">
        <OwnerSidebarContent {...sidebarContentProps} />
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 sm:gap-3 sm:px-5 lg:px-8">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 lg:hidden"
                aria-label="Open owner navigation"
              >
                <Menu aria-hidden="true" className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="!w-[calc(100vw-1rem)] !max-w-xs gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-xl data-[state=closed]:!duration-150 data-[state=open]:!duration-200 motion-reduce:data-[state=closed]:!animate-none motion-reduce:data-[state=open]:!animate-none [&>button]:right-2.5 [&>button]:top-2.5 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-lg [&>button]:opacity-100 [&>button]:hover:bg-sidebar-accent"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Owner navigation</SheetTitle>
                <SheetDescription>Manage your venues, bookings, and business settings.</SheetDescription>
              </SheetHeader>
              <OwnerSidebarContent
                {...sidebarContentProps}
                onNavigate={() => setSidebarOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            {title && (
              <div className="min-w-0">
                <h1 className="truncate font-display text-lg font-semibold leading-6 tracking-extra-tight text-foreground sm:text-xl">
                  {title}
                </h1>
                {subtitle && (
                  <p className="line-clamp-2 text-xs leading-4 text-muted-foreground sm:line-clamp-1 sm:text-sm sm:leading-5">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-11 min-w-11 shrink-0 px-0 text-muted-foreground hover:text-foreground sm:h-9 sm:min-w-0 sm:px-3"
          >
            <Link to="/" aria-label="Back to site">
              <ChevronLeft aria-hidden="true" className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Back to site</span>
            </Link>
          </Button>
        </header>

        <main className="px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}

export default OwnerLayout;
