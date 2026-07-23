-- Phase 3: gamification moves server-side.
-- Achievements/XP were awarded from the browser (spoofable, racy read-modify-
-- write). Now a single SECURITY DEFINER RPC computes and awards atomically,
-- and clients lose direct write access to user_achievements and XP columns.

-- Clients may no longer insert achievements directly
DROP POLICY IF EXISTS "System can insert achievements" ON public.user_achievements;

-- Guard XP/level on profiles: only the transaction-scoped flag set by the
-- awarding RPC (or the service role) may change them.
CREATE OR REPLACE FUNCTION public.protect_profile_xp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.xp IS DISTINCT FROM OLD.xp OR NEW.level IS DISTINCT FROM OLD.level)
     AND auth.role() <> 'service_role'
     AND COALESCE(current_setting('app.allow_xp_update', true), '') <> 'on' THEN
    RAISE EXCEPTION 'xp and level are managed by the platform';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_xp ON public.profiles;
CREATE TRIGGER profiles_protect_xp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_xp();

CREATE OR REPLACE FUNCTION public.check_and_award_achievements()
RETURNS SETOF public.achievements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats jsonb;
  v_ach record;
  v_value int;
  v_total_xp int := 0;
  v_reviews int;
  v_referrals int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  PERFORM set_config('app.allow_xp_update', 'on', true);

  v_stats := public.get_player_stats(auth.uid());
  SELECT count(*) INTO v_reviews FROM public.reviews WHERE user_id = auth.uid();
  SELECT count(*) INTO v_referrals FROM public.referral_credits WHERE referrer_id = auth.uid();

  FOR v_ach IN
    SELECT a.* FROM public.achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua
      WHERE ua.user_id = auth.uid() AND ua.achievement_id = a.id
    )
  LOOP
    v_value := CASE v_ach.requirement_type
      WHEN 'bookings_made' THEN COALESCE((v_stats->>'total_bookings')::int, 0)
      WHEN 'games_played' THEN COALESCE((v_stats->>'games_played')::int, 0)
      WHEN 'games_hosted' THEN COALESCE((v_stats->>'games_hosted')::int, 0)
      WHEN 'reviews_written' THEN v_reviews
      WHEN 'referrals_made' THEN v_referrals
      ELSE 0
    END;

    IF v_value >= v_ach.requirement_value THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (auth.uid(), v_ach.id)
      ON CONFLICT DO NOTHING;
      IF FOUND THEN
        v_total_xp := v_total_xp + v_ach.xp_reward;
        RETURN NEXT v_ach;
      END IF;
    END IF;
  END LOOP;

  IF v_total_xp > 0 THEN
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + v_total_xp,
        level = floor((COALESCE(xp, 0) + v_total_xp) / 100.0)::int + 1
    WHERE user_id = auth.uid();
  END IF;

  RETURN;
END;
$$;
