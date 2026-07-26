import { useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  Calendar,
  Gamepad2,
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  MoreHorizontal,
  Eye,
  } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Layout from "@/components/layout/Layout";
import {
  useAdminStats,
  useAllUsers,
  useAllVenues,
  useAllBookings,
  useUpdateUserRole,
  useApproveVenue,
  type AppRole,
} from "@/hooks/useAdmin";
import { format } from "date-fns";
import { AdminPulseCard } from "@/components/dashboard/AdminPulseCard";
import { SupplyDemandHeatmap } from "@/components/admin/SupplyDemandHeatmap";

// FieldSubmissionsTab and CandidateFieldsTab used to be lazy-imported here and
// never rendered — no TabsTrigger, no TabsContent, no route. Both components
// still exist and still work; they simply have no way in. Whether to wire them
// up or delete them is a product call, so the dead imports go and the question
// is written down in docs/handover.md rather than answered here.
const BlogPostsTab = lazy(() => import("@/components/admin/BlogPostsTab"));
const BookingLeadsTab = lazy(() => import("@/components/admin/BookingLeadsTab"));
const PayoutsTab = lazy(() => import("@/components/admin/PayoutsTab"));

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: users, isLoading: usersLoading } = useAllUsers();
  const { data: venues, isLoading: venuesLoading } = useAllVenues();
  const { data: bookings, isLoading: bookingsLoading } = useAllBookings();
  
  const updateRole = useUpdateUserRole();
  const approveVenue = useApproveVenue();

  const formatCurrency = (amount: number) => {
    return `֏${amount.toLocaleString()}`;
  };

  const statCards = [
    {
      label: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Active Venues",
      value: stats?.totalVenues || 0,
      icon: Building2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      subValue: stats?.pendingVenues ? `${stats.pendingVenues} pending` : undefined,
    },
    {
      label: "Lead Volume",
      value: stats?.totalBookings || 0,
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Active Games",
      value: stats?.totalGames || 0,
      icon: Gamepad2,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  const getUserInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || "U";
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Admin</Badge>;
      case "moderator":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Moderator</Badge>;
      default:
        return <Badge variant="secondary">User</Badge>;
    }
  };

  return (
    <Layout>
      <div className="bg-background min-h-screen">
        <div className="container py-8">
          {/* Header */}
          {/* flex-wrap: title block plus the "Operator view" button ran 47px
              past a 375px screen. */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage users, venues, and platform activity</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/operator">
                <TrendingUp className="h-4 w-4 mr-2" />
                Operator view
              </Link>
            </Button>
          </div>

          {/* Stats Grid */}
          {statsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                      {stat.subValue && (
                        <div className="text-xs text-amber-500 mt-1">{stat.subValue}</div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="overflow-x-auto -mx-4 px-4 mb-6">
              <TabsList className="w-max min-w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="leads">Booking Leads</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="venues">Venues</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
                <TabsTrigger value="blog">Blog</TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <AdminPulseCard />
              <SupplyDemandHeatmap />
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Pending Venues */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Pending Venue Approvals
                    </CardTitle>
                    <CardDescription>Venues waiting for verification</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {venuesLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {venues?.filter(v => !v.is_active).slice(0, 5).map((venue) => (
                          <div key={venue.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <div>
                              <p className="font-medium text-foreground">{venue.name}</p>
                              <p className="text-sm text-muted-foreground">{venue.city}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveVenue.mutate({ venueId: venue.id, approved: true })}
                                disabled={approveVenue.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            </div>
                          </div>
                        ))}
                        {(!venues || venues.filter(v => !v.is_active).length === 0) && (
                          <p className="text-center text-muted-foreground py-4">No pending venues</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Recent Bookings
                    </CardTitle>
                    <CardDescription>Latest booking activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bookingsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {bookings?.slice(0, 5).map((booking) => (
                          <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <div>
                              <p className="font-medium text-foreground">{booking.venue_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(booking.booking_date), "MMM d, yyyy")} • {booking.booking_time}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-foreground">{formatCurrency(booking.total_price)}</p>
                              <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                                {booking.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {(!bookings || bookings.length === 0) && (
                          <p className="text-center text-muted-foreground py-4">No bookings yet</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Booking Leads Tab */}
            <TabsContent value="leads">
              <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <BookingLeadsTab />
              </Suspense>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>Manage user accounts and roles</CardDescription>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users?.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar_url || undefined} />
                                  <AvatarFallback>{getUserInitials(user.full_name, user.email)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-foreground">{user.full_name || "No name"}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{user.user_type}</Badge>
                            </TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell>{user.city || "-"}</TableCell>
                            <TableCell>{format(new Date(user.created_at), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-right">
                              <Select
                                value={user.role}
                                onValueChange={(value: AppRole) => updateRole.mutate({ userId: user.user_id, role: value })}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="moderator">Moderator</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Venues Tab */}
            <TabsContent value="venues">
              <Card>
                <CardHeader>
                  <CardTitle>All Venues</CardTitle>
                  <CardDescription>Manage venue listings and approvals</CardDescription>
                </CardHeader>
                <CardContent>
                  {venuesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Venue</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {venues?.map((venue) => (
                          <TableRow key={venue.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground">{venue.name}</p>
                                <p className="text-sm text-muted-foreground">{venue.sports?.join(", ")}</p>
                              </div>
                            </TableCell>
                            <TableCell>{(venue.owner as any)?.full_name || "-"}</TableCell>
                            <TableCell>{venue.city}</TableCell>
                            <TableCell>{formatCurrency(venue.price_per_hour)}/hr</TableCell>
                            <TableCell>
                              {venue.is_active ? (
                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild>
                                    <Link to={`/venue/${venue.id}`}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Link>
                                  </DropdownMenuItem>
                                  {venue.is_active ? (
                                    <DropdownMenuItem
                                      onClick={() => approveVenue.mutate({ venueId: venue.id, approved: false })}
                                      className="text-destructive"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Disable
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => approveVenue.mutate({ venueId: venue.id, approved: true })}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <Card>
                <CardHeader>
                  <CardTitle>All Bookings</CardTitle>
                  <CardDescription>View all platform bookings</CardDescription>
                </CardHeader>
                <CardContent>
                  {bookingsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Venue</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings?.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">{booking.venue_name}</TableCell>
                            <TableCell>{format(new Date(booking.booking_date), "MMM d, yyyy")}</TableCell>
                            <TableCell>{booking.booking_time}</TableCell>
                            <TableCell>{booking.duration_hours}h</TableCell>
                            <TableCell>{formatCurrency(booking.total_price)}</TableCell>
                            <TableCell>
                              <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                                {booking.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Games / Fields / Discovery tabs hidden for MVP */}

            {/* Blog Tab */}
            <TabsContent value="payouts">
              <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <PayoutsTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="blog">
              <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <BlogPostsTab />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
