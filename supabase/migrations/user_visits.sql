-- =============================================================================
-- user_visits — registro de páginas visitadas por usuarios autenticados
-- =============================================================================
-- Por qué: el panel /admin/usuarios/[id] mostraba datos de actividad
-- inventados con seed determinista. El admin necesita ver visitas REALES por
-- mes, total de páginas vistas y top de rutas más visitadas para entender
-- el comportamiento del cliente.
--
-- Modelo:
--   - 1 fila = 1 navegación a una ruta del sitio (autenticado).
--   - Anónimos NO se registran — no podemos correlacionarlos con un user_id
--     y la finalidad del panel es analítica por cliente, no embudo público.
--   - Throttle 5s/usuario en el endpoint para evitar spam si la SPA
--     dispara navigation events redundantes.
--   - PII mínima: solo path (pública por diseño) + ts. NO guardamos query
--     strings (pueden contener tokens/búsquedas) ni user agent crudo.
--
-- Retención: 36 meses. Más allá no es relevante para análisis de cliente
-- y es PII vinculada a navegación (RGPD: minimizar).
--
-- RLS:
--   - Lectura: solo service-role (admin endpoint). El usuario NO puede
--     leer su propio historial vía REST — si quisiéramos esa feature en
--     /cuenta, abriríamos una policy específica.
--   - Escritura: solo service-role (vía /api/activity/visit que valida la
--     sesión antes de escribir).
--
-- Idempotente: usa CREATE TABLE IF NOT EXISTS + indexes condicionales.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_visits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- Path normalizado (sin query string). Truncamos a 512 chars defensivo.
  path TEXT NOT NULL,
  -- Hash corto del session token (no el token en claro) — sirve para
  -- estimar "sesiones únicas" sin guardar identificadores de auth.
  session_hash TEXT,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice principal: las queries del admin son SIEMPRE
-- "dame las visitas de USER ordenadas por ts descendente, últimos 12 meses".
CREATE INDEX IF NOT EXISTS idx_user_visits_user_ts
  ON public.user_visits (user_id, ts DESC);

-- Para la query "top paths del usuario" (group by path).
CREATE INDEX IF NOT EXISTS idx_user_visits_user_path
  ON public.user_visits (user_id, path);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_visits ENABLE ROW LEVEL SECURITY;

-- Eliminamos policies previas si existen (idempotencia entre re-runs).
DROP POLICY IF EXISTS "user_visits_service_role_all" ON public.user_visits;

-- Solo service-role puede leer/escribir. El endpoint REST público nunca
-- toca esta tabla con rol anon — siempre vía supabase admin client.
CREATE POLICY "user_visits_service_role_all"
  ON public.user_visits
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

COMMENT ON TABLE public.user_visits IS
  'Visitas autenticadas (1 fila = 1 navegación). Retención 36m. Solo service-role.';
COMMENT ON COLUMN public.user_visits.path IS
  'Pathname sin query string. Sanitizado a 512 chars en el endpoint.';
COMMENT ON COLUMN public.user_visits.session_hash IS
  'Hash corto opcional del token de sesión — para estimar sesiones únicas sin guardar el token.';

-- ── Limpieza periódica ───────────────────────────────────────────────────────
-- Retención 36 meses. Ejecútalo desde un cron Supabase o desde
-- /api/cron/* (ya hay infra en next-cron). Idempotente — no falla si no hay rows.
--
-- DELETE FROM public.user_visits WHERE ts < NOW() - INTERVAL '36 months';
