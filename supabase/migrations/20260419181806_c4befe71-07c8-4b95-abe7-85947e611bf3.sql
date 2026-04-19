-- Add contact fields to venues
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT true;

-- Create booking_intents table for lead tracking
CREATE TABLE IF NOT EXISTS public.booking_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  venue_name TEXT NOT NULL,
  user_id UUID,
  channel_used TEXT NOT NULL CHECK (channel_used IN ('whatsapp','sms','call')),
  booking_code TEXT NOT NULL UNIQUE,
  booking_date DATE,
  booking_time TEXT,
  players_count INTEGER,
  note TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'clicked' CHECK (status IN ('clicked','owner_contacted','confirmed_booking','no_booking','no_response')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_intents_venue ON public.booking_intents(venue_id);
CREATE INDEX IF NOT EXISTS idx_booking_intents_created ON public.booking_intents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_intents_status ON public.booking_intents(status);

ALTER TABLE public.booking_intents ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can create an intent (it's just a click track)
CREATE POLICY "Anyone can create booking intents"
  ON public.booking_intents FOR INSERT
  WITH CHECK (true);

-- Users can view their own intents
CREATE POLICY "Users can view their own intents"
  ON public.booking_intents FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view, update, delete all
CREATE POLICY "Admins can view all intents"
  ON public.booking_intents FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update intents"
  ON public.booking_intents FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete intents"
  ON public.booking_intents FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_booking_intents_updated
  BEFORE UPDATE ON public.booking_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();