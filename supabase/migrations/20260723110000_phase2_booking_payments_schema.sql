-- Phase 2: Airbnb-style booking + payments core (schema)
-- A) bookings normalization  B) slot locking  C) money tables  D) state machine

-- =============================================================
-- A) BOOKINGS NORMALIZATION
--    Legacy columns kept for compatibility (venue_id TEXT, booking_time TEXT);
--    new bookings are written with proper types alongside them.
-- =============================================================
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

-- Best-effort backfill of legacy rows (non-destructive; unparseable rows stay NULL)
UPDATE public.bookings
SET venue_uuid = venue_id::uuid
WHERE venue_uuid IS NULL
  AND venue_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE public.bookings
SET starts_at = ((booking_date::text || ' ' || booking_time)::timestamp AT TIME ZONE 'Asia/Yerevan'),
    ends_at   = ((booking_date::text || ' ' || booking_time)::timestamp AT TIME ZONE 'Asia/Yerevan')
                + make_interval(hours => GREATEST(duration_hours, 1))
WHERE starts_at IS NULL
  AND booking_time ~ '^\d{1,2}:\d{2}';

-- Widen the status set (legacy values remain valid)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (
  status IN (
    'pending', 'confirmed', 'completed', 'cancelled',            -- legacy
    'pending_payment', 'cancelled_by_player', 'cancelled_by_owner',
    'refunded', 'expired', 'no_show'
  )
);

-- =============================================================
-- B) SLOT LOCKING — double-booking becomes impossible at the DB level.
--    Applies only to new-style rows (starts_at present); legacy rows are exempt.
-- =============================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    venue_uuid WITH =,
    COALESCE(court_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  )
  WHERE (status IN ('pending_payment', 'confirmed') AND starts_at IS NOT NULL AND venue_uuid IS NOT NULL);

