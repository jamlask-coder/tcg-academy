-- ═══════════════════════════════════════════════════════════════════════════
-- Tabla email_verification_tokens — tokens de verificación de email
-- ═══════════════════════════════════════════════════════════════════════════
-- Se emite en el registro (/api/auth action=register) y se consume al hacer
-- clic en el enlace del email (/api/auth action=verify-email).
-- Nunca guardamos el token en claro — solo SHA-256 hex.

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  token_hash  text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz
);

-- Un token activo por email (los expirados/usados pueden coexistir).
CREATE UNIQUE INDEX IF NOT EXISTS email_verification_one_active_idx
  ON email_verification_tokens (lower(email))
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS email_verification_user_idx
  ON email_verification_tokens (user_id);

-- Añadir columnas de verificación a users (idempotente).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified_at     timestamptz;

-- RLS: escritura solo service_role (nunca el cliente directamente).
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_verification service only" ON email_verification_tokens;
CREATE POLICY "email_verification service only"
  ON email_verification_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
