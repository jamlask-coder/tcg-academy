-- =============================================================================
-- Migration: tax_id UNIQUE — un NIF/NIE/CIF = un usuario activo
-- =============================================================================
-- Motivación: evitar que dos cuentas compartan el mismo identificador fiscal.
-- El check de unicidad en /api/auth es la primera barrera; este índice es la
-- defensa a nivel DB (TOCTOU-safe frente a inserts concurrentes).
--
-- Usamos índice UNIQUE parcial para no bloquear soft-deletes: filas con
-- deleted_at IS NOT NULL quedan fuera, así un usuario eliminado no bloquea
-- el registro futuro con el mismo NIF por error humano.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tax_id_unique
  ON users (tax_id)
  WHERE tax_id IS NOT NULL AND deleted_at IS NULL;

-- Índice para búsquedas server-side (getUserByNif) — el UNIQUE parcial
-- cubre la escritura, pero la lectura por tax_id se beneficia de un índice
-- dedicado explícito.
CREATE INDEX IF NOT EXISTS idx_users_tax_id_lookup
  ON users (tax_id)
  WHERE tax_id IS NOT NULL;
