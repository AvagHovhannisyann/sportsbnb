import { Link } from "react-router-dom";
import { Lock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Team } from "@/hooks/useTeams";

interface TeamCardProps {
  team: Team;
  showRole?: string;
}

const TeamCard = ({ team, showRole }: TeamCardProps) => {
  const size = team.team_size || 0;
  // `member_count` is optional on Team, so this guards against its absence
  // rather than reading a missing roster as an empty one. Both hooks that
  // build Team[] derive the count and always set a number today — useTeams
  // does it from team_members, and useUserTeams was fixed to do the same after
  // every card on "My Teams" rendered "—/11" — so this branch is a guard, not
  // a state you can currently reach.
  const known = typeof team.member_count === "number";
  const members = known ? team.member_count! : 0;
  const spotsLeft = Math.max(size - members, 0);
  const fill = known && size > 0 ? Math.min(members / size, 1) : 0;
  const isFull = known && size > 0 && spotsLeft === 0;

  const rosterLabel = !known
    ? "Roster unavailable"
    : isFull
      ? "Full squad"
      : `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} open`;

  return (
    <Link to={`/team/${team.id}`} className="group block h-full focus-ring rounded-xl">
      <Card
        className={cn(
          "flex h-full flex-col overflow-hidden transition-all duration-200",
          "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg",
        )}
      >
        <CardContent className="flex h-full flex-col p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 shrink-0 rounded-lg">
              <AvatarImage src={team.logo_url || undefined} className="object-cover" alt="" />
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-lg">
                {team.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Everything the title owns now lives in this column. The
                description used to be a sibling of the whole row, so it began
                under the avatar rather than under the name it describes — a
                60px indent mismatch, visible on any card that had one. */}
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-1.5">
                <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
                  {team.name}
                </h3>
                {team.visibility === "private" && (
                  // Was a bare Shield glyph with nothing to say what it meant.
                  <Lock
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    aria-label="Private team"
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-xs capitalize">
                  {team.sport}
                </Badge>
                {showRole && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {showRole}
                  </Badge>
                )}
              </div>

              {team.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {team.description}
                </p>
              )}
            </div>
          </div>

          {/* Roster, as the card's floor. Whether a team has room is the one
              thing that decides if you can act on it, and it was the smallest,
              greyest line here. `mt-auto` keeps it on the baseline so cards in
              a row line up regardless of description length. */}
          <div className="mt-auto pt-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="tabular-nums">
                  {known ? `${members}/${size}` : `—/${size}`}
                </span>
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  isFull ? "text-muted-foreground" : "text-primary",
                )}
              >
                {rosterLabel}
              </span>
            </div>
            {/* Decorative: the same figures are stated in text directly above,
                so the meter is not the only carrier of the information. */}
            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-3"
              aria-hidden="true"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  isFull ? "bg-muted-foreground/50" : "bg-primary",
                )}
                style={{ width: `${Math.round(fill * 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default TeamCard;
