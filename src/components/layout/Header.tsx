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
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isLoading } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const isOwner = profile?.user_type === "owner" || user?.user_metadata?.user_type === "owner";

  const navLinks = [
    { href: "/venues", label: "Venues" },
    { href: "/games", label: "Games" },
    { href: "/teams", label: "Teams" },
    { href: "/community", label: "Community" },
    ...(user ? [{ href: "/dashboard", label: "My Activity" }] : []),
  ];

  const isActive = (path: string) => {
    const pathname = location.pathname;

    switch (path) {
      case "/venues":
        return (
          pathname === "/venues" ||
          pathname.startsWith("/venues/") ||
          pathname.startsWith("/venue/") ||
          pathname.startsWith("/nearby")
        );
      case "/games":
        return pathname === "/games" || pathname === "/create-game" || pathname.startsWith("/game/");
      case "/teams":
        return (
          pathname === "/teams" ||
          pathname === "/create-team" ||
          pathname.startsWith("/team/") ||
          pathname.startsWith("/join-team/")
        );
      case "/community":
        return pathname === "/community";
      case "/dashboard":
        return (
          pathname === "/dashboard" ||
          pathname === "/my-bookings" ||
          pathname.startsWith("/booking/") ||
          pathname.startsWith("/book/") ||
          pathname.startsWith("/pay/")
        );
      default:
        return pathname === path;
    }
  };

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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      {/* Three-part bar rather than two. The links used to sit in the same
          flex group as the wordmark, so at 1440 they clustered against the
          left edge and left ~600px of dead space between "Community" and
          "Sign in". Absolute centring — rather than a flex-1 spacer — keeps
          them on the true centre line regardless of how wide the wordmark or
          the action group happen to be, which is what makes it read as
          deliberate instead of incidental.

          The desktop nav also moved from md (768) to lg (1024). Centring it
          revealed that at 768 it genuinely collided — measured at -15px
          against the wordmark and -3px against the actions — and stayed tight
          to roughly 900px. Below lg the bar now uses the existing menu. */}
      <div className="container relative flex h-14 items-center justify-between gap-4 px-4 md:h-[64px] md:gap-6 md:px-6">
        <div className="flex items-center">
          <Link
            to="/"
            aria-label="Sportsbnb home"
            className="flex min-h-11 shrink-0 items-center rounded-md opacity-95 transition-opacity duration-150 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Logo
              variant="full"
              className="h-9 w-auto md:h-11"
            />
          </Link>
        </div>

        <nav
          aria-label="Primary navigation"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 lg:flex"
        >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`relative rounded-md px-3.5 py-2 text-meta transition-colors duration-150 ${
                  isActive(link.href)
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground font-medium hover:text-foreground"
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute left-3.5 right-3.5 -bottom-[17px] h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          {/* Before the account controls, and shown whether or not anyone is
              signed in: a visitor who cannot read the page needs this before
              they need anything else on it. */}
          <LanguageSwitcher />

          {!isLoading && user ? (
            <>
              {/* Was a <Link> wrapping a <Button>: a link containing a
                  button is invalid nesting, and neither carried a name, so
                  both announced as unlabelled on every page. `asChild`
                  collapses them into one anchor with the button's styling. */}
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative rounded-full text-foreground-soft hover:text-foreground"
              >
                <Link to="/messages" aria-label="Messages">
                  <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
                  <ChatBadge />
                </Link>
              </Button>

              <NotificationDropdown />

              <span className="mx-1 h-6 w-px bg-border" aria-hidden />

              {isOwner && (
                <Button asChild size="sm" variant="outline" className="gap-1.5 h-9">
                  <Link to="/add-venue">
                    <Building className="h-4 w-4" />
                    List venue
                  </Link>
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {/* An avatar image with no alt and no label: the account
                      menu was an anonymous button on every page. */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full ml-1 h-10 w-10"
                    aria-label="Account menu"
                  >
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
              <Button asChild variant="ghost" size="sm" className="text-foreground-soft hover:text-foreground">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="h-9 px-4">
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          ) : null}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 lg:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation-menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-navigation-menu"
          className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-border bg-background lg:hidden md:max-h-[calc(100dvh-4rem)]"
        >
          <nav aria-label="Mobile navigation" className="container flex flex-col gap-2 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-150 ${
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
                  {/* Mobile List Venue — owners only */}
                  {isOwner && (
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to="/add-venue" onClick={() => setMobileMenuOpen(false)}>
                        <Building className="h-4 w-4 mr-2" />
                        List Venue
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="relative w-full justify-start">
                    <Link to="/messages" onClick={() => setMobileMenuOpen(false)}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Messages
                      <ChatBadge />
                    </Link>
                  </Button>
                  <div className="border-t border-border my-2" />
                  <Button asChild variant="ghost" className="w-full justify-start">
                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
                  </Button>
                  {isAdmin && (
                    <Button asChild variant="ghost" className="w-full justify-start">
                      <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    </Button>
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
                  <Button asChild className="w-full" size="lg">
                    <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>Get started — it's free</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Already have an account? Sign in</Link>
                  </Button>
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
