-- field_checkins: let a check-in belong to a verified field
--
-- The table was created for `public_fields`:
--
--   field_id uuid NOT NULL REFERENCES public.public_fields(id)
--
-- and a later migration (20260314193224) added a second, nullable column for
-- the other kind of field:
--
--   verified_field_id uuid REFERENCES public.verified_fields(id)
--
-- without relaxing the first. So a check-in on a verified field had nowhere
-- legal to go. `useVerifiedFields.checkIn` writes the same id into both
-- columns to satisfy the NOT NULL, and that id is a `verified_fields` primary
-- key, so `field_id`'s foreign key rejects it: every check-in from the Nearby
-- Fields map fails with a 23503 and the user is told "Failed to check in".
--
-- Two changes, and they have to land together with the client change that
-- stops writing `field_id`. Dropping that write without this migration only
-- swaps a foreign-key violation for a not-null one.

ALTER TABLE public.field_checkins
  ALTER COLUMN field_id DROP NOT NULL;

-- Exactly one kind of field per row, stated rather than assumed. Without it
-- the columns are two nullable ids and nothing says a row must have one, which
-- is how the code came to write both in the first place.
--
-- NOT VALID on purpose: it applies to every insert and update from here on,
-- and skips validating rows written before the rule existed. Those cannot be
-- fixed by a constraint anyway, and a migration that fails on legacy data is a
-- migration nobody runs.
ALTER TABLE public.field_checkins
  DROP CONSTRAINT IF EXISTS field_checkins_exactly_one_field;
ALTER TABLE public.field_checkins
  ADD CONSTRAINT field_checkins_exactly_one_field CHECK (
    (field_id IS NOT NULL)::int + (verified_field_id IS NOT NULL)::int = 1
  ) NOT VALID;

CREATE INDEX IF NOT EXISTS field_checkins_verified_field_id_idx
  ON public.field_checkins (verified_field_id);
