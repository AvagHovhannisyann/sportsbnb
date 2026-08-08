import { useState } from "react";
import SEOHead from "@/components/seo/SEOHead";
import { Link } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/layout/Layout";
import { ErrorPanel } from "@/components/common/StatusPanel";
import { EmptyState } from "@/components/ui/empty-state";
import TeamCard, { TeamCardSkeleton } from "@/components/teams/TeamCard";
import { useTeams, useUserTeams, useUserTeamInvites, useRespondToInvite } from "@/hooks/useTeams";
import { useAuth } from "@/hooks/useAuth";
import { sportTypes } from "@/data/constants";
import { toast } from "sonner";

const TeamsPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [activeTab, setActiveTab] = useState(user ? "my-teams" : "browse");

  const {
    data: publicTeams = [],
    isLoading: teamsLoading,
    isError: teamsError,
    refetch: refetchTeams,
    isFetching: teamsFetching,
  } = useTeams({ sport: sportFilter, search });
  const {
    data: userTeams,
    isLoading: userTeamsLoading,
    isError: userTeamsError,
    refetch: refetchUserTeams,
    isFetching: userTeamsFetching,
  } = useUserTeams();
  const { data: invites = [] } = useUserTeamInvites();
  const respondToInvite = useRespondToInvite();

  const handleInviteResponse = async (inviteId: string, teamId: string, accept: boolean) => {
    try {
      await respondToInvite.mutateAsync({ inviteId, teamId, accept });
      toast.success(accept ? "Joined team!" : "Invite declined");
    } catch {
      toast.error("Failed to respond to invite");
    }
  };

  return (
    <Layout>
      <SEOHead
        title="Sports Teams — Create & Join Teams"
        description="Create and join sports teams on Sportsbnb. Organize regular games, manage team members, and book venues together."
        canonical="/teams"
      />
      <div className="min-h-screen bg-background">
        <div className="container py-8 md:py-10">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow mb-2">Play together</p>
              <h1 className="page-title">Teams</h1>
              <p className="max-w-xl text-muted-foreground">
                Organize a regular squad, keep the roster clear, and find teams open to new players.
              </p>
            </div>
            {user && (
              <Button asChild className="w-full sm:w-auto">
                <Link to="/create-team">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create team
                </Link>
              </Button>
            )}
          </div>

          {/* Invites Banner */}
          {invites.length > 0 && (
            <aside className="mb-8" aria-labelledby="team-invitations-heading">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id="team-invitations-heading" className="text-lg font-semibold text-foreground">
                  Team invitations
                </h2>
                <Badge variant="default">{invites.length} pending</Badge>
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-primary/20 bg-primary-soft/60">
                {invites.map(invite => (
                  <div key={invite.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        You've been invited to join <strong>{invite.team?.name}</strong>
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{invite.team?.sport}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        className="flex-1 sm:flex-none"
                        onClick={() => handleInviteResponse(invite.id, invite.team_id, true)}
                        disabled={respondToInvite.isPending}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() => handleInviteResponse(invite.id, invite.team_id, false)}
                        disabled={respondToInvite.isPending}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList
              className={
                user
                  ? "mb-6 grid w-full grid-cols-2 sm:inline-grid sm:w-auto"
                  : "mb-6 grid w-full grid-cols-1 sm:inline-grid sm:w-auto"
              }
            >
              {user && <TabsTrigger value="my-teams">My Teams</TabsTrigger>}
              <TabsTrigger value="browse">Browse Teams</TabsTrigger>
            </TabsList>

            {/* My Teams Tab */}
            {user && (
              <TabsContent value="my-teams">
                {/* role="status" + a name on the loading grids below, matching
                    DiscoverPage and VenueDetailsPage. Skeletons are a status
                    message under WCAG 4.1.3, and a bare grid of animated grey
                    boxes is one nobody who is not looking at the screen can
                    perceive — the page just goes quiet for as long as the
                    request takes. The label goes on the container, not the
                    boxes: sixty of them announcing individually would be worse
                    than silence. */}
                {userTeamsLoading ? (
                  <div
                    className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    role="status"
                    aria-label="Loading your teams"
                  >
                    {Array.from({ length: 3 }, (_, i) => (
                      <TeamCardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Teams I Own */}
                    {(userTeams?.owned?.length ?? 0) > 0 && (
                      <section>
                        <h2 className="section-title">Teams I Captain</h2>
                        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {userTeams!.owned.map(team => (
                            <TeamCard key={team.id} team={team} showRole="captain" />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Teams I'm a member of */}
                    {(userTeams?.member?.length ?? 0) > 0 && (
                      <section>
                        <h2 className="section-title">Teams I've Joined</h2>
                        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {userTeams!.member.map(team => (
                            <TeamCard key={team.id} team={team} showRole="member" />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* The default tab. "No teams yet" on a failed fetch is a
                        claim about the user's own memberships, and its call to
                        action is "create your first team" — which invites a
                        duplicate of one they already own. */}
                    {userTeamsError && (
                      <div className="rounded-xl border border-destructive/25 bg-destructive/5">
                        <ErrorPanel
                          what="your teams"
                          onRetry={() => refetchUserTeams()}
                          isRetrying={userTeamsFetching}
                        />
                      </div>
                    )}

                    {!userTeamsError &&
                      (userTeams?.owned?.length ?? 0) === 0 &&
                      (userTeams?.member?.length ?? 0) === 0 && (
                      <EmptyState
                        bordered
                        compact
                        icon={Users}
                        title="No teams yet"
                        description="Create your first team or browse public teams to join."
                        actionLabel="Create Team"
                        actionHref="/create-team"
                        secondaryLabel="Browse Teams"
                        onSecondaryAction={() => setActiveTab("browse")}
                      />
                    )}
                  </div>
                )}
              </TabsContent>
            )}

            {/* Browse Tab */}
            <TabsContent value="browse">
              {/* The h2 this tab panel was missing.
                  Every team name below is a card title, which is an h3, so
                  with no heading here the outline ran h1 "Teams" straight to
                  h3 "Smoke FC". The "My Teams" panel does not have the problem
                  because it renders "Teams I Captain" and "Teams I've Joined"
                  — but only when the user *has* teams, so a signed-out
                  visitor and any new account both got the skip. It was found
                  signed out, and it was never specific to that.

                  `sr-only` because the tab trigger already says "Browse Teams"
                  on screen and repeating it would be visual noise; the heading
                  is for someone navigating by heading, who otherwise arrives
                  at a team name with no idea which list it is in. */}
              <h2 className="sr-only">Browse teams</h2>

              {/* Filters */}
              <div className="mb-6 space-y-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    aria-label="Search teams"
                    placeholder="Search teams…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-12 pl-10"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter teams by sport">
                  <Button
                    type="button"
                    variant={sportFilter === "" ? "soft" : "outline"}
                    aria-pressed={sportFilter === ""}
                    className="shrink-0"
                    onClick={() => setSportFilter("")}
                  >
                    All sports
                  </Button>
                  {sportTypes.slice(0, 6).map(sport => (
                    <Button
                      type="button"
                      key={sport}
                      variant={sportFilter === sport ? "soft" : "outline"}
                      aria-pressed={sportFilter === sport}
                      className="shrink-0"
                      onClick={() => setSportFilter(sportFilter === sport ? "" : sport)}
                    >
                      {sport}
                    </Button>
                  ))}
                </div>
              </div>

              {teamsLoading ? (
                <div
                  className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  role="status"
                  aria-label="Loading teams"
                >
                  {Array.from({ length: 6 }, (_, i) => (
                    <TeamCardSkeleton key={i} />
                  ))}
                </div>
              ) : publicTeams.length > 0 ? (
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {publicTeams.map(team => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              ) : teamsError ? (
                <div className="rounded-xl border border-destructive/25 bg-destructive/5">
                  <ErrorPanel what="teams" onRetry={() => refetchTeams()} isRetrying={teamsFetching} />
                </div>
              ) : (
                <EmptyState
                  bordered
                  compact
                  icon={Users}
                  title="No teams found"
                  description="Be the first to create a team!"
                  actionLabel="Create Team"
                  actionHref="/create-team"
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default TeamsPage;
