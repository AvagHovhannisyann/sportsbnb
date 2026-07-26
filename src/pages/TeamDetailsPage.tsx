import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Users, Shield, Copy, UserPlus, Crown, Star, LogOut,
  Trash2, Settings, Calendar, Loader2, UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    if (role === "captain") return <Crown className="h-3.5 w-3.5 text-yellow-500" />;
    if (role === "co-captain") return <Star className="h-3.5 w-3.5 text-blue-500" />;
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
        <div className="container py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
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
      <div className="bg-background min-h-screen">
        <div className="container py-8 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" aria-label="Back" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Team Profile */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <Avatar className="h-20 w-20 rounded-xl">
                  <AvatarImage src={team.logo_url || undefined} className="object-cover" />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-2xl font-bold">
                    {team.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
                    {team.visibility === "private" && <Shield className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="secondary">{team.sport}</Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {members.length}/{team.team_size} players
                    </span>
                  </div>
                  {team.description && (
                    <p className="text-muted-foreground">{team.description}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {!isMember && user && (
                    <Button onClick={handleJoin} disabled={joinByCode.isPending}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Join Team
                    </Button>
                  )}
                  {canManage && (
                    <>
                      <Button variant="outline" size="icon" onClick={handleCopyInviteLink} title="Copy invite link">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setInviteDialogOpen(true)} title="Invite players">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {isMember && !isCaptain && (
                    <Button variant="ghost" size="icon" onClick={handleLeave} title="Leave team">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                  {isCaptain && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Team settings"><Settings className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/team/${team.id}/edit`)}>
                          Edit Team
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="members">
            <TabsList className="mb-6">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Members ({members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {(member.profile?.full_name || "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
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
                              <Button variant="ghost" size="sm">Manage</Button>
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
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No activity yet</h3>
                  <p className="text-muted-foreground">Games and bookings made with this team will appear here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Players</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">By Username</label>
              <Input
                placeholder="Enter username"
                value={inviteUsername}
                onChange={(e) => { setInviteUsername(e.target.value); setInviteEmail(""); }}
              />
            </div>
            <div className="text-center text-sm text-muted-foreground">or</div>
            <div className="space-y-2">
              <label className="text-sm font-medium">By Email</label>
              <Input
                type="email"
                placeholder="Enter email"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteUsername(""); }}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium">Share Invite Link</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/join-team/${team?.invite_code}`}
                  className="text-xs"
                />
                <Button variant="outline" size="icon" aria-label="Copy invite link" onClick={handleCopyInviteLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviteToTeam.isPending || (!inviteUsername.trim() && !inviteEmail.trim())}>
              {inviteToTeam.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default TeamDetailsPage;
