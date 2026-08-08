import { lazy, Suspense, useState } from "react";
import { format } from "date-fns";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Eye,
  Gamepad2,
  MoreHorizontal,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AdminPulseCard } from "@/components/dashboard/AdminPulseCard";
import { OperationsLayout } from "@/components/admin/OperationsLayout";
import { Price } from "@/components/ui/price";
import { SupplyDemandHeatmap } from "@/components/admin/SupplyDemandHeatmap";
import { ErrorPanel, StatusPanel } from "@/components/common/StatusPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bookingStatusDescriptor } from "@/features/booking/status";
import {
  type AppRole,
  useAdminStats,
  useAllBookings,
  useAllUsers,
  useAllVenues,
  useApproveVenue,
  useUpdateUserRole,
} from "@/hooks/useAdmin";
import { TONE_CHIP } from "@/lib/chips";
import { formatTimeOfDay } from "@/lib/time";

// These are the three administrative modules that are actually reachable from
// the dashboard. FieldSubmissionsTab and CandidateFieldsTab remain intentionally
// unwired until the product defines an entry point for them.
const BlogPostsTab = lazy(() => import("@/components/admin/BlogPostsTab"));
const BookingLeadsTab = lazy(() => import("@/components/admin/BookingLeadsTab"));
const PayoutsTab = lazy(() => import("@/components/admin/PayoutsTab"));

type VenueDecision = { id: string; name: string } | null;


const initials = (name: string | null, email: string | null) => {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.charAt(0).toUpperCase() || "U";
};

const roleBadge = (role: string) => {
  if (role === "admin") return <Badge className={TONE_CHIP.danger}>Admin</Badge>;
  if (role === "moderator") return <Badge className={TONE_CHIP.warning}>Moderator</Badge>;
  return <Badge variant="secondary">User</Badge>;
};

const LoadingPanel = ({ label = "Loading administration data" }: { label?: string }) => (
  <div className="space-y-3" role="status" aria-label={label}>
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-20 w-full" />
  </div>
);

const LazyPanelFallback = () => (
  <Card>
    <CardContent className="p-5 sm:p-6">
      <LoadingPanel />
    </CardContent>
  </Card>
);

interface MetricCardProps {
  label: string;
  value: number;
  icon: typeof Users;
  detail?: string;
  tone?: "primary" | "information" | "warning" | "neutral";
}

const metricTone = {
  primary: "border-primary/20 bg-primary/10 text-primary",
  information: "border-information/20 bg-information/10 text-information",
  warning: "border-warning/20 bg-warning/10 text-warning",
  neutral: "border-border bg-surface-1 text-muted-foreground",
};

