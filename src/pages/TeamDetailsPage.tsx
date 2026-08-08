import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Users, Shield, Copy, UserPlus, Crown, Star, LogOut,
  Trash2, Settings, Calendar, Loader2, UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/layout/Layout";
import { StatusPanel } from "@/components/common/StatusPanel";
import { useAuth } from "@/hooks/useAuth";
import {
  useTeamById, useTeamMembers, useInviteToTeam,
  useUpdateMemberRole, useRemoveTeamMember, useLeaveTeam,
  useDeleteTeam, useJoinTeamByCode,
} from "@/hooks/useTeams";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
const TeamDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: team, isLoading } = useTeamById(id);
  const { data: members = [] } = useTeamMembers(id);
  const inviteToTeam = useInviteToTeam();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveTeamMember();
  const leaveTeam = useLeaveTeam();
  const deleteTeam = useDeleteTeam();
  const joinByCode = useJoinTeamByCode();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const isMember = members.some(m => m.user_id === user?.id);
  const currentMember = members.find(m => m.user_id === user?.id);
  const isCaptain = currentMember?.role === "captain" || team?.owner_id === user?.id;
  const isCoCaptain = currentMember?.role === "co-captain";
  const canManage = isCaptain || isCoCaptain;

  const roleIcon = (role: string) => {
    if (role === "captain") return <Crown className="h-3.5 w-3.5 text-brand-tuff" aria-hidden="true" />;
    if (role === "co-captain") return <Star className="h-3.5 w-3.5 text-information" aria-hidden="true" />;
    return null;
  };

  const handleCopyInviteLink = () => {
    if (!team) return;
    const link = `${window.location.origin}/join-team/${team.invite_code}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  const handleInvite = async () => {
    if (!team) return;

    try {
      if (inviteUsername.trim()) {
        const { data: profile } = await supabase
          .from("profiles_public")
          .select("user_id")
          .eq("username", inviteUsername.trim())
          .maybeSingle();

        if (!profile?.user_id) {
          toast.error("User not found");
          return;
        }
        await inviteToTeam.mutateAsync({ teamId: team.id, userId: profile.user_id });
        toast.success("Invite sent!");
      } else if (inviteEmail.trim()) {
        await inviteToTeam.mutateAsync({ teamId: team.id, email: inviteEmail.trim() });
        toast.success("Invite sent to email!");
      }
      setInviteDialogOpen(false);
      setInviteUsername("");
      setInviteEmail("");
    } catch {
      toast.error("Failed to send invite");
    }
  };

  const handleJoin = async () => {
    if (!team) return;
    try {
      const result = await joinByCode.mutateAsync(team.invite_code);
      toast.success(result.message);
    } catch (e: any) {
      toast.error(e.message || "Failed to join");
    }
  };

  const handleLeave = async () => {
    if (!team) return;
    try {
      await leaveTeam.mutateAsync(team.id);
      toast.success("Left team");
      navigate("/teams");
    } catch {
      toast.error("Failed to leave team");
    }
  };

  const handleDelete = async () => {
    if (!team) return;
    try {
      await deleteTeam.mutateAsync(team.id);
      toast.success("Team deleted");
      navigate("/teams");
    } catch {
      toast.error("Failed to delete team");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-4xl py-8 md:py-10" role="status" aria-label="Loading the team">
          <Skeleton className="mb-6 h-11 w-24" />
          <div className="mb-6 rounded-xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </Layout>
    );
  }

  if (!team) {
    return (
      <Layout>
        <div className="container">
          {/* Previously a bare heading with no way out — a dead end. */}
          <StatusPanel
            icon={UsersRound}
            title="Team not found"
            description="This team may have been disbanded, or the link is out of date."
          >
            <Button asChild>
              <Link to="/teams">Browse teams</Link>
            </Button>
          </StatusPanel>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl py-8 md:py-10">
          {/* Header */}
          <div className="mb-4">
            <Button variant="ghost" aria-label="Back" onClick={() => navigate(-1)} className="px-2">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              Back
            </Button>
          </div>

          {/* Team Profile */}
          <Card className="mb-6 shadow-xs">
            <CardContent className="p-5 md:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <Avatar className="h-20 w-20 shrink-0 rounded-xl">
                  <AvatarImage src={team.logo_url || undefined} className="object-cover" alt={`${team.name} logo`} />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-2xl font-bold">
                    {team.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">{team.name}</h1>
                    {team.visibility === "private" && (
                      <Badge variant="outline">
                        <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                        Private
                      </Badge>
                    )}
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <Badge variant="secondary">{team.sport}</Badge>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" aria-hidden="true" />
                      {members.length}/{team.team_size} players
                    </span>
                  </div>
                  {team.description && (
                    <p className="max-w-2xl leading-relaxed text-muted-foreground">{team.description}</p>
                  )}
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
                  {!isMember && user && (
                    <Button className="flex-1 sm:flex-none" onClick={handleJoin} disabled={joinByCode.isPending}>
                      {joinByCode.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      ) : (
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                      )}
                      Join team
                    </Button>
                  )}
                  {canManage && (
                    <>
                      <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleCopyInviteLink}>
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        Copy link
                      </Button>
                      <Button className="flex-1 sm:flex-none" onClick={() => setInviteDialogOpen(true)}>
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        Invite players
                      </Button>
                    </>
                  )}
                  {isMember && !isCaptain && (
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleLeave} disabled={leaveTeam.isPending}>
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      {leaveTeam.isPending ? "Leaving…" : "Leave team"}
                    </Button>
                  )}
                  {isCaptain && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" aria-label="Team settings">
                          <Settings className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/team/${team.id}/edit`)}>
                          Edit Team
                        </DropdownMenuItem>
                        {/* Confirmed, like deleting a venue on EditVenuePage.
                            This fired `deleteTeam` straight off the click — an
                            irreversible action affecting every member, sitting
                            one row below "Edit Team" in the same menu. The
                            `onSelect` preventDefault is what stops Radix
                            closing the menu before the dialog can mount. */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Team
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete team</AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete &ldquo;{team.name}&rdquo;? Every member loses access and this
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep team</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDelete}
                                disabled={deleteTeam.isPending}
                                className="bg-destructive-solid text-destructive-foreground hover:bg-destructive-solid/90"
                              >
                                {deleteTeam.isPending ? "Deleting…" : "Delete team"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="members">
            <TabsList className="mb-6 grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="members">
              <Card className="shadow-xs">
                <CardHeader className="p-5 pb-3 md:p-6 md:pb-4">
                  {/* Section under the team name (h1): h2. */}
                  <CardTitle as="h2" className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                    Team members ({members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {members.map(member => (
                      <div key={member.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage
                              src={member.profile?.avatar_url || undefined}
                              alt={member.profile?.full_name || "Team member"}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {(member.profile?.full_name || "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-medium text-foreground">
                                {member.profile?.full_name || "Unknown"}
                              </span>
                              {roleIcon(member.role)}
                              <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>
                            </div>
                            {member.profile?.username && (
                              <span className="text-sm text-muted-foreground">@{member.profile.username}</span>
                            )}
                          </div>
                        </div>
                        {canManage && member.user_id !== user?.id && member.role !== "captain" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="w-full sm:w-auto">Manage</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isCaptain && (
                                <>
                                  <DropdownMenuItem onClick={() => updateRole.mutateAsync({ memberId: member.id, role: "co-captain" })}>
                                    Make Co-Captain
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateRole.mutateAsync({ memberId: member.id, role: "member" })}>
                                    Set as Member
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => removeMember.mutateAsync(member.id)}
                              >
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <div className="rounded-xl border border-border bg-card">
                <StatusPanel
                  icon={Calendar}
                  title="No activity yet"
                  description="Games and bookings made with this team will appear here."
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite players</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-username">By username</Label>
              <Input
                id="invite-username"
                placeholder="Enter username"
                value={inviteUsername}
                onChange={(e) => { setInviteUsername(e.target.value); setInviteEmail(""); }}
              />
            </div>
            <div className="text-center text-sm text-muted-foreground">or</div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">By email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="Enter email"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteUsername(""); }}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="invite-link">Share invite link</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-link"
                  readOnly
                  value={`${window.location.origin}/join-team/${team?.invite_code}`}
                  className="text-xs"
                />
                <Button variant="outline" size="icon" aria-label="Copy invite link" onClick={handleCopyInviteLink}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviteToTeam.isPending || (!inviteUsername.trim() && !inviteEmail.trim())}>
              {inviteToTeam.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : null}
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default TeamDetailsPage;
