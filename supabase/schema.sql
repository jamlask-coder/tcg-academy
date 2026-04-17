-- =============================================================================
-- TCG Academy — Esquema completo de base de datos (Supabase / PostgreSQL)
-- =============================================================================
-- Ejecutar en Supabase SQL Editor o como migración.
-- Incluye: tablas, índices, RLS, triggers, funciones.
-- =============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('cliente', 'mayorista', 'tienda', 'admin');
CREATE TYPE order_status AS ENUM ('pendiente', 'confirmado', 'procesando', 'enviado', 'entregado', 'cancelado', 'devuelto');
CREATE TYPE payment_status AS ENUM ('pendiente', 'cobrado', 'fallido', 'reembolsado');
CREATE TYPE payment_method AS ENUM ('tarjeta', 'paypal', 'bizum', 'transferencia', 'tienda');
CREATE TYPE invoice_status AS ENUM ('emitida', 'enviada_aeat', 'verificada', 'rechazada', 'anulada');
CREATE TYPE return_status AS ENUM ('solicitada', 'aprobada', 'rechazada', 'enviada', 'recibida', 'reembolsada', 'cerrada');
CREATE TYPE consent_type AS ENUM ('terms', 'privacy', 'marketing_email', 'cookies_analytics', 'cookies_marketing', 'data_processing');
CREATE TYPE consent_status AS ENUM ('granted', 'revoked');

-- ─── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL UNIQUE,
  username      TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  last_name     TEXT NOT NULL DEFAULT '',
  phone         TEXT DEFAULT '',
  role          user_role NOT NULL DEFAULT 'cliente',
  referral_code TEXT UNIQUE,
  referred_by   TEXT,
  birth_date    DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_.]{3,20}$' OR username IS NULL),
  CONSTRAINT email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$')
);

CREATE INDEX idx_users_email ON users (LOWER(email));
CREATE INDEX idx_users_username ON users (LOWER(username)) WHERE username IS NOT NULL;
CREATE INDEX idx_users_referral ON users (referral_code) WHERE referral_code IS NOT NULL;

-- ─── Addresses ──────────────────────────────────────────────────────────────
CREATE TABLE addresses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label         TEXT NOT NULL DEFAULT 'Casa',
  nombre        TEXT NOT NULL,
  apellidos     TEXT NOT NULL,
  calle         TEXT NOT NULL,
  numero        TEXT NOT NULL DEFAULT '',
  piso          TEXT,
  cp            TEXT NOT NULL,
  ciudad        TEXT NOT NULL,
  provincia     TEXT NOT NULL DEFAULT '',
  pais          TEXT NOT NULL DEFAULT 'ES',
  telefono      TEXT,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON addresses (user_id);

