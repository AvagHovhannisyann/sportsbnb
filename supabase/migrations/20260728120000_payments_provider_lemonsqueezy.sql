-- Lemon Squeezy becomes the only live payment provider.
--
-- payments.provider was CHECKed against ('ameria','idram','mock'), so a
-- Lemon Squeezy payment row could not be inserted at all. Widen the constraint
-- rather than replace it: 'ameria' and 'idram' stay accepted so that historical
-- rows remain valid and the (still deployed, now unreachable) legacy callbacks
-- cannot break on a constraint violation. Selection is gated in code instead —
-- supabase/functions/_shared/providers/registry.ts no longer returns those
-- adapters and payments-init only accepts 'lemonsqueezy' and 'mock'.

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_provider_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_provider_check CHECK (
  provider IN ('lemonsqueezy', 'ameria', 'idram', 'mock')
);
