-- Currency is a property of the listing, not the viewer.
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'AMD';

UPDATE public.venues SET currency = 'USD' WHERE city = 'Glendale';