-- ─── Empresa (B2B data) ────────────────────────────────────────────────────
CREATE TABLE empresa_data (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  cif               TEXT NOT NULL,
  razon_social      TEXT NOT NULL,
  direccion_fiscal  TEXT NOT NULL,
  persona_contacto  TEXT NOT NULL DEFAULT '',
  telefono_empresa  TEXT DEFAULT '',
  email_facturacion TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Password Reset Tokens ──────────────────────────────────────────────────
CREATE TABLE reset_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reset_tokens_user ON reset_tokens (user_id);
CREATE INDEX idx_reset_tokens_expires ON reset_tokens (expires_at) WHERE used_at IS NULL;

-- ─── Sessions (JWT tracking for forced logout) ─────────────────────────────
CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti        TEXT NOT NULL UNIQUE,  -- JWT ID for revocation
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_jti ON sessions (jti);

-- ─── Orders ─────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id               TEXT PRIMARY KEY,  -- TCG-YYMMDD-XXXXXX format
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_email   TEXT NOT NULL,
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT,
  status           order_status NOT NULL DEFAULT 'pendiente',
  shipping_method  TEXT NOT NULL DEFAULT 'estandar',
  shipping_cost    NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method   payment_method NOT NULL,
  payment_status   payment_status NOT NULL DEFAULT 'pendiente',
  payment_intent   TEXT,  -- Stripe payment intent ID
  subtotal         NUMERIC(10,2) NOT NULL,
  coupon_code      TEXT,
  coupon_discount  NUMERIC(10,2) DEFAULT 0,
  points_discount  NUMERIC(10,2) DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL,
  tracking_number  TEXT,
  tracking_url     TEXT,
  notes            TEXT,
  shipping_address JSONB NOT NULL,  -- {calle, numero, piso, cp, ciudad, provincia, pais}
  tienda_recogida  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders (user_id);
CREATE INDEX idx_orders_email ON orders (customer_email);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created ON orders (created_at DESC);

-- ─── Order Items ────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL,
  name        TEXT NOT NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 99),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  image_url   TEXT
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- ─── Invoices ───────────────────────────────────────────────────────────────
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number  TEXT NOT NULL UNIQUE,  -- FA-2026/0001 format
  order_id        TEXT REFERENCES orders(id),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_email  TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  customer_nif    TEXT,
  status          invoice_status NOT NULL DEFAULT 'emitida',
  subtotal        NUMERIC(10,2) NOT NULL,
  vat_rate        NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  vat_amount      NUMERIC(10,2) NOT NULL,
  total           NUMERIC(10,2) NOT NULL,
  hash            TEXT,          -- SHA-256 hash for VeriFactu chain
  prev_hash       TEXT,          -- Previous invoice hash (chain integrity)
  verifactu_id    TEXT,          -- AEAT VeriFactu submission ID
  rectifies       UUID REFERENCES invoices(id),  -- Rectificative invoice pointer
  pdf_url         TEXT,
  data            JSONB,         -- Full invoice data (items, addresses, etc.)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_order ON invoices (order_id);
CREATE INDEX idx_invoices_user ON invoices (user_id);
CREATE INDEX idx_invoices_number ON invoices (invoice_number);
CREATE INDEX idx_invoices_created ON invoices (created_at DESC);

