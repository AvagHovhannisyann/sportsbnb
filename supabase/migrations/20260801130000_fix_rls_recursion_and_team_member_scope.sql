-- Break the RLS recursion on games/game_participants and teams/team_members,
-- and fix an INSERT policy that compared an alias to itself.
--
-- Before this, all four tables returned 42P17 "infinite recursion detected in
-- policy" to every caller, signed in or not. `game_participants`'s SELECT
-- policy contained `EXISTS (SELECT 1 FROM game_participants gp ...)` — a policy
-- on a table querying that same table — and `games` and `game_participants`
-- each referenced the other's policies, so the loop closed in both directions.
-- `teams` and `team_members` had the same shape. The games, community and teams
-- sections of the app were dead.
--
-- The fix is a SECURITY DEFINER helper per lookup: inside one, RLS does not
-- re-apply, so the membership test terminates. Each takes only an id and
-- answers about auth.uid(), so it discloses nothing the caller could not
-- already ask for directly, and returns false for anon via a null auth.uid().

CREATE OR REPLACE FUNCTION public.is_game_host(p_game_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.games g WHERE g.id = p_game_id AND g.host_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_game_participant(p_game_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.game_participants gp
                 WHERE gp.game_id = p_game_id AND gp.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_game_public(p_game_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.games g
                 WHERE g.id = p_game_id AND g.is_public = true AND g.status <> 'cancelled');
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner(p_team_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teams t WHERE t.id = p_team_id AND t.owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members tm
                 WHERE tm.team_id = p_team_id AND tm.user_id = auth.uid());
$$;

-- captain OR co-captain
CREATE OR REPLACE FUNCTION public.is_team_leader(p_team_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members tm
                 WHERE tm.team_id = p_team_id AND tm.user_id = auth.uid()
                   AND tm.role = ANY (ARRAY['captain','co-captain']));
$$;

-- captain only — the UPDATE policy deliberately excluded co-captains, and that
-- distinction is preserved rather than quietly widened while fixing the loop.
CREATE OR REPLACE FUNCTION public.is_team_captain(p_team_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members tm
                 WHERE tm.team_id = p_team_id AND tm.user_id = auth.uid() AND tm.role = 'captain');
$$;

CREATE OR REPLACE FUNCTION public.team_is_public_or_owned(p_team_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teams t
                 WHERE t.id = p_team_id AND (t.visibility = 'public' OR t.owner_id = auth.uid()));
$$;

GRANT EXECUTE ON FUNCTION
  public.is_game_host(uuid), public.is_game_participant(uuid), public.is_game_public(uuid),
  public.is_team_owner(uuid), public.is_team_member(uuid), public.is_team_leader(uuid),
  public.is_team_captain(uuid), public.team_is_public_or_owned(uuid)
TO anon, authenticated;

-- ── games ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Participants can view joined games" ON public.games;
CREATE POLICY "Participants can view joined games" ON public.games
  FOR SELECT USING (public.is_game_participant(games.id));

-- ── game_participants ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View participants for own games" ON public.game_participants;
CREATE POLICY "View participants for own games" ON public.game_participants
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_game_host(game_participants.game_id)
    OR public.is_game_participant(game_participants.game_id)
    OR public.is_game_public(game_participants.game_id)
  );

DROP POLICY IF EXISTS "Hosts can manage participants" ON public.game_participants;
CREATE POLICY "Hosts can manage participants" ON public.game_participants
  FOR DELETE USING (public.is_game_host(game_participants.game_id));

DROP POLICY IF EXISTS "Hosts can update participant status" ON public.game_participants;
CREATE POLICY "Hosts can update participant status" ON public.game_participants
  FOR UPDATE USING (public.is_game_host(game_participants.game_id));

-- ── teams ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can view their private teams" ON public.teams;
CREATE POLICY "Members can view their private teams" ON public.teams
  FOR SELECT USING (visibility = 'private' AND public.is_team_member(teams.id));

DROP POLICY IF EXISTS "Captains can update their teams" ON public.teams;
CREATE POLICY "Captains can update their teams" ON public.teams
  FOR UPDATE USING (owner_id = auth.uid() OR public.is_team_leader(teams.id));

-- ── team_members ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view team members of public teams" ON public.team_members;
CREATE POLICY "Anyone can view team members of public teams" ON public.team_members
  FOR SELECT USING (
    public.team_is_public_or_owned(team_members.team_id) OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Members can view co-members" ON public.team_members;
CREATE POLICY "Members can view co-members" ON public.team_members
  FOR SELECT USING (public.is_team_member(team_members.team_id));

-- The privilege fix. The old WITH CHECK read
--
--   team_members_1.team_id = team_members_1.team_id
--
-- an alias compared to itself, which is always true. The captaincy test was
-- therefore never bound to the row being inserted, so a captain of any one team
-- could add members to every team in the database. Binding it to
-- team_members.team_id is the whole fix; verified by having a captain of team A
-- attempt an insert into team B (403) and into their own team (201).
DROP POLICY IF EXISTS "Captains can add members" ON public.team_members;
CREATE POLICY "Captains can add members" ON public.team_members
  FOR INSERT WITH CHECK (
    public.is_team_leader(team_members.team_id)
    OR public.is_team_owner(team_members.team_id)
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Captains can remove members" ON public.team_members;
CREATE POLICY "Captains can remove members" ON public.team_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR public.is_team_leader(team_members.team_id)
    OR public.is_team_owner(team_members.team_id)
  );

DROP POLICY IF EXISTS "Captains can update member roles" ON public.team_members;
CREATE POLICY "Captains can update member roles" ON public.team_members
  FOR UPDATE USING (
    public.is_team_captain(team_members.team_id)
    OR public.is_team_owner(team_members.team_id)
  );
