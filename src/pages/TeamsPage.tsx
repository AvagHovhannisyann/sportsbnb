import { useState } from "react";
import SEOHead from "@/components/seo/SEOHead";
import { Link } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="bg-background min-h-screen">
        <div className="container py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <p className="eyebrow mb-2">Play together</p>
              <h1 className="page-title">Teams</h1>
              <p className="text-muted-foreground">Create and manage your sports teams</p>
            </div>
            {user && (
              <Button asChild className="gap-2">
                <Link to="/create-team">
                  <Plus className="h-4 w-4" />
                  Create Team
                </Link>
              </Button>
            )}
          </div>

          {/* Invites Banner */}
          {invites.length > 0 && (
            <div className="mb-6 space-y-3">
              {invites.map(invite => (
                <Card key={invite.id} className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        You've been invited to join <strong>{invite.team?.name}</strong>
                      </p>
                      <p className="text-sm text-muted-foreground">{invite.team?.sport}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleInviteResponse(invite.id, invite.team_id, true)}
                        disabled={respondToInvite.isPending}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInviteResponse(invite.id, invite.team_id, false)}
                        disabled={respondToInvite.isPending}
                      >
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              {user && <TabsTrigger value="my-teams">My Teams</TabsTrigger>}
              <TabsTrigger value="browse">Browse Teams</TabsTrigger>
            </TabsList>

            {/* My Teams Tab */}
            {user && (
              <TabsContent value="my-teams">
                {userTeamsLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }, (_, i) => (
                      <TeamCardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Teams I Own */}
                    {(userTeams?.owned?.length ?? 0) > 0 && (
                      <div>
                        <h2 className="section-title">Teams I Captain</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {userTeams!.owned.map(team => (
                            <TeamCard key={team.id} team={team} showRole="captain" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Teams I'm a member of */}
                    {(userTeams?.member?.length ?? 0) > 0 && (
                      <div>
                        <h2 className="section-title">Teams I've Joined</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {userTeams!.member.map(team => (
                            <TeamCard key={team.id} team={team} showRole="member" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* The default tab. "No teams yet" on a failed fetch is a
                        claim about the user's own memberships, and its call to
                        action is "create your first team" — which invites a
                        duplicate of one they already own. */}
                    {userTeamsError && (
                      <Card>
                        <ErrorPanel
                          what="your teams"
                          onRetry={() => refetchUserTeams()}
                          isRetrying={userTeamsFetching}
                        />
                      </Card>
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
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search teams..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge
                    variant={sportFilter === "" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSportFilter("")}
                  >
                    All Sports
                  </Badge>
                  {sportTypes.slice(0, 6).map(sport => (
                    <Badge
                      key={sport}
                      variant={sportFilter === sport ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSportFilter(sportFilter === sport ? "" : sport)}
                    >
                      {sport}
                    </Badge>
                  ))}
                </div>
              </div>

              {teamsLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }, (_, i) => (
                    <TeamCardSkeleton key={i} />
                  ))}
                </div>
              ) : publicTeams.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publicTeams.map(team => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              ) : teamsError ? (
                <Card>
                  <ErrorPanel what="teams" onRetry={() => refetchTeams()} isRetrying={teamsFetching} />
                </Card>
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
