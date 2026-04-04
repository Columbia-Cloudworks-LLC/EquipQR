create or replace function public.monitoring_healthcheck()
returns table (
  ok boolean,
  checked_at timestamptz
)
language sql
security invoker
set search_path = public
as $$
  select true as ok, now() as checked_at;
$$;