function MetricCard({ label, value, icon: Icon, detail, tone = "neutral" }: MetricCardProps) {
  return (
    <Card className="min-w-0">
      <CardContent className="flex min-h-32 items-start justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="stat-numeral mt-2 text-2xl font-semibold leading-none text-foreground sm:text-3xl">
            {value.toLocaleString()}
          </p>
          {detail && <p className="mt-2 text-xs leading-4 text-muted-foreground">{detail}</p>}
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${metricTone[tone]}`}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [venueToDisable, setVenueToDisable] = useState<VenueDecision>(null);

  const statsQuery = useAdminStats();
  const usersQuery = useAllUsers();
  const venuesQuery = useAllVenues();
  const bookingsQuery = useAllBookings();
  const updateRole = useUpdateUserRole();
  const approveVenue = useApproveVenue();

  const stats = statsQuery.data;
  const users = usersQuery.data ?? [];
  const venues = venuesQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const pendingVenues = venues.filter((venue) => !venue.is_active);

  const confirmDisableVenue = () => {
    if (!venueToDisable) return;
    approveVenue.mutate(
      { venueId: venueToDisable.id, approved: false },
      { onSuccess: () => setVenueToDisable(null) },
    );
  };

  return (
    <OperationsLayout
      title="Administration"
      subtitle="Review access, inventory, bookings, payouts, and publishing from one workspace."
    >
      <div className="space-y-6">
        <section aria-labelledby="admin-summary-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="admin-summary-heading" className="font-display text-xl font-semibold tracking-extra-tight text-foreground">
                Platform summary
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Current operational totals and review pressure.</p>
            </div>
          </div>

          {statsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" role="status" aria-label="Loading platform summary">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-32" />
              ))}
            </div>
          ) : statsQuery.isError ? (
            <Card>
              <ErrorPanel
                what="the platform summary"
                description="No totals have been inferred from the failed request. The detailed workspaces remain available below."
                onRetry={() => statsQuery.refetch()}
                isRetrying={statsQuery.isFetching}
                className="py-8"
              />
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <MetricCard label="Users" value={stats?.totalUsers ?? 0} icon={Users} tone="information" />
              <MetricCard
                label="Venues"
                value={stats?.totalVenues ?? 0}
                icon={Building2}
                tone={stats?.pendingVenues ? "warning" : "primary"}
                detail={stats?.pendingVenues ? `${stats.pendingVenues} awaiting review` : "No pending reviews"}
              />
              <MetricCard label="Bookings" value={stats?.totalBookings ?? 0} icon={CalendarDays} tone="primary" />
              <MetricCard label="Active games" value={stats?.totalGames ?? 0} icon={Gamepad2} />
            </div>
          )}
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-1 sm:px-1">
            <TabsList aria-label="Administration sections" className="h-auto min-w-max justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="leads">Booking leads</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="venues">Venues</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
              <TabsTrigger value="blog">Blog</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-5 space-y-5">
            <AdminPulseCard />
            <SupplyDemandHeatmap />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Card className="min-w-0">
                <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
                  <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                    <ShieldCheck aria-hidden="true" className="h-5 w-5 text-warning" />
                    Venue approvals
                  </CardTitle>
                  <CardDescription>Listings waiting for an administrator decision.</CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                  {venuesQuery.isLoading ? (
                    <LoadingPanel label="Loading pending venues" />
                  ) : venuesQuery.isError ? (
                    <ErrorPanel
                      what="pending venues"
                      description="No approval state has been assumed."
                      onRetry={() => venuesQuery.refetch()}
                      isRetrying={venuesQuery.isFetching}
                      className="py-7"
                    />
                  ) : pendingVenues.length === 0 ? (
                    <StatusPanel
                      icon={CheckCircle2}
                      tone="positive"
                      title="Approval queue is clear"
                      description="There are no inactive venue listings waiting for review."
                      className="py-8"
                    />
                  ) : (
                    <ul className="divide-y divide-border">
                      {pendingVenues.slice(0, 5).map((venue) => (
                        <li key={venue.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{venue.name}</p>
                            <p className="mt-0.5 truncate text-sm text-muted-foreground">{venue.city || "City not provided"}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-11 w-full sm:w-auto"
                            onClick={() => approveVenue.mutate({ venueId: venue.id, approved: true })}
                            disabled={approveVenue.isPending}
                            aria-label={`Approve venue ${venue.name}`}
                          >
                            <CheckCircle2 aria-hidden="true" />
                            Approve
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
                  <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                    <CalendarDays aria-hidden="true" className="h-5 w-5 text-primary" />
                    Recent bookings
                  </CardTitle>
                  <CardDescription>Latest reservation activity across the marketplace.</CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                  {bookingsQuery.isLoading ? (
                    <LoadingPanel label="Loading recent bookings" />
                  ) : bookingsQuery.isError ? (
                    <ErrorPanel
                      what="recent bookings"
                      description="No booking state has been inferred from the failed request."
                      onRetry={() => bookingsQuery.refetch()}
                      isRetrying={bookingsQuery.isFetching}
                      className="py-7"
                    />
                  ) : bookings.length === 0 ? (
                    <StatusPanel
                      icon={CalendarDays}
                      title="No bookings yet"
                      description="New reservations will appear here when they are created."
                      className="py-8"
                    />
                  ) : (
                    <ul className="divide-y divide-border">
                      {bookings.slice(0, 5).map((booking) => {
                        const status = bookingStatusDescriptor(booking.status, "admin");
                        return (
                          <li key={booking.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">{booking.venue_name}</p>
                              <p className="mt-0.5 text-sm text-muted-foreground">
                                {format(new Date(booking.booking_date), "MMM d, yyyy")} · {formatTimeOfDay(booking.booking_time)}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="font-semibold text-foreground"><Price amount={booking.total_price} /></p>
                              <Badge variant="secondary" className="mt-1">{status.label}</Badge>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leads" className="mt-5">
            <Suspense fallback={<LazyPanelFallback />}>
              <BookingLeadsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="users" className="mt-5">
            <Card>
              <CardHeader className="p-5 sm:p-6">
                <CardTitle as="h2" className="text-lg">Users and access</CardTitle>
                <CardDescription>Review accounts and assign platform roles.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                {usersQuery.isLoading ? (
                  <LoadingPanel label="Loading users" />
                ) : usersQuery.isError ? (
                  <ErrorPanel
                    what="users"
                    description="No access roles have been inferred from the failed request."
                    onRetry={() => usersQuery.refetch()}
                    isRetrying={usersQuery.isFetching}
                    className="py-8"
                  />
                ) : users.length === 0 ? (
                  <StatusPanel icon={Users} title="No users found" description="Accounts will appear here after registration." className="py-8" />
                ) : (
                  <>
                    <ul className="space-y-3 lg:hidden" aria-label="User accounts">
                      {users.map((user) => (
                        <li key={user.id} className="rounded-lg border border-border bg-surface-1 p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={user.avatar_url || undefined} alt="" />
                              <AvatarFallback>{initials(user.full_name, user.email)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-foreground">{user.full_name || "No name provided"}</p>
                              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant="outline" className="capitalize">{user.user_type}</Badge>
                                {roleBadge(user.role)}
                              </div>
                            </div>
                          </div>
                          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                            <div>
                              <dt className="text-xs text-muted-foreground">City</dt>
                              <dd className="mt-0.5 text-foreground">{user.city || "Not provided"}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted-foreground">Joined</dt>
                              <dd className="mt-0.5 text-foreground">{format(new Date(user.created_at), "MMM d, yyyy")}</dd>
                            </div>
                          </dl>
                          <Select
                            value={user.role}
                            onValueChange={(value: AppRole) => updateRole.mutate({ userId: user.user_id, role: value })}
                            disabled={updateRole.isPending}
                          >
                            <SelectTrigger className="mt-4 w-full" aria-label={`Role for ${user.full_name || user.email || "user"}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </li>
                      ))}
                    </ul>

                    <div className="hidden lg:block">
                      <Table>
                        <caption className="sr-only">Platform users, account types, roles, locations, and join dates.</caption>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>City</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Access</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9 shrink-0">
                                    <AvatarImage src={user.avatar_url || undefined} alt="" />
                                    <AvatarFallback>{initials(user.full_name, user.email)}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-foreground">{user.full_name || "No name provided"}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell><Badge variant="outline" className="capitalize">{user.user_type}</Badge></TableCell>
                              <TableCell>{roleBadge(user.role)}</TableCell>
                              <TableCell>{user.city || "—"}</TableCell>
                              <TableCell>{format(new Date(user.created_at), "MMM d, yyyy")}</TableCell>
                              <TableCell className="text-right">
                                <Select
                                  value={user.role}
                                  onValueChange={(value: AppRole) => updateRole.mutate({ userId: user.user_id, role: value })}
                                  disabled={updateRole.isPending}
                                >
                                  <SelectTrigger className="ml-auto w-36" aria-label={`Role for ${user.full_name || user.email || "user"}`}>
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
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="venues" className="mt-5">
            <Card>
              <CardHeader className="p-5 sm:p-6">
                <CardTitle as="h2" className="text-lg">Venue inventory</CardTitle>
                <CardDescription>Review listing ownership, pricing, and publication state.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                {venuesQuery.isLoading ? (
                  <LoadingPanel label="Loading venues" />
                ) : venuesQuery.isError ? (
                  <ErrorPanel
                    what="venues"
                    description="No approval state has been inferred from the failed request."
                    onRetry={() => venuesQuery.refetch()}
                    isRetrying={venuesQuery.isFetching}
                    className="py-8"
                  />
                ) : venues.length === 0 ? (
                  <StatusPanel icon={Building2} title="No venues found" description="Listings will appear here when owners create them." className="py-8" />
                ) : (
                  <>
                    <ul className="space-y-3 lg:hidden" aria-label="Venue inventory">
                      {venues.map((venue) => (
                        <li key={venue.id} className="rounded-lg border border-border bg-surface-1 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground">{venue.name}</p>
                              <p className="mt-0.5 text-sm text-muted-foreground">{venue.city || "City not provided"}</p>
                            </div>
                            <Badge className={venue.is_active ? TONE_CHIP.positive : TONE_CHIP.warning}>
                              {venue.is_active ? "Active" : "Pending"}
                            </Badge>
                          </div>
                          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                            <div>
                              <dt className="text-xs text-muted-foreground">Owner</dt>
                              <dd className="mt-0.5 truncate text-foreground">{venue.owner?.full_name || venue.owner?.email || "Not available"}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted-foreground">Rate</dt>
                              <dd className="mt-0.5 text-foreground"><Price amount={venue.price_per_hour} suffix="/hr" /></dd>
                            </div>
                          </dl>
                          <div className="mt-4 flex gap-2">
                            <Button asChild variant="outline" size="sm" className="flex-1">
                              <Link to={`/venue/${venue.id}`} aria-label={`View venue ${venue.name}`}><Eye aria-hidden="true" />View</Link>
                            </Button>
                            {venue.is_active ? (
                              <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={() => setVenueToDisable({ id: venue.id, name: venue.name })} aria-label={`Disable venue ${venue.name}`}>
                                <XCircle aria-hidden="true" />Disable
                              </Button>
                            ) : (
                              <Button size="sm" className="flex-1" onClick={() => approveVenue.mutate({ venueId: venue.id, approved: true })} disabled={approveVenue.isPending} aria-label={`Approve venue ${venue.name}`}>
                                <CheckCircle2 aria-hidden="true" />Approve
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="hidden lg:block">
                      <Table>
                        <caption className="sr-only">Venue inventory with owners, cities, prices, and publication states.</caption>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Venue</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>City</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {venues.map((venue) => (
                            <TableRow key={venue.id}>
                              <TableCell>
                                <p className="font-semibold text-foreground">{venue.name}</p>
                                <p className="max-w-64 truncate text-sm text-muted-foreground">{venue.sports?.join(", ") || "No sports listed"}</p>
                              </TableCell>
                              <TableCell>{venue.owner?.full_name || venue.owner?.email || "—"}</TableCell>
                              <TableCell>{venue.city || "—"}</TableCell>
                              <TableCell className="text-right"><Price amount={venue.price_per_hour} suffix="/hr" /></TableCell>
                              <TableCell>
                                <Badge className={venue.is_active ? TONE_CHIP.positive : TONE_CHIP.warning}>
                                  {venue.is_active ? "Active" : "Pending"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label={`Actions for ${venue.name}`}>
                                      <MoreHorizontal aria-hidden="true" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Venue actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                      <Link to={`/venue/${venue.id}`}><Eye aria-hidden="true" />View venue</Link>
                                    </DropdownMenuItem>
                                    {venue.is_active ? (
                                      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setVenueToDisable({ id: venue.id, name: venue.name })}>
                                        <XCircle aria-hidden="true" />Disable venue
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onSelect={() => approveVenue.mutate({ venueId: venue.id, approved: true })}>
                                        <CheckCircle2 aria-hidden="true" />Approve venue
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="mt-5">
            <Card>
              <CardHeader className="p-5 sm:p-6">
                <CardTitle as="h2" className="text-lg">Booking ledger</CardTitle>
                <CardDescription>Read-only marketplace reservation history.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                {bookingsQuery.isLoading ? (
                  <LoadingPanel label="Loading bookings" />
                ) : bookingsQuery.isError ? (
                  <ErrorPanel
                    what="bookings"
                    description="No reservation status has been inferred from the failed request."
                    onRetry={() => bookingsQuery.refetch()}
                    isRetrying={bookingsQuery.isFetching}
                    className="py-8"
                  />
                ) : bookings.length === 0 ? (
                  <StatusPanel icon={CalendarDays} title="No bookings found" description="Reservations will appear here after they are created." className="py-8" />
                ) : (
                  <>
                    <ul className="space-y-3 lg:hidden" aria-label="Booking ledger">
                      {bookings.map((booking) => {
                        const status = bookingStatusDescriptor(booking.status, "admin");
                        return (
                          <li key={booking.id} className="rounded-lg border border-border bg-surface-1 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <p className="min-w-0 font-semibold text-foreground">{booking.venue_name}</p>
                              <Badge variant="secondary" className="shrink-0">{status.label}</Badge>
                            </div>
                            <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                              <div>
                                <dt className="text-xs text-muted-foreground">Date and time</dt>
                                <dd className="mt-0.5 text-foreground">{format(new Date(booking.booking_date), "MMM d, yyyy")}<br />{formatTimeOfDay(booking.booking_time)}</dd>
                              </div>
                              <div className="text-right">
                                <dt className="text-xs text-muted-foreground">Amount</dt>
                                <dd className="mt-0.5 font-semibold text-foreground"><Price amount={booking.total_price} /></dd>
                                <dd className="text-xs text-muted-foreground">{booking.duration_hours} {booking.duration_hours === 1 ? "hour" : "hours"}</dd>
                              </div>
                            </dl>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="hidden lg:block">
                      <Table>
                        <caption className="sr-only">Marketplace bookings with dates, times, durations, amounts, and statuses.</caption>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Venue</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="text-right">Duration</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bookings.map((booking) => {
                            const status = bookingStatusDescriptor(booking.status, "admin");
                            return (
                              <TableRow key={booking.id}>
                                <TableCell className="font-semibold text-foreground">{booking.venue_name}</TableCell>
                                <TableCell>{format(new Date(booking.booking_date), "MMM d, yyyy")}</TableCell>
                                <TableCell>{formatTimeOfDay(booking.booking_time)}</TableCell>
                                <TableCell className="stat-numeral text-right">{booking.duration_hours}h</TableCell>
                                <TableCell className="text-right font-semibold"><Price amount={booking.total_price} /></TableCell>
                                <TableCell><Badge variant="secondary">{status.label}</Badge></TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="mt-5">
            <Suspense fallback={<LazyPanelFallback />}>
              <PayoutsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="blog" className="mt-5">
            <Suspense fallback={<LazyPanelFallback />}>
              <BlogPostsTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!venueToDisable} onOpenChange={(open) => !open && setVenueToDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable this venue?</AlertDialogTitle>
            <AlertDialogDescription>
              {venueToDisable?.name ? `“${venueToDisable.name}”` : "This venue"} will no longer be active in the marketplace. You can approve it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
              onClick={confirmDisableVenue}
              disabled={approveVenue.isPending}
            >
              {approveVenue.isPending ? "Disabling…" : "Disable venue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OperationsLayout>
  );
};

export default AdminDashboard;
