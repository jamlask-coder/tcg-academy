-- Rate limit persistente (ver src/lib/rateLimitStore.ts).
--
-- Cada entrada representa "cuántos intentos ha hecho el key en la ventana
-- actual". Se limpia por el propio código (best-effort) y/o por un cron.
--
-- PK compuesta por `key` (ej: "auth:login:203.0.113.5"). El código escribe
-- con UPSERT onConflict=key → no hay duplicados.

create table if not exists public.rate_limits (
  key text primary key,
  count int not null default 0,
  reset_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Índice para limpieza rápida de expirados.
create index if not exists idx_rate_limits_reset_at
  on public.rate_limits (reset_at);

-- RLS estricto: solo la service role key puede leer/escribir (nunca el cliente
-- anónimo). Next.js server routes usan `getSupabaseAdmin()` que emplea la
-- SUPABASE_SERVICE_KEY, así que esta tabla queda invisible al browser.
alter table public.rate_limits enable row level security;

-- No creamos policies → deny-by-default. La service role bypassa RLS.

-- Función opcional de limpieza para un cron externo (pg_cron / Vercel cron).
create or replace function public.rate_limits_cleanup()
returns void
language sql
security definer
as $$
  delete from public.rate_limits where reset_at < now() - interval '1 day';
$$;
