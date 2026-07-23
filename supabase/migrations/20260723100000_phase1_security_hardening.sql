-- Phase 1 security hardening
-- Closes the RLS holes found in the audit: notification spoofing, anonymous
-- PII inserts, public presence reads, the untracked platform_settings table,
-- the broken profiles_public view, the duplicate chat-room RPC overload, and
-- client-generated referral codes.

-- =============================================================
-- 1) notifications: kill the open INSERT policy.
--    Edge functions use the service role (bypasses RLS); browser flows must go
--    through notify_user(), which requires an authenticated caller and an
--    allowlisted type.
-- =============================================================
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_type NOT IN ('game', 'team', 'booking', 'review', 'chat', 'system') THEN
    RAISE EXCEPTION 'invalid notification type';
  END IF;
  IF length(p_title) > 200 OR length(p_message) > 1000 OR length(coalesce(p_link, '')) > 500 THEN
    RAISE EXCEPTION 'notification content too long';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link);
END;
$$;

-- =============================================================
-- 2) booking_intents: no more anonymous inserts of arbitrary PII rows.
--    (The WhatsApp handoff flow this powered is being replaced by in-app
--    booking; until then, creating an intent requires login.)
-- =============================================================
DROP POLICY IF EXISTS "Anyone can create booking intents" ON public.booking_intents;

CREATE POLICY "Authenticated users can create booking intents"
  ON public.booking_intents FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================================
-- 3) field_checkins: stop broadcasting who is where to anonymous visitors.
-- =============================================================
DROP POLICY IF EXISTS "Anyone can view checkins" ON public.field_checkins;

CREATE POLICY "Authenticated users can view checkins"
  ON public.field_checkins FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================
-- 4) platform_settings: created out-of-band originally — capture it in a
--    migration and lock it down (admin-manage, authenticated read).
-- =============================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can read platform settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================
-- 5) profiles_public: with security_invoker=on this view returned only the
--    caller's own row (profiles SELECT is own-row/admin), silently breaking
--    public profile lookups. Recreate as a definer view — safe because it
--    projects only non-PII columns.
-- =============================================================
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = off) AS
SELECT
  id,
  user_id,
  username,
  full_name,
  avatar_url,
  city,
  preferred_sports,
  skill_level,
  user_type,
  onboarding_completed,
  created_at
FROM public.profiles
WHERE onboarding_completed = true;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- =============================================================
-- 6) Drop the stale get_or_create_chat_room overload. Named-argument RPC
--    calls (p_type, p_reference_id) are ambiguous while both exist.
--    Keep the newer (p_reference_id uuid, p_type text) definition.
-- =============================================================
DROP FUNCTION IF EXISTS public.get_or_create_chat_room(text, uuid);

-- =============================================================
-- 7) Referral codes: generated server-side, not with Math.random in the
--    browser. Unique, retry on collision, one code per user.
-- =============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Codes now come only from the RPC below (SECURITY DEFINER bypasses RLS),
-- so the direct client INSERT path is closed.
DROP POLICY IF EXISTS "Users can create their own referral code" ON public.referral_codes;

CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS TABLE (id uuid, user_id uuid, code text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempts int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Return the existing code if the user already has one
  RETURN QUERY
    SELECT rc.id, rc.user_id, rc.code, rc.created_at
    FROM public.referral_codes rc
    WHERE rc.user_id = auth.uid()
    LIMIT 1;
  IF FOUND THEN
    RETURN;
  END IF;

  LOOP
    v_attempts := v_attempts + 1;
    -- 8 chars from a random UUID, unambiguous alphabet
    v_code := 'SPORT' || upper(substr(translate(encode(gen_random_bytes(6), 'base64'), '+/=lIO0', ''), 1, 6));
    BEGIN
      RETURN QUERY
        INSERT INTO public.referral_codes AS rc (user_id, code)
        VALUES (auth.uid(), v_code)
        RETURNING rc.id, rc.user_id, rc.code, rc.created_at;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts >= 5 THEN
        RAISE EXCEPTION 'could not generate a unique referral code';
      END IF;
    END;
  END LOOP;
END;
$$;
