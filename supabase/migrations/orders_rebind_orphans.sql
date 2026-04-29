-- ─────────────────────────────────────────────────────────────────────────
-- orders_rebind_orphans.sql
--
-- Re-enlaza pedidos huérfanos (orders.user_id IS NULL) con su dueño en la
-- tabla `users` cruzando por email. Necesario porque el importador
-- WP→Supabase enlaza user_id mediante un subselect a users.email; si el
-- pedido se importó antes que su usuario, user_id quedó NULL y el
-- ON CONFLICT DO UPDATE del importador NO lo rebindeaba.
--
-- Síntoma que arregla: usuarios que no veían sus compras pasadas en
-- /admin/usuarios/[id] ni en /cuenta/pedidos cuando el match por
-- userEmail también fallaba (email vacío en customer_snapshot, etc.).
--
-- Idempotente: solo afecta a filas con user_id NULL. Re-ejecutarla no
-- vuelve a tocar las ya enlazadas.
--
-- Antes de aplicar, ejecutar:
--   node scripts/diagnose-orphan-orders.mjs
-- y verificar el conteo de "Rebindables".
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

-- Tabla temporal con el plan de rebind para poder reportarlo y auditarlo.
CREATE TEMP TABLE _rebind_plan ON COMMIT DROP AS
SELECT
  o.id AS order_id,
  u.id AS new_user_id,
  LOWER(TRIM(o.customer_snapshot->>'email')) AS matched_email
FROM orders o
JOIN users u
  ON LOWER(TRIM(u.email)) = LOWER(TRIM(o.customer_snapshot->>'email'))
WHERE o.user_id IS NULL
  AND COALESCE(TRIM(o.customer_snapshot->>'email'), '') <> '';

-- Reporte previo (visible en Output del SQL Editor).
SELECT COUNT(*) AS pedidos_a_rebindear FROM _rebind_plan;

-- Backfill real.
UPDATE orders o
   SET user_id    = p.new_user_id,
       updated_at = NOW()
  FROM _rebind_plan p
 WHERE o.id = p.order_id
   AND o.user_id IS NULL;  -- doble defensa: nunca pisar user_id ya enlazado

-- Auditoría: deja una línea en audit_logs por cada rebind ejecutado.
-- Útil para que el admin pueda demostrar quién y cuándo se enlazó.
INSERT INTO audit_logs (entity_type, entity_id, action, metadata, created_at)
SELECT
  'order',
  p.order_id,
  'rebind_user_from_email',
  jsonb_build_object(
    'matched_email', p.matched_email,
    'new_user_id', p.new_user_id,
    'reason', 'orders_rebind_orphans.sql'
  ),
  NOW()
FROM _rebind_plan p;

-- Reporte post: cuántos huérfanos quedan (esperado: solo email vacío o sin user).
SELECT
  COUNT(*) FILTER (WHERE COALESCE(TRIM(customer_snapshot->>'email'), '') = '') AS sin_email,
  COUNT(*) FILTER (WHERE COALESCE(TRIM(customer_snapshot->>'email'), '') <> '') AS con_email_sin_user,
  COUNT(*) AS huerfanos_restantes
FROM orders
WHERE user_id IS NULL;

COMMIT;
