-- Fix the touch_updated_at function to have proper search path
create or replace function public.touch_updated_at() returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  new.updated_at = now();
  return new;
end; $$;