-- Close the authorization gap on the two SECURITY DEFINER chat functions.
--
-- add_chat_member and send_system_message both run as the definer, are
-- EXECUTE-able by `authenticated`, and are called directly from the browser
-- (src/hooks/useChat.ts). Neither checked anything. As shipped:
--
--   * add_chat_member(room, user, role) inserted any user into any room with
--     any role. A caller could add themselves to a stranger's booking chat, or
--     add an unrelated account to a room, purely by guessing or harvesting a
--     room UUID.
--   * send_system_message(room, text) inserted a row with sender_id NULL and
--     message_type 'system' into any room — i.e. forged platform messages, in
--     a conversation the caller has no part in. Those render as coming from
--     Sportsbnb itself, which is exactly what makes them worth forging.
--
-- They cannot simply have EXECUTE revoked: ChatDialog calls add_chat_member on
-- every chat open. So they get the treatment notify_user got in Phase 1 —
-- the authorization check moves inside the function.
--
-- The entitlement rule is not invented here. It mirrors the existing
-- `Authenticated users can create chat rooms` policy on chat_rooms, so a user
-- may join precisely the rooms they could have created: their own games and
-- bookings, the bookings of venues they own, and venue chats.

-- The `venue` room type has been referenced by the RLS policy, the TypeScript
-- union and useChat's initializeVenueChat since migration 20260118103406, but
-- chat_rooms_type_check was never widened past ('game','booking'). Every
-- attempt to open a venue chat therefore failed on the constraint. Found while
-- writing the regression test for the authorization change below.
ALTER TABLE public.chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_type_check;
ALTER TABLE public.chat_rooms ADD CONSTRAINT chat_rooms_type_check
  CHECK (type IN ('game', 'booking', 'venue'));

-- Who legitimately belongs to a room, by its reference rather than by an
-- existing membership row. Lets a participant pull in the counterparty the
-- conversation is inherently about — initializeVenueChat adds both the
-- customer and the venue owner — without allowing arbitrary accounts in.
CREATE OR REPLACE FUNCTION public.belongs_to_chat_room(p_room_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_rooms r
    WHERE r.id = p_room_id AND (
      (r.type = 'game' AND (
        EXISTS (SELECT 1 FROM public.games g WHERE g.id = r.reference_id AND g.host_id = p_user_id)
        OR EXISTS (SELECT 1 FROM public.game_participants gp
                   WHERE gp.game_id = r.reference_id AND gp.user_id = p_user_id)
      ))
      OR (r.type = 'booking' AND (
        EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = r.reference_id AND b.user_id = p_user_id)
        OR EXISTS (SELECT 1 FROM public.bookings b JOIN public.venues v ON v.id::text = b.venue_id
                   WHERE b.id = r.reference_id AND v.owner_id = p_user_id)
      ))
      OR (r.type = 'venue' AND EXISTS (
        SELECT 1 FROM public.venues v WHERE v.id = r.reference_id AND v.owner_id = p_user_id
      ))
    )
  );
$$;

-- Shared predicate, so the two functions cannot drift apart and any future
-- caller has one thing to reuse.
CREATE OR REPLACE FUNCTION public.can_access_chat_room(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_rooms r
    WHERE r.id = p_room_id
      AND auth.uid() IS NOT NULL
      AND (
        -- Already a member: covers rooms joined through any legitimate route.
        EXISTS (
          SELECT 1 FROM public.chat_members m
          WHERE m.room_id = r.id AND m.user_id = auth.uid()
        )
        -- Game chat: the host or a participant.
        OR (r.type = 'game' AND (
          EXISTS (SELECT 1 FROM public.games g
                  WHERE g.id = r.reference_id AND g.host_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.game_participants gp
                     WHERE gp.game_id = r.reference_id AND gp.user_id = auth.uid())
        ))
        -- Booking chat: the player who booked, or the venue's owner.
        OR (r.type = 'booking' AND (
          EXISTS (SELECT 1 FROM public.bookings b
                  WHERE b.id = r.reference_id AND b.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.bookings b
                     JOIN public.venues v ON v.id::text = b.venue_id
                     WHERE b.id = r.reference_id AND v.owner_id = auth.uid())
        ))
        -- Venue chat: any signed-in user may open one, matching the
        -- chat_rooms INSERT policy.
        OR r.type = 'venue'
      )
  );
$$;

COMMENT ON FUNCTION public.can_access_chat_room(uuid) IS
  'True when auth.uid() is entitled to the given chat room. Mirrors the chat_rooms INSERT policy so joining and creating stay consistent.';

CREATE OR REPLACE FUNCTION public.add_chat_member(
  p_room_id UUID,
  p_user_id UUID,
  p_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- Yourself, or the counterparty the conversation is inherently about.
  -- ChatDialog adds only the current user; initializeVenueChat also adds the
  -- venue's owner, which is legitimate and bounded by belongs_to_chat_room.
  -- Anyone else is refused.
  IF p_user_id <> auth.uid() AND NOT public.belongs_to_chat_room(p_room_id, p_user_id) THEN
    RAISE EXCEPTION 'that user is not a participant in this conversation';
  END IF;

  IF NOT public.can_access_chat_room(p_room_id) THEN
    RAISE EXCEPTION 'not entitled to this chat room';
  END IF;

  -- Role is caller-supplied and purely descriptive; constrain it so it cannot
  -- be used to claim something the UI later trusts.
  IF p_role IS NULL OR p_role NOT IN ('host', 'player', 'owner', 'customer') THEN
    RAISE EXCEPTION 'invalid chat role: %', p_role;
  END IF;

  INSERT INTO public.chat_members (room_id, user_id, role)
  VALUES (p_room_id, p_user_id, p_role)
  ON CONFLICT (room_id, user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_system_message(
  p_room_id UUID,
  p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- service_role is how the platform's own flows emit system messages; those
  -- are trusted and skip the membership requirement.
  IF auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'authentication required';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.chat_members m
      WHERE m.room_id = p_room_id AND m.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'not a member of this chat room';
    END IF;
  END IF;

  INSERT INTO public.chat_messages (room_id, sender_id, message_text, message_type)
  VALUES (p_room_id, NULL, p_message, 'system')
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;
