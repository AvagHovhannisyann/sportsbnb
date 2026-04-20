import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Plus, Settings, MapPin, Clock, MoreHorizontal, Loader2, ShieldCheck, MessageCircle, Inbox, TrendingUp, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerVenues, getVenueImage } from "@/hooks/useVenues";
import { useOwnerLeads, summarizeLeads } from "@/hooks/useLeads";
import { LeadInboxCard } from "@/components/owner/LeadInboxCard";
import { OwnerCoachCard } from "@/components/dashboard/OwnerCoachCard";
import { ListingHealthCard } from "@/components/owner/ListingHealthCard";
import { formatPrice } from "@/lib/pricing";

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { data: leads = [], isLoading: leadsLoading } = useOwnerLeads();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
    if (!authLoading && user && profile && !profile.onboarding_completed) navigate("/onboarding/owner");
  }, [user, profile, authLoading, navigate]);

  const { data: myVenues = [], isLoading: venuesLoading } = useOwnerVenues(user?.id);
  const activeVenues = myVenues.filter((v) => v.is_active);
  const pendingVenues = myVenues.filter((v) => !v.is_active);

  const summary = useMemo(() => summarizeLeads(leads), [leads]);
  const avgRating = useMemo(() => {
    if (myVenues.length === 0) return 0;
    const rated = myVenues.filter((v) => v.rating);
    if (rated.length === 0) return 0;
    return rated.reduce((s, v) => s + (v.rating || 0), 0) / rated.length;
  }, [myVenues]);
  const totalReviews = useMemo(() => myVenues.reduce((s, v) => s + (v.review_count || 0), 0), [myVenues]);

  if (authLoading) {
    return (
      <Layout>
        <div className="container py-16 text-center"><p className="text-muted-foreground">Loading...</p></div>
      </Layout>
    );
  }

  // Hero highlight — most actionable
  const hero = (() => {
    if (summary.pending > 0) return { title: `${summary.pending} lead${summary.pending > 1 ? "s" : ""} need${summary.pending > 1 ? "" : "s"} a reply`, subtitle: "Open WhatsApp and confirm or decline so we can track your conversion.", cta: "Open inbox", href: "#lead-inbox" };
    if (myVenues.length === 0) return { title: "Add your first venue", subtitle: "Listings with 5+ photos get 60% more leads.", cta: "Add venue", href: "/add-venue" };
    return { title: "Inbox is clear ✓", subtitle: `Reputation ${avgRating ? avgRating.toFixed(1) : "—"} from ${totalReviews} reviews. Keep responding fast.`, cta: "View venues", href: "/my-venues" };
  })();

  const stats = [
    { label: "New leads (7d)", value: summary.total7d.toString(), icon: Inbox, color: "text-primary", bg: "bg-primary/10" },
    { label: "Response rate", value: `${summary.responseRate}%`, icon: Zap, color: "text-amber-600", bg: "bg-amber-500/10" },
    { label: "Confirmed bookings", value: summary.confirmed.toString(), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Reputation", value: avgRating ? avgRating.toFixed(1) : "—", icon: Star, color: "text-violet-600", bg: "bg-violet-500/10", subValue: totalReviews ? `${totalReviews} reviews` : undefined },
  ];

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Owner Cockpit</h1>
              <p className="text-muted-foreground">Leads, reputation and listings — all in one view.</p>
            </div>
            <Link to="/add-venue"><Button><Plus className="h-4 w-4 mr-2" />Add Venue</Button></Link>
          </div>

          {/* Hero highlight */}
          <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Inbox className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Today</div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground">{hero.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{hero.subtitle}</p>
                </div>
              </div>
              {hero.href.startsWith("#") ? (
                <Button size="lg" onClick={() => document.getElementById(hero.href.slice(1))?.scrollIntoView({ behavior: "smooth" })}>{hero.cta}</Button>
              ) : (
                <Link to={hero.href}><Button size="lg">{hero.cta}</Button></Link>
              )}
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label}>
                  <CardContent className="pt-6">
                    <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    {stat.subValue && <div className="text-xs text-muted-foreground mt-1">{stat.subValue}</div>}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2" id="lead-inbox">
              <LeadInboxCard />
            </div>
            <div className="space-y-6">
              <OwnerCoachCard />
              <Card>
                <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Link to="/add-venue" className="block"><Button variant="outline" className="w-full justify-start"><Plus className="h-4 w-4 mr-2" />Add New Venue</Button></Link>
                  <Link to="/messages" className="block"><Button variant="outline" className="w-full justify-start"><MessageCircle className="h-4 w-4 mr-2" />Messages</Button></Link>
                  <Link to="/owner-schedule" className="block"><Button variant="outline" className="w-full justify-start"><Calendar className="h-4 w-4 mr-2" />Manage Schedule</Button></Link>
                  <Link to="/profile" className="block"><Button variant="outline" className="w-full justify-start"><Settings className="h-4 w-4 mr-2" />Account Settings</Button></Link>
                </CardContent>
              </Card>
              <ListingHealthCard />
            </div>
          </div>

          {/* My Venues */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">My Venues</h2>
              <Link to="/my-venues" className="text-sm text-primary hover:underline">Manage all</Link>
            </div>

            {venuesLoading ? (
              <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
            ) : myVenues.length > 0 ? (
              <div className="space-y-6">
                {pendingVenues.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <h3 className="font-medium text-foreground">Pending Approval ({pendingVenues.length})</h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pendingVenues.map((venue) => (
                        <Card key={venue.id} className="overflow-hidden border-amber-500/30 bg-amber-500/5">
                          <div className="aspect-[16/9] relative">
                            <img src={getVenueImage(venue)} alt={venue.name} className="w-full h-full object-cover opacity-75" />
                            <Badge variant="secondary" className="absolute top-3 left-3 bg-amber-500 text-white"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-foreground mb-1">{venue.name}</h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3"><MapPin className="h-3 w-3" /><span className="truncate">{venue.address || venue.city}</span></div>
                            <Link to={`/venue/${venue.id}/edit`}><Button variant="outline" size="sm" className="w-full">Edit</Button></Link>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                {activeVenues.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <h3 className="font-medium text-foreground">Active Venues ({activeVenues.length})</h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeVenues.map((venue) => (
                        <Card key={venue.id} className="overflow-hidden">
                          <div className="aspect-[16/9] relative">
                            <img src={getVenueImage(venue)} alt={venue.name} className="w-full h-full object-cover" />
                            <div className="absolute top-3 right-3"><Button variant="secondary" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></div>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-foreground mb-1">{venue.name}</h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3"><MapPin className="h-3 w-3" /><span className="truncate">{venue.address || venue.city}</span></div>
                            <div className="flex items-center justify-between">
                              <div className="text-sm"><span className="font-medium text-foreground">{formatPrice(venue.price_per_hour)}</span><span className="text-muted-foreground">/hr</span></div>
                              <Link to={`/venue/${venue.id}/edit`}><Button variant="outline" size="sm">Edit</Button></Link>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">You haven't added any venues yet.</p>
                <Link to="/add-venue"><Button><Plus className="h-4 w-4 mr-2" />Add Your First Venue</Button></Link>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OwnerDashboard;
