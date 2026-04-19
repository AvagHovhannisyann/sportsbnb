import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, Building, Shield, MessageCircle } from "lucide-react";
import { useIsAdmin } from "@/hooks/useAdmin";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import { ChatBadge } from "@/components/chat/ChatBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isLoading } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  const navLinks = [
    { href: "/venues", label: "Venues" },
    { href: "/games", label: "Games" },
    { href: "/teams", label: "Teams" },
    { href: "/community", label: "Community" },
    ...(user ? [{ href: "/dashboard", label: "My Activity" }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getUserInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || "";
    if (name.includes("@")) {
      return name.charAt(0).toUpperCase();
    }
    return name.split(" ").map((n: string) => n.charAt(0)).join("").toUpperCase().slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 md:h-[68px] items-center justify-between">
        <div className="flex items-center gap-6 md:gap-10">
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src="/favicon.png"
              alt="Sportsbnb"
              className="h-8 w-8 md:h-9 md:w-9 rounded-lg transition-transform group-hover:scale-105"
            />
            <span className="font-display text-lg md:text-xl font-bold text-foreground tracking-extra-tight">
              Sportsbnb
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`relative px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive(link.href)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute left-3.5 right-3.5 -bottom-[19px] h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {!isLoading && user ? (
            <>
              <Link to="/messages" className="relative">
                <Button variant="ghost" size="icon" className="relative rounded-full text-foreground-soft hover:text-foreground">
                  <MessageCircle className="h-[18px] w-[18px]" />
                  <ChatBadge />
                </Button>
              </Link>

              <NotificationDropdown />

              <span className="mx-1 h-6 w-px bg-border" aria-hidden />

              <Link to="/add-venue">
                <Button size="sm" variant="outline" className="gap-1.5 h-9">
                  <Building className="h-4 w-4" />
                  List venue
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full ml-1 h-10 w-10">
                    <Avatar className="h-9 w-9 ring-1 ring-border">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5 text-sm font-medium text-foreground truncate">
                    {user.user_metadata?.full_name || user.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">My Activity</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  {(user.user_metadata?.user_type === "owner" || profile?.user_type === "owner") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/owner-dashboard">Owner Dashboard</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : !isLoading ? (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-foreground-soft hover:text-foreground">
                  Sign in
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="h-9 px-4">Get started</Button>
              </Link>
            </>
          ) : null}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <nav className="container py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive(link.href)
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border mt-2 flex flex-col gap-2">
              {!isLoading && user ? (
                <>
                  {/* Mobile List Venue */}
                  <Link to="/add-venue" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start">
                      <Building className="h-4 w-4 mr-2" />
                      List Venue
                    </Button>
                  </Link>
                  <Link to="/messages" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start relative">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Messages
                      <ChatBadge />
                    </Button>
                  </Link>
                  <div className="border-t border-border my-2" />
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Profile</Button>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost" 
                    className="w-full justify-start text-destructive" 
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </>
              ) : !isLoading ? (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Sign in</Button>
                  </Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">Get started</Button>
                  </Link>
                </>
              ) : null}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
