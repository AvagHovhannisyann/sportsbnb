-- Phase 1
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id uuid, p_type text, p_title text, p_message text, p_link text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_type NOT IN ('game','team','booking','review','chat','system') THEN
    RAISE EXCEPTION 'invalid notification type'; END IF;
  IF length(p_title) > 200 OR length(p_message) > 1000 OR length(coalesce(p_link,'')) > 500 THEN
    RAISE EXCEPTION 'notification content too long'; END IF;
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link);
END; $$;

DROP POLICY IF EXISTS "Anyone can create booking intents" ON public.booking_intents;
CREATE POLICY "Authenticated users can create booking intents"
  ON public.booking_intents FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view checkins" ON public.field_checkins;
CREATE POLICY "Authenticated users can view checkins"
  ON public.field_checkins FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Authenticated users can read platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can read platform settings"
  ON public.platform_settings FOR SELECT TO authenticated USING (true);

DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public WITH (security_invoker = off) AS
SELECT id, user_id, username, full_name, avatar_url, city, preferred_sports,
       skill_level, user_type, onboarding_completed, created_at
FROM public.profiles WHERE onboarding_completed = true;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_or_create_chat_room(text, uuid);

CREATE EXTENSION IF NOT EXISTS pgcrypto;
DROP POLICY IF EXISTS "Users can create their own referral code" ON public.referral_codes;

CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS TABLE (id uuid, user_id uuid, code text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text; v_attempts int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN QUERY SELECT rc.id, rc.user_id, rc.code, rc.created_at
    FROM public.referral_codes rc WHERE rc.user_id = auth.uid() LIMIT 1;
  IF FOUND THEN RETURN; END IF;
  LOOP
    v_attempts := v_attempts + 1;
    v_code := 'SPORT' || upper(substr(translate(encode(gen_random_bytes(6),'base64'),'+/=lIO0',''),1,6));
    BEGIN
      RETURN QUERY INSERT INTO public.referral_codes AS rc (user_id, code)
        VALUES (auth.uid(), v_code)
        RETURNING rc.id, rc.user_id, rc.code, rc.created_at;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts >= 5 THEN RAISE EXCEPTION 'could not generate a unique referral code'; END IF;
    END;
  END LOOP;
END; $$;

-- Phase 2
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS venue_uuid uuid REFERENCES public.venues(id),
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS amount_minor bigint,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'AMD',
  ADD COLUMN IF NOT EXISTS platform_fee_minor bigint,
  ADD COLUMN IF NOT EXISTS owner_amount_minor bigint,
  ADD COLUMN IF NOT EXISTS cancellation_policy jsonb,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.bookings SET venue_uuid = venue_id::uuid
WHERE venue_uuid IS NULL
  AND venue_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE public.bookings
SET starts_at = ((booking_date::text || ' ' || booking_time)::timestamp AT TIME ZONE 'Asia/Yerevan'),
    ends_at   = ((booking_date::text || ' ' || booking_time)::timestamp AT TIME ZONE 'Asia/Yerevan')
                + make_interval(hours => GREATEST(duration_hours, 1))
WHERE starts_at IS NULL AND booking_time ~ '^\d{1,2}:\d{2}';

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (
  status IN ('pending','confirmed','completed','cancelled',
    'pending_payment','cancelled_by_player','cancelled_by_owner',
    'refunded','expired','no_show')
);

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    venue_uuid WITH =,
    COALESCE(court_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  )
  WHERE (status IN ('pending_payment','confirmed') AND starts_at IS NOT NULL AND venue_uuid IS NOT NULL);

CREATE OR REPLACE FUNCTION public.join_game(p_game_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_game record; v_count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_game FROM public.games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;
  IF v_game.status <> 'open' THEN RAISE EXCEPTION 'game is not open'; END IF;
  IF COALESCE(v_game.price_per_player,0) > 0 THEN RAISE EXCEPTION 'payment required for this game'; END IF;
  IF EXISTS (SELECT 1 FROM public.game_participants WHERE game_id=p_game_id AND user_id=auth.uid()) THEN
    RETURN jsonb_build_object('ok',true,'already_joined',true); END IF;
  SELECT count(*) INTO v_count FROM public.game_participants WHERE game_id=p_game_id AND status='confirmed';
  IF v_count >= v_game.max_players THEN RAISE EXCEPTION 'game is full'; END IF;
  INSERT INTO public.game_participants (game_id,user_id,status) VALUES (p_game_id,auth.uid(),'confirmed');
  RETURN jsonb_build_object('ok',true);
END; $$;

CREATE OR REPLACE FUNCTION public.join_game_paid(p_game_id uuid, p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_game record; v_count int;
BEGIN
  SELECT * INTO v_game FROM public.games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.game_participants WHERE game_id=p_game_id AND user_id=p_user_id) THEN
    RETURN jsonb_build_object('ok',true,'already_joined',true); END IF;
  SELECT count(*) INTO v_count FROM public.game_participants WHERE game_id=p_game_id AND status='confirmed';
  IF v_count >= v_game.max_players THEN RAISE EXCEPTION 'game is full'; END IF;
  INSERT INTO public.game_participants (game_id,user_id,status) VALUES (p_game_id,p_user_id,'confirmed');
  RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE EXECUTE ON FUNCTION public.join_game_paid(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE SEQUENCE IF NOT EXISTS public.payment_order_ref_seq START 100000;

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid REFERENCES public.bookings(id),
  game_id uuid REFERENCES public.games(id),
  provider text NOT NULL CHECK (provider IN ('ameria','idram','mock')),
  order_ref bigint NOT NULL UNIQUE DEFAULT nextval('public.payment_order_ref_seq'),
  provider_payment_id text,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'AMD',
  status text NOT NULL DEFAULT 'created' CHECK (status IN (
    'created','redirected','paid','failed','cancelled',
    'refund_pending','refunded','partially_refunded')),
  refunded_minor bigint NOT NULL DEFAULT 0,
  idempotency_key text UNIQUE,
  provider_payload jsonb,
  error_code text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_exactly_one_subject CHECK (
    (booking_id IS NOT NULL)::int + (game_id IS NOT NULL)::int = 1)
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_payment_id_key
  ON public.payments (provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON public.payments (booking_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_type text NOT NULL CHECK (entry_type IN (
    'payment_received','owner_earning','platform_commission',
    'refund','owner_refund_debit','payout','adjustment')),
  payment_id uuid REFERENCES public.payments(id),
  booking_id uuid REFERENCES public.bookings(id),
  payout_id uuid,
  owner_id uuid,
  amount_minor bigint NOT NULL,
  currency text NOT NULL DEFAULT 'AMD',
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS ledger_once_per_payment
  ON public.ledger_entries (payment_id, entry_type)
  WHERE entry_type IN ('payment_received','owner_earning','platform_commission');
CREATE INDEX IF NOT EXISTS ledger_owner_idx ON public.ledger_entries (owner_id);

CREATE TABLE IF NOT EXISTS public.owner_payout_accounts (
  owner_id uuid PRIMARY KEY,
  method text NOT NULL CHECK (method IN ('bank_transfer','idram')),
  details jsonb NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_payout_accounts TO authenticated;
GRANT ALL ON public.owner_payout_accounts TO service_role;

CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'AMD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed')),
  period_start date,
  period_end date,
  method text,
  destination_snapshot jsonb,
  reference text,
  initiated_by uuid,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;

ALTER TABLE public.ledger_entries
  DROP CONSTRAINT IF EXISTS ledger_entries_payout_fk;
ALTER TABLE public.ledger_entries
  ADD CONSTRAINT ledger_entries_payout_fk FOREIGN KEY (payout_id) REFERENCES public.payouts(id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their own payments" ON public.payments;
CREATE POLICY "Users see their own payments" ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Owners see their own ledger" ON public.ledger_entries;
CREATE POLICY "Owners see their own ledger" ON public.ledger_entries FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Owners manage their payout account" ON public.owner_payout_accounts;
CREATE POLICY "Owners manage their payout account" ON public.owner_payout_accounts FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Owners see their payouts" ON public.payouts;
CREATE POLICY "Owners see their payouts" ON public.payouts FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE VIEW public.owner_balances WITH (security_invoker = on) AS
SELECT owner_id, currency, SUM(amount_minor)::bigint AS balance_minor
FROM public.ledger_entries WHERE owner_id IS NOT NULL GROUP BY owner_id, currency;
GRANT SELECT ON public.owner_balances TO authenticated;

INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('commission_bps','500') ON CONFLICT (setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enforce_booking_transitions()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
    OR NEW.platform_fee_minor IS DISTINCT FROM OLD.platform_fee_minor
    OR NEW.owner_amount_minor IS DISTINCT FROM OLD.owner_amount_minor
    OR NEW.total_price IS DISTINCT FROM OLD.total_price
    OR NEW.payment_intent_id IS DISTINCT FROM OLD.payment_intent_id
    OR NEW.currency IS DISTINCT FROM OLD.currency THEN
    RAISE EXCEPTION 'money fields are read-only'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status='pending_payment' AND NEW.status='cancelled_by_player') OR
      (OLD.status='confirmed' AND NEW.status IN ('cancelled_by_owner','completed','no_show')) OR
      (OLD.status='pending' AND NEW.status IN ('confirmed','cancelled'))
    ) THEN RAISE EXCEPTION 'status transition % -> % not allowed', OLD.status, NEW.status; END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS bookings_enforce_transitions ON public.bookings;
CREATE TRIGGER bookings_enforce_transitions BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_transitions();

CREATE OR REPLACE FUNCTION public.create_booking_hold(
  p_venue_id uuid, p_starts_at timestamptz, p_ends_at timestamptz,
  p_court_id uuid DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_venue record; v_court record; v_hours numeric; v_price_per_hour numeric;
  v_owner_minor bigint; v_fee_minor bigint; v_commission_bps int; v_policy jsonb;
  v_booking_id uuid; v_local_start timestamp;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_starts_at < now() THEN RAISE EXCEPTION 'start time is in the past'; END IF;
  IF p_ends_at <= p_starts_at THEN RAISE EXCEPTION 'invalid time range'; END IF;
  v_hours := EXTRACT(EPOCH FROM (p_ends_at - p_starts_at))/3600;
  IF v_hours > 8 THEN RAISE EXCEPTION 'booking too long'; END IF;
  SELECT * INTO v_venue FROM public.venues WHERE id=p_venue_id AND is_active IS NOT FALSE;
  IF NOT FOUND THEN RAISE EXCEPTION 'venue not found'; END IF;
  v_price_per_hour := v_venue.price_per_hour;
  IF p_court_id IS NOT NULL THEN
    SELECT * INTO v_court FROM public.venue_courts WHERE id=p_court_id AND venue_id=p_venue_id AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'court not found'; END IF;
    v_price_per_hour := COALESCE(v_court.price_per_hour, v_price_per_hour);
  END IF;
  SELECT COALESCE(setting_value::int,500) INTO v_commission_bps
    FROM public.platform_settings WHERE setting_key='commission_bps';
  v_commission_bps := COALESCE(v_commission_bps,500);
  v_owner_minor := round(v_price_per_hour * v_hours * 100);
  v_fee_minor := round(v_owner_minor * v_commission_bps / 10000.0);
  SELECT COALESCE(jsonb_build_object(
    'cancellation_policy', vp.cancellation_policy,
    'cancellation_hours', vp.cancellation_hours,
    'refund_type', vp.refund_type),
    '{"cancellation_policy":"flexible","cancellation_hours":24,"refund_type":"full"}'::jsonb
  ) INTO v_policy FROM public.venue_policies vp WHERE vp.venue_id=p_venue_id;
  v_policy := COALESCE(v_policy,'{"cancellation_policy":"flexible","cancellation_hours":24,"refund_type":"full"}'::jsonb);
  v_local_start := p_starts_at AT TIME ZONE 'Asia/Yerevan';
  BEGIN
    INSERT INTO public.bookings (
      user_id, venue_id, venue_uuid, court_id, venue_name,
      booking_date, booking_time, duration_hours, starts_at, ends_at,
      total_price, amount_minor, platform_fee_minor, owner_amount_minor, currency,
      cancellation_policy, status, expires_at, notes, source
    ) VALUES (
      auth.uid(), p_venue_id::text, p_venue_id, p_court_id, v_venue.name,
      v_local_start::date, to_char(v_local_start,'HH24:MI'), GREATEST(round(v_hours)::int,1),
      p_starts_at, p_ends_at,
      (v_owner_minor+v_fee_minor)/100.0, v_owner_minor+v_fee_minor, v_fee_minor, v_owner_minor,'AMD',
      v_policy,'pending_payment', now()+interval '20 minutes', p_notes,'app'
    ) RETURNING id INTO v_booking_id;
  EXCEPTION WHEN exclusion_violation THEN RAISE EXCEPTION 'slot_taken'; END;
  RETURN jsonb_build_object('booking_id',v_booking_id,
    'amount_minor',v_owner_minor+v_fee_minor,'owner_amount_minor',v_owner_minor,
    'platform_fee_minor',v_fee_minor,'currency','AMD',
    'expires_at', now()+interval '20 minutes');
END; $$;

CREATE OR REPLACE FUNCTION public.expire_stale_holds()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  WITH expired AS (
    UPDATE public.bookings SET status='expired'
    WHERE status='pending_payment' AND expires_at < now() RETURNING id
  ) SELECT count(*) INTO v_count FROM expired;
  UPDATE public.payments p SET status='cancelled', updated_at=now()
    FROM public.bookings b WHERE p.booking_id=b.id
    AND b.status='expired' AND p.status IN ('created','redirected');
  RETURN v_count;
END; $$;
REVOKE EXECUTE ON FUNCTION public.expire_stale_holds() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_available_slots(p_venue_id uuid, p_date date, p_court_id uuid DEFAULT NULL)
RETURNS TABLE (slot_start timestamptz, slot_end timestamptz, available boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_open time; v_close time; v_is_closed boolean;
BEGIN
  SELECT vh.open_time, vh.close_time, vh.is_closed INTO v_open, v_close, v_is_closed
  FROM public.venue_hours vh WHERE vh.venue_id=p_venue_id
    AND vh.day_of_week = EXTRACT(DOW FROM p_date)::int;
  IF NOT FOUND THEN v_open:='09:00'; v_close:='22:00'; v_is_closed:=false; END IF;
  IF v_is_closed OR EXISTS (SELECT 1 FROM public.blocked_dates bd
    WHERE bd.venue_id=p_venue_id AND bd.blocked_date=p_date) THEN RETURN; END IF;
  RETURN QUERY
  WITH hours AS (
    SELECT generate_series(
      (p_date::timestamp + v_open) AT TIME ZONE 'Asia/Yerevan',
      (p_date::timestamp + v_close - interval '1 hour') AT TIME ZONE 'Asia/Yerevan',
      interval '1 hour') AS s
  )
  SELECT h.s, h.s + interval '1 hour',
    NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.venue_uuid=p_venue_id
        AND (p_court_id IS NULL OR b.court_id IS NULL OR b.court_id=p_court_id)
        AND b.status IN ('pending_payment','confirmed')
        AND tstzrange(b.starts_at, b.ends_at) && tstzrange(h.s, h.s+interval '1 hour')
    ) AND h.s > now()
  FROM hours h;
END; $$;

-- Phase 3
DROP POLICY IF EXISTS "System can insert achievements" ON public.user_achievements;

CREATE OR REPLACE FUNCTION public.protect_profile_xp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.xp IS DISTINCT FROM OLD.xp OR NEW.level IS DISTINCT FROM OLD.level)
    AND auth.role() <> 'service_role'
    AND COALESCE(current_setting('app.allow_xp_update', true), '') <> 'on' THEN
    RAISE EXCEPTION 'xp and level are managed by the platform'; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_protect_xp ON public.profiles;
CREATE TRIGGER profiles_protect_xp BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_xp();

CREATE OR REPLACE FUNCTION public.check_and_award_achievements()
RETURNS SETOF public.achievements LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_stats jsonb; v_ach record; v_value int; v_total_xp int:=0; v_reviews int; v_referrals int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM set_config('app.allow_xp_update','on', true);
  v_stats := public.get_player_stats(auth.uid());
  SELECT count(*) INTO v_reviews FROM public.reviews WHERE user_id=auth.uid();
  SELECT count(*) INTO v_referrals FROM public.referral_credits WHERE referrer_id=auth.uid();
  FOR v_ach IN
    SELECT a.* FROM public.achievements a WHERE NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua WHERE ua.user_id=auth.uid() AND ua.achievement_id=a.id)
  LOOP
    v_value := CASE v_ach.requirement_type
      WHEN 'bookings_made' THEN COALESCE((v_stats->>'total_bookings')::int,0)
      WHEN 'games_played' THEN COALESCE((v_stats->>'games_played')::int,0)
      WHEN 'games_hosted' THEN COALESCE((v_stats->>'games_hosted')::int,0)
      WHEN 'reviews_written' THEN v_reviews
      WHEN 'referrals_made' THEN v_referrals
      ELSE 0 END;
    IF v_value >= v_ach.requirement_value THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (auth.uid(), v_ach.id) ON CONFLICT DO NOTHING;
      IF FOUND THEN v_total_xp := v_total_xp + v_ach.xp_reward; RETURN NEXT v_ach; END IF;
    END IF;
  END LOOP;
  IF v_total_xp > 0 THEN
    UPDATE public.profiles SET xp = COALESCE(xp,0) + v_total_xp,
      level = floor((COALESCE(xp,0)+v_total_xp)/100.0)::int + 1
    WHERE user_id = auth.uid();
  END IF;
  RETURN;
END; $$;