-- ─── Returns ────────────────────────────────────────────────────────────────
CREATE TABLE returns (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rma_number    TEXT NOT NULL UNIQUE,  -- RMA-YYMMDD-XXXX format
  order_id      TEXT NOT NULL REFERENCES orders(id),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        return_status NOT NULL DEFAULT 'solicitada',
  items         JSONB NOT NULL,  -- [{product_id, quantity, reason}]
  customer_note TEXT,
  admin_note    TEXT,
  refund_amount NUMERIC(10,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_returns_order ON returns (order_id);
CREATE INDEX idx_returns_user ON returns (user_id);
CREATE INDEX idx_returns_status ON returns (status);

-- ─── Loyalty Points ─────────────────────────────────────────────────────────
CREATE TABLE points (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance    INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE points_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,  -- positive = earned, negative = spent
  reason      TEXT NOT NULL,
  reference   TEXT,  -- order_id, referral_code, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_points_history_user ON points_history (user_id);
CREATE INDEX idx_points_history_created ON points_history (created_at DESC);

-- ─── Consent Registry (GDPR Art. 7) ────────────────────────────────────────
CREATE TABLE consents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        consent_type NOT NULL,
  status      consent_status NOT NULL,
  method      TEXT NOT NULL,         -- 'registration_form', 'cookie_banner', 'preferences_page'
  version     TEXT NOT NULL DEFAULT '2026-04',
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consents_user ON consents (user_id);
CREATE INDEX idx_consents_type ON consents (user_id, type);

-- ─── Communication Preferences ──────────────────────────────────────────────
CREATE TABLE comm_preferences (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_orders      BOOLEAN NOT NULL DEFAULT TRUE,
  email_shipping    BOOLEAN NOT NULL DEFAULT TRUE,
  email_marketing   BOOLEAN NOT NULL DEFAULT FALSE,
  email_newsletter  BOOLEAN NOT NULL DEFAULT FALSE,
  email_offers      BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notifications ──────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,  -- pedido, envio, cupon, puntos, oferta, devolucion, sistema
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read) WHERE NOT is_read;

-- ─── Messages (user ↔ admin) ────────────────────────────────────────────────
CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  subject      TEXT NOT NULL,
  body         TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  parent_id    UUID REFERENCES messages(id),  -- thread support
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_to ON messages (to_user_id);
CREATE INDEX idx_messages_from ON messages (from_user_id);

-- ─── Admin Settings ─────────────────────────────────────────────────────────
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('admin_email', 'admin@tcgacademy.es'),
  ('notification_email', 'admin@tcgacademy.es'),
  ('store_name', 'TCG Academy'),
  ('default_shipping', 'GLS'),
  ('free_shipping_threshold', '149'),
  ('vat_rate', '21')
ON CONFLICT (key) DO NOTHING;

-- ─── Audit Log ──────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type   TEXT NOT NULL,    -- 'user', 'order', 'invoice', 'return', 'settings'
  entity_id     TEXT NOT NULL,
  action        TEXT NOT NULL,    -- 'create', 'update', 'delete', 'gdpr_deletion', 'login'
  field         TEXT,
  old_value     TEXT,
  new_value     TEXT,
  performed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log (performed_by);
CREATE INDEX idx_audit_created ON audit_log (created_at DESC);

-- ─── Email Log ──────────────────────────────────────────────────────────────
CREATE TABLE email_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email    TEXT NOT NULL,
  to_name     TEXT,
  subject     TEXT NOT NULL,
  template_id TEXT,
  resend_id   TEXT,  -- Resend API email ID
  status      TEXT NOT NULL DEFAULT 'sent',  -- sent, failed, bounced
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_log_to ON email_log (to_email);

-- ─── Coupons ────────────────────────────────────────────────────────────────
CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value  NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order       NUMERIC(10,2) DEFAULT 0,
  max_uses        INTEGER,
  used_count      INTEGER NOT NULL DEFAULT 0,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons (UPPER(code));

-- ─── Coupon Usage ───────────────────────────────────────────────────────────
CREATE TABLE coupon_usage (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id  UUID NOT NULL REFERENCES coupons(id),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id   TEXT REFERENCES orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)  -- one use per user
);

-- ─── Functions ──────────────────────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON empresa_data FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON points FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON comm_preferences FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Generate referral code on user creation
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code = UPPER(SUBSTR(MD5(NEW.id::TEXT || NOW()::TEXT), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_referral_code BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- Initialize points row on user creation
CREATE OR REPLACE FUNCTION init_user_points()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO points (user_id, balance, total_earned) VALUES (NEW.id, 0, 0);
  INSERT INTO comm_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_init_points AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION init_user_points();

-- ─── Row Level Security (RLS) ───────────────────────────────────────────────
-- Enable RLS on all tables. Policies use JWT claims via auth.uid() / auth.jwt().

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE comm_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- NOTE: The app uses the service_role key server-side (API routes),
-- which bypasses RLS. These policies are for direct Supabase client access
-- (if used from the browser in future iterations).

-- Users: own profile only
CREATE POLICY users_own ON users FOR ALL USING (id = auth.uid());

-- Addresses: own addresses
CREATE POLICY addresses_own ON addresses FOR ALL USING (user_id = auth.uid());

-- Orders: own orders (admin sees all via service_role)
CREATE POLICY orders_own ON orders FOR SELECT USING (user_id = auth.uid());

-- Notifications: own notifications
CREATE POLICY notif_own ON notifications FOR ALL USING (user_id = auth.uid());

-- Points: own points
CREATE POLICY points_own ON points FOR SELECT USING (user_id = auth.uid());

-- Consents: own consents
CREATE POLICY consents_own ON consents FOR ALL USING (user_id = auth.uid());

-- Comm preferences: own preferences
CREATE POLICY prefs_own ON comm_preferences FOR ALL USING (user_id = auth.uid());
