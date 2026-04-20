-- 1. Add lead outcome tracking to booking_intents
ALTER TABLE public.booking_intents
  ADD COLUMN IF NOT EXISTS lead_outcome TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS outcome_updated_at TIMESTAMPTZ;

-- Validation trigger (instead of CHECK constraint, per guidelines)
CREATE OR REPLACE FUNCTION public.validate_lead_outcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.lead_outcome NOT IN ('pending', 'confirmed', 'no_show', 'lost') THEN
    RAISE EXCEPTION 'Invalid lead_outcome: %', NEW.lead_outcome;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.lead_outcome IS DISTINCT FROM OLD.lead_outcome THEN
    NEW.outcome_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_lead_outcome ON public.booking_intents;
CREATE TRIGGER trg_validate_lead_outcome
BEFORE INSERT OR UPDATE ON public.booking_intents
FOR EACH ROW EXECUTE FUNCTION public.validate_lead_outcome();

-- Allow venue owners to update lead_outcome on intents for their venues
CREATE POLICY "Venue owners can update lead outcomes"
ON public.booking_intents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = booking_intents.venue_id
      AND v.owner_id = auth.uid()
  )
);

-- Allow venue owners to view intents for their venues
CREATE POLICY "Venue owners can view their venue intents"
ON public.booking_intents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = booking_intents.venue_id
      AND v.owner_id = auth.uid()
  )
);

-- 2. AI insights cache table
CREATE TABLE IF NOT EXISTS public.ai_insights_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  insight_type TEXT NOT NULL,
  scope_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_lookup
  ON public.ai_insights_cache (user_id, insight_type, scope_key);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_expires
  ON public.ai_insights_cache (expires_at);

ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cached insights"
ON public.ai_insights_cache
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cached insights"
ON public.ai_insights_cache
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cached insights"
ON public.ai_insights_cache
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cached insights"
ON public.ai_insights_cache
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all cached insights"
ON public.ai_insights_cache
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all cached insights"
ON public.ai_insights_cache
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ai_insights_cache_updated_at
BEFORE UPDATE ON public.ai_insights_cache
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();