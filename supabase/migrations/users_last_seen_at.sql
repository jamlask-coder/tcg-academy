-- =============================================================================
-- users.last_seen_at — heartbeat de presencia
-- =============================================================================
-- Por qué: necesitamos saber si un usuario está "online" (activo en los
-- últimos ~3 min) sin montar websockets. El cliente hace POST /api/auth con
-- action=heartbeat cada 60s mientras está logueado y eso actualiza esta
-- columna. El admin renderiza un punto verde/rojo según el delta.
--
-- Coste: una UPDATE por usuario activo cada 60s (asumible — el dashboard
-- solo lee, escritura va por service-role).
--
-- Idempotente: añade columna sólo si no existe.
-- =============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Index para queries del admin que listan "usuarios online ahora".
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at
  ON public.users (last_seen_at DESC)
  WHERE last_seen_at IS NOT NULL;

COMMENT ON COLUMN public.users.last_seen_at IS
  'Último heartbeat del cliente. Si NOW() - last_seen_at < 3min → online.';
