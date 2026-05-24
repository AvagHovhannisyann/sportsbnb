
-- Autopilot config (single row)
CREATE TABLE public.autopilot_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_paused BOOLEAN NOT NULL DEFAULT false,
  target_cities JSONB NOT NULL DEFAULT '[{"city":"Yerevan","country":"AM","lat":40.1792,"lng":44.4991,"radius_m":15000},{"city":"Los Angeles","country":"US","lat":34.0522,"lng":-118.2437,"radius_m":20000}]'::jsonb,
  daily_send_cap INT NOT NULL DEFAULT 50,
  telegram_chat_id TEXT,
  digest_email TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Yerevan',
  last_digest_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.autopilot_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.autopilot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view autopilot config" ON public.autopilot_config
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update autopilot config" ON public.autopilot_config
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Autopilot runs log
CREATE TABLE public.autopilot_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  discovered INT NOT NULL DEFAULT 0,
  researched INT NOT NULL DEFAULT 0,
  sent INT NOT NULL DEFAULT 0,
  followups INT NOT NULL DEFAULT 0,
  replies INT NOT NULL DEFAULT 0,
  bookings_handled INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'running'
);

CREATE INDEX idx_autopilot_runs_started ON public.autopilot_runs(started_at DESC);

ALTER TABLE public.autopilot_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view runs" ON public.autopilot_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Outreach events (append-only audit log)
CREATE TABLE public.outreach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID REFERENCES public.outreach_targets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_events_target ON public.outreach_events(target_id, created_at DESC);
CREATE INDEX idx_outreach_events_kind ON public.outreach_events(kind, created_at DESC);

ALTER TABLE public.outreach_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view events" ON public.outreach_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Notifications outbox
CREATE TABLE public.notifications_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_outbox_pending ON public.notifications_outbox(status, created_at) WHERE status = 'pending';

ALTER TABLE public.notifications_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view notifications" ON public.notifications_outbox
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Extend outreach_targets for autopilot tracking
ALTER TABLE public.outreach_targets
  ADD COLUMN IF NOT EXISTS place_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS lat NUMERIC,
  ADD COLUMN IF NOT EXISTS lng NUMERIC,
  ADD COLUMN IF NOT EXISTS followup_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reply_sentiment TEXT,
  ADD COLUMN IF NOT EXISTS autopilot_locked BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_outreach_targets_status ON public.outreach_targets(status);
CREATE INDEX IF NOT EXISTS idx_outreach_targets_followup ON public.outreach_targets(status, last_contacted_at) WHERE status IN ('sent','followup_1','followup_2');

-- Enable required extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update trigger
CREATE TRIGGER update_autopilot_config_updated_at
  BEFORE UPDATE ON public.autopilot_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
