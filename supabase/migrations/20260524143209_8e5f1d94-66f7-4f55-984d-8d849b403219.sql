
CREATE TABLE public.outreach_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  country text,
  language text NOT NULL DEFAULT 'en',
  contact_email text,
  contact_name text,
  enriched jsonb NOT NULL DEFAULT '{}'::jsonb,
  research jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_subject text,
  ai_body text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  last_contacted_at timestamptz,
  followup_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_targets_status ON public.outreach_targets(status);
CREATE INDEX idx_outreach_targets_city ON public.outreach_targets(city);
CREATE INDEX idx_outreach_targets_followup ON public.outreach_targets(followup_at) WHERE followup_at IS NOT NULL;

ALTER TABLE public.outreach_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage outreach_targets" ON public.outreach_targets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_outreach_targets_updated
BEFORE UPDATE ON public.outreach_targets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.outreach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES public.outreach_targets(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('outbound','inbound')),
  subject text,
  body text NOT NULL,
  from_email text,
  to_email text,
  resend_id text,
  status text NOT NULL DEFAULT 'sent',
  sent_by uuid,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_messages_target ON public.outreach_messages(target_id);

ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage outreach_messages" ON public.outreach_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
