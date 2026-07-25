import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Clock,
  Banknote,
  FileText,
  Link2,
  MessageCircle,
  Settings,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  User,
  Code,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface OwnerLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const navigation = [
  { name: "Overview", href: "/owner-dashboard", icon: LayoutDashboard },
  { name: "Venues", href: "/owner/venues", icon: Building2 },
  { name: "Schedule", href: "/owner/schedule", icon: Calendar },
  { name: "Bookings", href: "/owner/bookings", icon: Clock },
  { name: "Earnings", href: "/owner/earnings", icon: Banknote },
  { name: "Opening Hours", href: "/owner/hours", icon: Clock },
  { name: "Pricing", href: "/owner/pricing", icon: Banknote },
  { name: "Equipment", href: "/owner/equipment", icon: Package },
  { name: "Policies", href: "/owner/policies", icon: FileText },
  { name: "Integrations", href: "/owner/integrations", icon: Link2 },
  { name: "Widget", href: "/owner/widget", icon: Code },
  { name: "Messages", href: "/messages", icon: MessageCircle },
  { name: "Settings", href: "/owner/settings", icon: Settings },
];

export function OwnerLayout({ children, title, subtitle }: OwnerLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "O";

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r border-border transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo & Close */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <img src="/favicon.png" alt="Sportsbnb" className="h-8 w-8 rounded-lg" />
              <span className="font-semibold text-foreground">Sportsbnb</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="space-y-1 px-3">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* User section */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || "Venue Owner"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.email || ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start"
                onClick={() => navigate("/profile")}
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1">
            {title && (
              <div>
                <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            )}
          </div>

          <Link to="/">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to site
            </Button>
          </Link>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default OwnerLayout;
