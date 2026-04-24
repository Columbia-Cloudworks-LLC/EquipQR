ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teams_customer_id
  ON public.teams (customer_id)
  WHERE customer_id IS NOT NULL;