-- Game capacity: row-lock + count in one transaction (free games only;
-- paid joins go through the payment flow which uses the same lock).
CREATE OR REPLACE FUNCTION public.join_game(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game record;
  v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_game FROM public.games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'game not found';
  END IF;
  IF v_game.status <> 'open' THEN
    RAISE EXCEPTION 'game is not open';
  END IF;
  IF COALESCE(v_game.price_per_player, 0) > 0 THEN
    RAISE EXCEPTION 'payment required for this game';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.game_participants
    WHERE game_id = p_game_id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('ok', true, 'already_joined', true);
  END IF;

  SELECT count(*) INTO v_count
  FROM public.game_participants
  WHERE game_id = p_game_id AND status = 'confirmed';
  IF v_count >= v_game.max_players THEN
    RAISE EXCEPTION 'game is full';
  END IF;

  INSERT INTO public.game_participants (game_id, user_id, status)
  VALUES (p_game_id, auth.uid(), 'confirmed');

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Internal variant for the payment-verification path (service role only):
-- same lock + capacity check, joins on behalf of the payer.
CREATE OR REPLACE FUNCTION public.join_game_paid(p_game_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game record;
  v_count int;
BEGIN
  SELECT * INTO v_game FROM public.games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'game not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.game_participants
    WHERE game_id = p_game_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('ok', true, 'already_joined', true);
  END IF;

  SELECT count(*) INTO v_count
  FROM public.game_participants
  WHERE game_id = p_game_id AND status = 'confirmed';
  IF v_count >= v_game.max_players THEN
    RAISE EXCEPTION 'game is full';
  END IF;

  INSERT INTO public.game_participants (game_id, user_id, status)
  VALUES (p_game_id, p_user_id, 'confirmed');

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_game_paid(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- =============================================================
-- C) MONEY TABLES
-- =============================================================
CREATE SEQUENCE IF NOT EXISTS public.payment_order_ref_seq START 100000;

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid REFERENCES public.bookings(id),
  game_id uuid REFERENCES public.games(id),
  provider text NOT NULL CHECK (provider IN ('ameria', 'idram', 'mock')),
  order_ref bigint NOT NULL UNIQUE DEFAULT nextval('public.payment_order_ref_seq'),
  provider_payment_id text,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'AMD',
  status text NOT NULL DEFAULT 'created' CHECK (status IN (
    'created', 'redirected', 'paid', 'failed', 'cancelled',
    'refund_pending', 'refunded', 'partially_refunded'
  )),
  refunded_minor bigint NOT NULL DEFAULT 0,
  idempotency_key text UNIQUE,
  provider_payload jsonb,
  error_code text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_exactly_one_subject CHECK (
    (booking_id IS NOT NULL)::int + (game_id IS NOT NULL)::int = 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_payment_id_key
  ON public.payments (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON public.payments (booking_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);

-- Append-only money movement log. Owner balance = SUM(amount_minor) per owner.
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_type text NOT NULL CHECK (entry_type IN (
    'payment_received', 'owner_earning', 'platform_commission',
    'refund', 'owner_refund_debit', 'payout', 'adjustment'
  )),
  payment_id uuid REFERENCES public.payments(id),
  booking_id uuid REFERENCES public.bookings(id),
  payout_id uuid,
  owner_id uuid,                     -- whose balance this affects (NULL = platform)
  amount_minor bigint NOT NULL,      -- signed: + credits, - debits
  currency text NOT NULL DEFAULT 'AMD',
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Callback idempotency: the confirmation triple can only be written once per payment.
CREATE UNIQUE INDEX IF NOT EXISTS ledger_once_per_payment
  ON public.ledger_entries (payment_id, entry_type)
  WHERE entry_type IN ('payment_received', 'owner_earning', 'platform_commission');

CREATE INDEX IF NOT EXISTS ledger_owner_idx ON public.ledger_entries (owner_id);

CREATE TABLE IF NOT EXISTS public.owner_payout_accounts (
  owner_id uuid PRIMARY KEY,
  method text NOT NULL CHECK (method IN ('bank_transfer', 'idram')),
  details jsonb NOT NULL,            -- IBAN / Idram wallet ID, holder name, bank
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'AMD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
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

ALTER TABLE public.ledger_entries
  ADD CONSTRAINT ledger_entries_payout_fk FOREIGN KEY (payout_id) REFERENCES public.payouts(id);

-- RLS: clients can read their own money data; ALL writes go through the
-- service role (edge functions) or SECURITY DEFINER RPCs.
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners see their own ledger"
  ON public.ledger_entries FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners manage their payout account"
  ON public.owner_payout_accounts FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners see their payouts"
  ON public.payouts FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

-- Owner balances (RLS of ledger_entries applies through security_invoker)
CREATE OR REPLACE VIEW public.owner_balances
WITH (security_invoker = on) AS
SELECT owner_id, currency, SUM(amount_minor)::bigint AS balance_minor
FROM public.ledger_entries
WHERE owner_id IS NOT NULL
GROUP BY owner_id, currency;

-- Platform commission lives server-side now (basis points)
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('commission_bps', '500')
ON CONFLICT (setting_key) DO NOTHING;

-- =============================================================
-- D) STATE MACHINE
-- =============================================================

-- Clients cannot touch money columns or make arbitrary status jumps;
-- the service role (edge functions) can do anything.
CREATE OR REPLACE FUNCTION public.enforce_booking_transitions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.amount_minor        IS DISTINCT FROM OLD.amount_minor
     OR NEW.platform_fee_minor IS DISTINCT FROM OLD.platform_fee_minor
     OR NEW.owner_amount_minor IS DISTINCT FROM OLD.owner_amount_minor
     OR NEW.total_price      IS DISTINCT FROM OLD.total_price
     OR NEW.payment_intent_id IS DISTINCT FROM OLD.payment_intent_id
     OR NEW.currency         IS DISTINCT FROM OLD.currency THEN
    RAISE EXCEPTION 'money fields are read-only';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'pending_payment' AND NEW.status = 'cancelled_by_player') OR
      (OLD.status = 'confirmed'       AND NEW.status IN ('cancelled_by_owner', 'completed', 'no_show')) OR
      (OLD.status = 'pending'         AND NEW.status IN ('confirmed', 'cancelled'))  -- legacy owner flows
    ) THEN
      RAISE EXCEPTION 'status transition % -> % not allowed', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_enforce_transitions ON public.bookings;
CREATE TRIGGER bookings_enforce_transitions
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_transitions();

-- Price is ALWAYS derived server-side here; the client only picks the slot.
CREATE OR REPLACE FUNCTION public.create_booking_hold(
  p_venue_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_court_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue record;
  v_court record;
  v_hours numeric;
  v_price_per_hour numeric;
  v_owner_minor bigint;
  v_fee_minor bigint;
  v_commission_bps int;
  v_policy jsonb;
  v_booking_id uuid;
  v_local_start timestamp;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_starts_at < now() THEN
    RAISE EXCEPTION 'start time is in the past';
  END IF;
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'invalid time range';
  END IF;
  v_hours := EXTRACT(EPOCH FROM (p_ends_at - p_starts_at)) / 3600;
  IF v_hours > 8 THEN
    RAISE EXCEPTION 'booking too long';
  END IF;

  SELECT * INTO v_venue FROM public.venues WHERE id = p_venue_id AND is_active IS NOT FALSE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'venue not found';
  END IF;

  v_price_per_hour := v_venue.price_per_hour;
  IF p_court_id IS NOT NULL THEN
    SELECT * INTO v_court FROM public.venue_courts
    WHERE id = p_court_id AND venue_id = p_venue_id AND is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'court not found';
    END IF;
    v_price_per_hour := COALESCE(v_court.price_per_hour, v_price_per_hour);
  END IF;

  SELECT COALESCE(setting_value::int, 500) INTO v_commission_bps
  FROM public.platform_settings WHERE setting_key = 'commission_bps';
  v_commission_bps := COALESCE(v_commission_bps, 500);

  v_owner_minor := round(v_price_per_hour * v_hours * 100);
  v_fee_minor := round(v_owner_minor * v_commission_bps / 10000.0);

  SELECT COALESCE(
    jsonb_build_object(
      'cancellation_policy', vp.cancellation_policy,
      'cancellation_hours', vp.cancellation_hours,
      'refund_type', vp.refund_type
    ),
    '{"cancellation_policy":"flexible","cancellation_hours":24,"refund_type":"full"}'::jsonb
  ) INTO v_policy
  FROM public.venue_policies vp WHERE vp.venue_id = p_venue_id;
  v_policy := COALESCE(v_policy, '{"cancellation_policy":"flexible","cancellation_hours":24,"refund_type":"full"}'::jsonb);

  v_local_start := p_starts_at AT TIME ZONE 'Asia/Yerevan';

  BEGIN
    INSERT INTO public.bookings (
      user_id, venue_id, venue_uuid, court_id, venue_name,
      booking_date, booking_time, duration_hours,
      starts_at, ends_at,
      total_price, amount_minor, platform_fee_minor, owner_amount_minor, currency,
      cancellation_policy, status, expires_at, notes, source
    ) VALUES (
      auth.uid(), p_venue_id::text, p_venue_id, p_court_id, v_venue.name,
      v_local_start::date, to_char(v_local_start, 'HH24:MI'), GREATEST(round(v_hours)::int, 1),
      p_starts_at, p_ends_at,
      (v_owner_minor + v_fee_minor) / 100.0, v_owner_minor + v_fee_minor, v_fee_minor, v_owner_minor, 'AMD',
      v_policy, 'pending_payment', now() + interval '20 minutes', p_notes, 'app'
    )
    RETURNING id INTO v_booking_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'slot_taken';
  END;

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'amount_minor', v_owner_minor + v_fee_minor,
    'owner_amount_minor', v_owner_minor,
    'platform_fee_minor', v_fee_minor,
    'currency', 'AMD',
    'expires_at', now() + interval '20 minutes'
  );
END;
$$;

-- Frees expired holds (called by cron via edge function)
CREATE OR REPLACE FUNCTION public.expire_stale_holds()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  WITH expired AS (
    UPDATE public.bookings
    SET status = 'expired'
    WHERE status = 'pending_payment' AND expires_at < now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;

  UPDATE public.payments p
  SET status = 'cancelled', updated_at = now()
  FROM public.bookings b
  WHERE p.booking_id = b.id
    AND b.status = 'expired'
    AND p.status IN ('created', 'redirected');

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_stale_holds() FROM PUBLIC, anon, authenticated;

-- Availability for the booking panel: hour slots derived from venue_hours,
-- minus blocked dates and active bookings.
CREATE OR REPLACE FUNCTION public.get_available_slots(p_venue_id uuid, p_date date, p_court_id uuid DEFAULT NULL)
RETURNS TABLE (slot_start timestamptz, slot_end timestamptz, available boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open time;
  v_close time;
  v_is_closed boolean;
BEGIN
  SELECT vh.open_time, vh.close_time, vh.is_closed
  INTO v_open, v_close, v_is_closed
  FROM public.venue_hours vh
  WHERE vh.venue_id = p_venue_id
    AND vh.day_of_week = EXTRACT(DOW FROM p_date)::int;

  IF NOT FOUND THEN
    v_open := '09:00'; v_close := '22:00'; v_is_closed := false;
  END IF;

  IF v_is_closed OR EXISTS (
    SELECT 1 FROM public.blocked_dates bd
    WHERE bd.venue_id = p_venue_id AND bd.blocked_date = p_date
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH hours AS (
    SELECT generate_series(
      (p_date::timestamp + v_open) AT TIME ZONE 'Asia/Yerevan',
      (p_date::timestamp + v_close - interval '1 hour') AT TIME ZONE 'Asia/Yerevan',
      interval '1 hour'
    ) AS s
  )
  SELECT
    h.s,
    h.s + interval '1 hour',
    NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.venue_uuid = p_venue_id
        AND (p_court_id IS NULL OR b.court_id IS NULL OR b.court_id = p_court_id)
        AND b.status IN ('pending_payment', 'confirmed')
        AND tstzrange(b.starts_at, b.ends_at) && tstzrange(h.s, h.s + interval '1 hour')
    ) AND h.s > now()
  FROM hours h;
END;
$$;
