-- Pin search_path on the two trigger functions that were missing it.
--
-- Supabase's database linter (0011_function_search_path_mutable) flagged
-- enforce_booking_transitions and protect_profile_xp as having a role-mutable
-- search_path. Both are plain (SECURITY INVOKER) trigger functions, so the
-- exposure is limited, but an unqualified object reference inside them would
-- resolve against whatever search_path the calling role happens to have.
-- Pinning it removes that ambiguity. Function bodies are unchanged.

CREATE OR REPLACE FUNCTION public.enforce_booking_transitions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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
      (OLD.status = 'pending'         AND NEW.status IN ('confirmed', 'cancelled'))
    ) THEN
      RAISE EXCEPTION 'status transition % -> % not allowed', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_xp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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
