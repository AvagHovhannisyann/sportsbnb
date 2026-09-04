-- One pricing implementation, read by both the quote and the hold.
--
-- The booking panel showed "No booking fee — you pay the venue's listed price"
-- and a total equal to the listed rate. That was true only while commission_bps
-- was 0. The moment a service fee exists, the panel promises one price and
-- CheckoutPage charges another — the player is told there is no fee by the
-- screen where they decide, and shown one by the screen where they pay.
--
-- The panel cannot simply multiply by a rate of its own: that is how this went
-- wrong before, when it added a hardcoded 5% here and again in the total, and
-- quoted a fee the server never charged. So the rate is not sent to the client
-- at all. quote_booking_price() computes exactly what create_booking_hold()
-- will compute, because create_booking_hold() now calls it.
--
-- STABLE and writes nothing: safe to call on every slot selection.
-- Granted to anon as well as authenticated — it discloses only the venue's own
-- price and the public service-fee rate, both of which a visitor must be able
-- to see before signing in, and it takes no user identity into account.

CREATE OR REPLACE FUNCTION public.quote_booking_price(
  p_venue_id uuid,
  p_starts_at timestamp with time zone,
  p_ends_at timestamp with time zone,
  p_court_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_venue record;
  v_court record;
  v_hours numeric;
  v_price_per_hour numeric;
  v_owner_minor bigint;
  v_fee_minor bigint;
  v_commission_bps int;
BEGIN
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

  -- Zero-commission default: a missing or NULL setting means no fee.
  SELECT COALESCE(setting_value::int, 0) INTO v_commission_bps
  FROM public.platform_settings WHERE setting_key = 'commission_bps';
  v_commission_bps := COALESCE(v_commission_bps, 0);

  -- The owner is paid the listed rate untouched; the service fee is added on
  -- top and is what the customer pays over it. Nothing is deducted from the
  -- venue's price.
  v_owner_minor := round(v_price_per_hour * v_hours * 100);
  v_fee_minor := round(v_owner_minor * v_commission_bps / 10000.0);

  RETURN jsonb_build_object(
    'owner_amount_minor', v_owner_minor,
    'platform_fee_minor', v_fee_minor,
    'amount_minor', v_owner_minor + v_fee_minor,
    'currency', 'AMD',
    'hours', v_hours,
    'price_per_hour', v_price_per_hour,
    'commission_bps', v_commission_bps
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.quote_booking_price(uuid, timestamptz, timestamptz, uuid)
  TO anon, authenticated;

-- create_booking_hold now reads its price from the same function, so a quote
-- and the row it becomes cannot disagree. Everything else — the auth check,
-- the past-date check, the policy snapshot, the exclusion constraint that makes
-- double-booking impossible, the 20-minute expiry — is unchanged.
CREATE OR REPLACE FUNCTION public.create_booking_hold(
  p_venue_id uuid,
  p_starts_at timestamp with time zone,
  p_ends_at timestamp with time zone,
  p_court_id uuid DEFAULT NULL::uuid,
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_venue record;
  v_quote jsonb;
  v_hours numeric;
  v_owner_minor bigint;
  v_fee_minor bigint;
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

  -- Validates the range, the venue, the court, and prices the whole thing.
  v_quote := public.quote_booking_price(p_venue_id, p_starts_at, p_ends_at, p_court_id);
  v_owner_minor := (v_quote->>'owner_amount_minor')::bigint;
  v_fee_minor := (v_quote->>'platform_fee_minor')::bigint;
  v_hours := (v_quote->>'hours')::numeric;

  SELECT * INTO v_venue FROM public.venues WHERE id = p_venue_id;

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
$function$;