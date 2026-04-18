-- =============================================================================
-- TCG Academy — Esquema normalizado de base de datos (Supabase / PostgreSQL)
-- =============================================================================
--
-- SSOT: este archivo refleja 1:1 el registry de DataHub
-- (src/lib/dataHub/registry.ts). Cada entidad registrada con
-- maturity = "stable" | "partial" tiene su tabla aquí. Los "stub" están
-- documentados al final con DDL comentada para encajar cuando se implementen.
--
-- Reglas aplicadas (ver docs/DATABASE.md para el detalle):
--   1. Una entidad → una tabla. Nombres en snake_case plural.
--   2. PK = id UUID default. Excepciones: human-ids en orders / invoices / returns.
--   3. FKs: <tabla_singular>_id con ON DELETE explícito.
--   4. Timestamps: created_at y updated_at TIMESTAMPTZ NOT NULL.
--   5. Soft delete con deleted_at TIMESTAMPTZ NULL (nunca booleano).
--   6. Snapshot JSONB SOLO para datos inmutables históricos
--      (customer_snapshot, invoice.data).
--   7. Enums SQL para vocabularios cerrados. TEXT + CHECK para listas abiertas.
--   8. Triggers estándar: set_updated_at, auto_referral_code, init_user_side.
--   9. RLS activado en todas las tablas con PII. Service role bypasea.
--
-- Ejecución: Supabase SQL Editor o `supabase db reset`.
-- =============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";  -- case-insensitive text (emails, usernames)

-- =============================================================================
-- ENUMS (vocabularios cerrados)
-- =============================================================================
CREATE TYPE user_role        AS ENUM ('cliente', 'mayorista', 'tienda', 'admin');
CREATE TYPE tax_id_type      AS ENUM ('DNI', 'NIE', 'CIF');
CREATE TYPE order_status     AS ENUM ('pendiente', 'confirmado', 'procesando', 'enviado', 'entregado', 'cancelado', 'devuelto');
CREATE TYPE payment_status   AS ENUM ('pendiente', 'cobrado', 'fallido', 'reembolsado');
CREATE TYPE payment_method   AS ENUM ('tarjeta', 'paypal', 'bizum', 'transferencia', 'tienda');
CREATE TYPE invoice_status   AS ENUM ('emitida', 'enviada_aeat', 'verificada', 'rechazada', 'anulada');
CREATE TYPE return_status    AS ENUM ('solicitada', 'aprobada', 'en_transito', 'recibida', 'reembolsada', 'rechazada', 'cerrada');
CREATE TYPE consent_type     AS ENUM ('terms', 'privacy', 'marketing_email', 'cookies_analytics', 'cookies_marketing', 'data_processing');
CREATE TYPE consent_status   AS ENUM ('granted', 'revoked');
CREATE TYPE notif_scope      AS ENUM ('user', 'broadcast', 'fiscal');
CREATE TYPE incident_status  AS ENUM ('abierta', 'en_revision', 'resuelta', 'cerrada');
CREATE TYPE group_role       AS ENUM ('owner', 'member');
CREATE TYPE invite_status    AS ENUM ('pendiente', 'aceptada', 'rechazada', 'caducada');
CREATE TYPE complaint_status AS ENUM ('recibida', 'tramitando', 'resuelta', 'desestimada');
CREATE TYPE solicitud_type   AS ENUM ('b2b', 'franquicia', 'vending');
CREATE TYPE coupon_type      AS ENUM ('percentage', 'fixed');

-- =============================================================================
-- 1. IDENTIDAD (registry: users, consents, settings)
-- =============================================================================

-- ─── users ───────────────────────────────────────────────────────────────────
-- SSOT de la persona. Un email = un registro. El rol define capabilities; los
-- datos fiscales (nif) viven aquí porque no cambian por pedido, pero las
-- órdenes snapshot-ean este dato en su creación para inmutabilidad fiscal.
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          CITEXT NOT NULL UNIQUE,
  username       CITEXT UNIQUE,
  password_hash  TEXT NOT NULL,
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL DEFAULT '',
  phone          TEXT DEFAULT '',
  birth_date     DATE,
  role           user_role NOT NULL DEFAULT 'cliente',
  tax_id         TEXT,                          -- NIF / NIE / CIF normalizado UPPERCASE
  tax_id_type    tax_id_type,                   -- NULL mientras no rellene datos fiscales
  referral_code  TEXT UNIQUE,                   -- código único autogenerado
  referred_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at     TIMESTAMPTZ,                   -- soft-delete (RGPD)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT username_format CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_.]{3,20}$'),
  CONSTRAINT email_format    CHECK (email ~* '^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$'),
  CONSTRAINT tax_id_upper    CHECK (tax_id IS NULL OR tax_id = UPPER(tax_id))
);

CREATE INDEX idx_users_email        ON users (email);
CREATE INDEX idx_users_username     ON users (username) WHERE username IS NOT NULL;
CREATE INDEX idx_users_referral     ON users (referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX idx_users_role         ON users (role);
CREATE INDEX idx_users_not_deleted  ON users (id) WHERE deleted_at IS NULL;

-- ─── addresses ───────────────────────────────────────────────────────────────
-- Una dirección por fila. NO duplicar en order (el pedido guarda un snapshot
-- inmutable). Relación muchos-a-uno con users. Empresas usan estas direcciones
-- igual que particulares.
CREATE TABLE addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT 'Casa',
  recipient   TEXT NOT NULL,                 -- nombre del destinatario
  street      TEXT NOT NULL,                 -- calle + número (concatenados al guardar)
  floor       TEXT,
  postal_code TEXT NOT NULL,
  city        TEXT NOT NULL,
  province    TEXT NOT NULL DEFAULT '',
  country     TEXT NOT NULL DEFAULT 'ES',    -- ISO-3166 alpha-2
  phone       TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON addresses (user_id);
-- Solo una dirección default por usuario (partial unique index)
CREATE UNIQUE INDEX idx_addresses_one_default
  ON addresses (user_id) WHERE is_default = TRUE;

-- ─── company_profiles (ex-empresa_data) ──────────────────────────────────────
-- Datos fiscales de empresa vinculados 1:1 a un user (rol mayorista/tienda).
-- Antes se llamaba empresa_data — renombrado para coherencia anglo con el resto.
CREATE TABLE company_profiles (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  cif                TEXT NOT NULL,
  legal_name         TEXT NOT NULL,
  fiscal_address     TEXT NOT NULL,
  contact_person     TEXT NOT NULL DEFAULT '',
  company_phone      TEXT DEFAULT '',
  billing_email      CITEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── consents (RGPD Art. 7) ─────────────────────────────────────────────────
-- Log append-only: cada concesión / revocación es una fila con timestamp.
-- Para saber el estado actual de un tipo: último registro por (user_id, type).
CREATE TABLE consents (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       consent_type NOT NULL,
  status     consent_status NOT NULL,
  method     TEXT NOT NULL,                    -- registration_form / cookie_banner / preferences_page
  version    TEXT NOT NULL,                    -- versión del texto legal (AAAA-MM)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consents_user_type ON consents (user_id, type, created_at DESC);

-- ─── comm_preferences ───────────────────────────────────────────────────────
-- 1:1 con user. Preferencias de comunicación editables.
CREATE TABLE comm_preferences (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_orders      BOOLEAN NOT NULL DEFAULT TRUE,
  email_shipping    BOOLEAN NOT NULL DEFAULT TRUE,
  email_marketing   BOOLEAN NOT NULL DEFAULT FALSE,
  email_newsletter  BOOLEAN NOT NULL DEFAULT FALSE,
  email_offers      BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── auth: reset_tokens + sessions ──────────────────────────────────────────
CREATE TABLE reset_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reset_tokens_user    ON reset_tokens (user_id) WHERE used_at IS NULL;
CREATE INDEX idx_reset_tokens_expires ON reset_tokens (expires_at) WHERE used_at IS NULL;

CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti        TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address INET,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_user_active ON sessions (user_id) WHERE revoked_at IS NULL;

-- =============================================================================
-- 2. CATÁLOGO (registry: products, subcategories)
-- =============================================================================

-- ─── categories (taxonomía unificada) ───────────────────────────────────────
-- Árbol único que absorbe games + subcategories. Un "juego" (pokemon, magic…)
-- es una fila con parent_id = NULL. Una subcategoría (ej. sobres) tiene parent.
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID REFERENCES categories(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  emoji       TEXT,
  color       TEXT,                          -- Tailwind className
  bg_color    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_categories_parent ON categories (parent_id);
CREATE INDEX idx_categories_slug   ON categories (slug);

-- ─── products ───────────────────────────────────────────────────────────────
-- SSOT del catálogo. Absorbe el antiguo "static + overrides + deleted" del
-- localStorage. Soft-delete con deleted_at preserva histórico de pedidos.
CREATE TABLE products (
  id               INTEGER PRIMARY KEY,              -- id numérico estable (compat legacy)
  slug             TEXT NOT NULL UNIQUE,
  category_id      UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name             TEXT NOT NULL,
  short_description TEXT,
  description      TEXT,
  price            NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  sale_price       NUMERIC(10,2) CHECK (sale_price IS NULL OR sale_price >= 0),
  vat_rate         NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  stock            INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  max_per_user     INTEGER CHECK (max_per_user IS NULL OR max_per_user > 0),
  language         TEXT,                             -- futuro multi-idioma (EN/ES/JP/…)
  barcode          TEXT UNIQUE,
  images           JSONB NOT NULL DEFAULT '[]'::jsonb,   -- array de URLs (orden preservado)
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,   -- atributos de juego variables
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ                        -- soft-delete
);
CREATE INDEX idx_products_category    ON products (category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_slug        ON products (slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_stock       ON products (stock) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_not_deleted ON products (id) WHERE deleted_at IS NULL;

-- ─── favorites (registry: favorites) ────────────────────────────────────────
-- Muchos-a-muchos users ↔ products.
CREATE TABLE favorites (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- ─── carts (registry: cart) ─────────────────────────────────────────────────
-- Un carrito por usuario. Carrito de invitado vive solo en localStorage.
CREATE TABLE carts (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE cart_items (
  cart_user_id UUID NOT NULL REFERENCES carts(user_id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity     INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 99),
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cart_user_id, product_id)
);

-- =============================================================================
-- 3. COMERCIAL (registry: orders, incidents, coupons, points)
-- =============================================================================

-- ─── orders ─────────────────────────────────────────────────────────────────
-- ID humano TCG-YYMMDD-NNNNNN. El customer_snapshot es el único lugar donde
-- se guardan los datos del comprador en el momento de la compra (inmutable
-- para cumplimiento fiscal aunque el usuario cambie luego email/nif).
CREATE TABLE orders (
  id                 TEXT PRIMARY KEY,                        -- TCG-YYMMDD-NNNNNN
  user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  status             order_status NOT NULL DEFAULT 'pendiente',
  customer_snapshot  JSONB NOT NULL,                           -- {email, firstName, lastName, phone, taxId, taxIdType}
  shipping_snapshot  JSONB,                                    -- {street, floor, postalCode, city, province, country}
  shipping_method    TEXT NOT NULL DEFAULT 'estandar',
  shipping_cost      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  pickup_store_id    UUID,                                     -- FK futura a stores; NULL si envío a domicilio
  subtotal           NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  coupon_id          UUID,                                     -- FK añadida tras crear coupons (ver final del bloque comercial)
  coupon_discount    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (coupon_discount >= 0),
  points_spent       INTEGER NOT NULL DEFAULT 0 CHECK (points_spent >= 0),
  points_discount    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (points_discount >= 0),
  total              NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  payment_method     payment_method NOT NULL,
  payment_status     payment_status NOT NULL DEFAULT 'pendiente',
  payment_intent     TEXT,                                     -- Stripe payment intent ID
  tracking_number    TEXT,
  tracking_url       TEXT,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Factura solo tras cobro confirmado: invariante delegada a invoices.
  CONSTRAINT id_format CHECK (id ~ '^TCG-[0-9]{6}-[A-Z0-9]{6}$')
);
CREATE INDEX idx_orders_user         ON orders (user_id);
CREATE INDEX idx_orders_status       ON orders (status);
CREATE INDEX idx_orders_payment_st   ON orders (payment_status);
CREATE INDEX idx_orders_created      ON orders (created_at DESC);
CREATE INDEX idx_orders_email_snap   ON orders ((customer_snapshot->>'email'));

-- ─── order_items ────────────────────────────────────────────────────────────
-- Snapshot de producto en el momento de la compra (name y unit_price congelados).
CREATE TABLE order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  name         TEXT NOT NULL,                               -- nombre congelado
  quantity     INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 99),
  unit_price   NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  vat_rate     NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  image_url    TEXT,
  UNIQUE (order_id, product_id)
);
CREATE INDEX idx_order_items_order   ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);

-- ─── incidents (registry: incidents) ────────────────────────────────────────
-- Asociadas a un pedido. Pueden derivar en devolución (return).
CREATE TABLE incidents (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  status     incident_status NOT NULL DEFAULT 'abierta',
  category   TEXT NOT NULL,                          -- entrega_fallida / producto_dañado / faltante / incorrecto / otro
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_incidents_order  ON incidents (order_id);
CREATE INDEX idx_incidents_user   ON incidents (user_id);
CREATE INDEX idx_incidents_status ON incidents (status);

-- ─── coupons + coupon_usage (registry: coupons) ─────────────────────────────
CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,
  discount_type   coupon_type NOT NULL,
  discount_value  NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order       NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses        INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  max_per_user    INTEGER NOT NULL DEFAULT 1 CHECK (max_per_user > 0),
  used_count      INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_coupons_code_upper ON coupons (UPPER(code));
CREATE INDEX idx_coupons_active     ON coupons (is_active) WHERE is_active = TRUE;

CREATE TABLE coupon_usage (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id  UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id   TEXT REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage (coupon_id);
CREATE INDEX idx_coupon_usage_user   ON coupon_usage (coupon_id, user_id);

-- ─── points + points_history (registry: points) ────────────────────────────
-- points.balance es derivable (SUM de points_history) pero se mantiene como
-- cache para lecturas rápidas. Se reconcilia vía trigger.
CREATE TABLE points (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance      INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_spent  INTEGER NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE points_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,                  -- + ganados / − gastados
  reason     TEXT NOT NULL,                     -- compra / canje / bonus / referral / ajuste
  ref_order  TEXT REFERENCES orders(id) ON DELETE SET NULL,
  ref_other  TEXT,                              -- cualquier otra ref (referral code, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_points_history_user    ON points_history (user_id, created_at DESC);
CREATE INDEX idx_points_history_order   ON points_history (ref_order) WHERE ref_order IS NOT NULL;

-- FK diferida: orders.coupon_id → coupons(id) (coupons se creó después de orders)
ALTER TABLE orders
  ADD CONSTRAINT orders_coupon_fk
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;

-- =============================================================================
-- 4. FISCAL (registry: invoices, returns)
-- =============================================================================

-- ─── invoices ───────────────────────────────────────────────────────────────
-- Inmutables por cumplimiento VeriFactu. Rectificativas = nueva fila que
-- apunta a la original vía rectifies. No se borran.
CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,                      -- FA-YYYY/NNNN
  order_id       TEXT REFERENCES orders(id) ON DELETE RESTRICT,
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  status         invoice_status NOT NULL DEFAULT 'emitida',
  customer_snapshot JSONB NOT NULL,                         -- mismo shape que orders.customer_snapshot
  subtotal       NUMERIC(10,2) NOT NULL,
  vat_rate       NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  vat_amount     NUMERIC(10,2) NOT NULL,
  surcharge_rate NUMERIC(5,2) NOT NULL DEFAULT 0,           -- recargo de equivalencia
  surcharge_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total          NUMERIC(10,2) NOT NULL,
  hash           TEXT,                                       -- SHA-256 cadena VeriFactu
  prev_hash      TEXT,                                       -- hash cadena anterior
  verifactu_id   TEXT,                                       -- id de envío AEAT
  rectifies      UUID REFERENCES invoices(id) ON DELETE RESTRICT,
  pdf_url        TEXT,
  data           JSONB NOT NULL,                             -- snapshot completo de items + totales
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT invoice_number_format CHECK (invoice_number ~ '^(FA|R)-[0-9]{4}/[0-9]+$')
);
CREATE INDEX idx_invoices_order    ON invoices (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_invoices_user     ON invoices (user_id)  WHERE user_id  IS NOT NULL;
CREATE INDEX idx_invoices_number   ON invoices (invoice_number);
CREATE INDEX idx_invoices_created  ON invoices (created_at DESC);
CREATE INDEX idx_invoices_rectify  ON invoices (rectifies) WHERE rectifies IS NOT NULL;

-- ─── returns (registry: returns) ────────────────────────────────────────────
-- Una solicitud de devolución = una fila. Los items devueltos en return_items.
-- Cuando se reembolsa, se emite una factura rectificativa (invoices.rectifies).
CREATE TABLE returns (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rma_number        TEXT NOT NULL UNIQUE,                    -- RMA-YYMMDD-XXXX
  order_id          TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  status            return_status NOT NULL DEFAULT 'solicitada',
  customer_note     TEXT,
  admin_note        TEXT,
  refund_amount     NUMERIC(10,2) CHECK (refund_amount IS NULL OR refund_amount >= 0),
  tracking_number   TEXT,
  rectificative_id  UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT rma_number_format CHECK (rma_number ~ '^RMA-[0-9]{6}-[A-Z0-9]{4}$')
);
CREATE INDEX idx_returns_order  ON returns (order_id);
CREATE INDEX idx_returns_user   ON returns (user_id);
CREATE INDEX idx_returns_status ON returns (status);

CREATE TABLE return_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id    UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  reason       TEXT NOT NULL,                             -- defectuoso / incorrecto / no_deseado / danado_envio / falta_producto / otro
  reason_detail TEXT
);
CREATE INDEX idx_return_items_return ON return_items (return_id);

-- =============================================================================
-- 5. COMUNICACIÓN (registry: messages, notifications)
-- =============================================================================

-- ─── messages ───────────────────────────────────────────────────────────────
-- Mensaje 1:1 entre usuario y admin (o admin→usuario). parent_id habilita hilos.
-- Un mensaje puede estar asociado a un pedido concreto (order_id) para
-- facilitar filtrado en admin.
CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id     TEXT REFERENCES orders(id) ON DELETE SET NULL,
  subject      TEXT NOT NULL,
  body         TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  parent_id    UUID REFERENCES messages(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_to     ON messages (to_user_id)   WHERE to_user_id   IS NOT NULL;
CREATE INDEX idx_messages_from   ON messages (from_user_id) WHERE from_user_id IS NOT NULL;
CREATE INDEX idx_messages_order  ON messages (order_id)     WHERE order_id     IS NOT NULL;
CREATE INDEX idx_messages_unread ON messages (to_user_id) WHERE is_read = FALSE;

-- ─── notifications ──────────────────────────────────────────────────────────
-- Una tabla única con discriminador `scope`:
--   - 'user'      → user_id obligatorio (notificación personal).
--   - 'broadcast' → user_id NULL (anuncio global leído por todos los roles).
--   - 'fiscal'    → notificación crítica fiscal; puede ir a admin concreto.
-- Antes eran 3 storageKeys distintas; ahora son 3 filtros sobre la misma tabla.
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope      notif_scope NOT NULL DEFAULT 'user',
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,                    -- pedido / envio / cupon / puntos / oferta / devolucion / sistema
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_scope_requires_user
    CHECK ((scope = 'user' AND user_id IS NOT NULL) OR scope <> 'user')
);
CREATE INDEX idx_notifications_user   ON notifications (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE is_read = FALSE AND user_id IS NOT NULL;
CREATE INDEX idx_notifications_scope  ON notifications (scope, created_at DESC);

-- =============================================================================
-- 6. GRUPOS Y REFERIDOS (registry: associations)
-- =============================================================================

-- ─── groups + members + invites ─────────────────────────────────────────────
-- "associations" en el registry = sistema de grupos (ex-asociados). Antes
-- había 5 storageKeys (assoc, invites, cooldown, refcodes, usercodes); ahora
-- se modela normalizado con tres tablas.
CREATE TABLE groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_groups_owner ON groups (owner_id);

CREATE TABLE group_members (
  group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         group_role NOT NULL DEFAULT 'member',
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at      TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,                    -- si se sale, no puede re-entrar hasta esa fecha
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX idx_group_members_user ON group_members (user_id) WHERE left_at IS NULL;

CREATE TABLE group_invites (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  invited_email CITEXT NOT NULL,
  invite_code   TEXT NOT NULL UNIQUE,
  status        invite_status NOT NULL DEFAULT 'pendiente',
  expires_at    TIMESTAMPTZ NOT NULL,
  responded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_group_invites_code   ON group_invites (invite_code) WHERE status = 'pendiente';
CREATE INDEX idx_group_invites_email  ON group_invites (invited_email);

-- =============================================================================
-- 7. CONTENIDO USUARIO (registry: reviews, complaints, solicitudes)
-- =============================================================================

-- ─── reviews ────────────────────────────────────────────────────────────────
-- Nota: el proyecto mantiene por regla explícita que NO se muestran estrellas
-- en la UI. La tabla existe porque el registry la cataloga y el admin puede
-- querer feedback interno. Si nunca se activa, se puede dejar vacía.
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id    TEXT REFERENCES orders(id) ON DELETE SET NULL,
  rating      SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  title       TEXT,
  body        TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id, order_id)        -- una reseña por (user, producto, pedido)
);
CREATE INDEX idx_reviews_product ON reviews (product_id) WHERE is_approved = TRUE;

-- ─── complaints (hoja de reclamaciones) ─────────────────────────────────────
CREATE TABLE complaints (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id        TEXT REFERENCES orders(id) ON DELETE SET NULL,
  claimant_name   TEXT NOT NULL,
  claimant_email  CITEXT NOT NULL,
  claimant_tax_id TEXT,
  claimant_address TEXT,
  status          complaint_status NOT NULL DEFAULT 'recibida',
  facts           TEXT NOT NULL,
  claim           TEXT NOT NULL,
  resolution      TEXT,
  pdf_url         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_complaints_user   ON complaints (user_id)   WHERE user_id  IS NOT NULL;
CREATE INDEX idx_complaints_order  ON complaints (order_id)  WHERE order_id IS NOT NULL;
CREATE INDEX idx_complaints_status ON complaints (status);

-- ─── solicitudes (B2B / franquicia / vending) ───────────────────────────────
CREATE TABLE solicitudes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          solicitud_type NOT NULL,
  company_name  TEXT NOT NULL,
  cif           TEXT,
  contact_name  TEXT NOT NULL,
  contact_email CITEXT NOT NULL,
  contact_phone TEXT,
  volume        TEXT,
  games         TEXT[] NOT NULL DEFAULT '{}',
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'nueva',  -- nueva / en_contacto / aceptada / rechazada
  admin_note    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_solicitudes_type   ON solicitudes (type);
CREATE INDEX idx_solicitudes_status ON solicitudes (status);

-- =============================================================================
-- 8. CONFIGURACIÓN Y LOGS (registry: settings, logs)
-- =============================================================================

-- ─── settings ───────────────────────────────────────────────────────────────
-- Clave/valor genérico. value es TEXT (se parsea según key). Operacional.
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('admin_email',             'admin@tcgacademy.es'),
  ('notification_email',      'admin@tcgacademy.es'),
  ('store_name',              'TCG Academy'),
  ('default_shipping',        'GLS'),
  ('free_shipping_threshold', '149'),
  ('vat_rate',                '21'),
  ('dispatch_hours',          '24')
ON CONFLICT (key) DO NOTHING;

-- ─── audit_log (unifica audit + fiscal_audit + autopilot) ───────────────────
-- Una sola tabla para TODAS las trazas. entity_type discrimina:
--   'user' | 'order' | 'invoice' | 'return' | 'settings' | 'fiscal' | 'autopilot' | 'gdpr'
-- Antes había 3 storageKeys separadas; aquí es UNA tabla con filtros.
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  action       TEXT NOT NULL,          -- create / update / delete / login / gdpr_deletion / verifactu_send
  field        TEXT,
  old_value    TEXT,
  new_value    TEXT,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address   INET,
  metadata     JSONB,                  -- ctx extra (ej: datos del autopilot)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_entity   ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_user     ON audit_log (performed_by) WHERE performed_by IS NOT NULL;
CREATE INDEX idx_audit_created  ON audit_log (created_at DESC);
CREATE INDEX idx_audit_type     ON audit_log (entity_type, created_at DESC);

-- ─── app_logs (runtime logs de debug/error) ────────────────────────────────
-- Separado de audit_log porque tiene retención más corta y propósito distinto.
CREATE TABLE app_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level      TEXT NOT NULL CHECK (level IN ('debug','info','warn','error')),
  source     TEXT,                     -- nombre del módulo emisor
  message    TEXT NOT NULL,
  context    JSONB,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_app_logs_level   ON app_logs (level, created_at DESC);
CREATE INDEX idx_app_logs_created ON app_logs (created_at DESC);

-- ─── email_log ──────────────────────────────────────────────────────────────
CREATE TABLE email_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email     CITEXT NOT NULL,
  to_name      TEXT,
  subject      TEXT NOT NULL,
  template_id  TEXT,
  provider_id  TEXT,                   -- id del proveedor (Resend / SES / SMTP-MSG-ID)
  status       TEXT NOT NULL DEFAULT 'sent',
  error_detail TEXT,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_email_log_to      ON email_log (to_email);
CREATE INDEX idx_email_log_created ON email_log (created_at DESC);

-- =============================================================================
-- STUBS FUTUROS — documentados en docs/DATABASE.md
-- =============================================================================
-- Entidades registradas en DataHub con maturity="stub": affiliates, subscriptions,
-- warehouses, stock_movements, suppliers, purchase_orders, tickets, promotions,
-- banners, pages, languages, currencies, shipping_methods, payment_methods,
-- stores, sellers, integrations, tracking_events. Su DDL está en docs/DATABASE.md
-- (sección "STUBS") para añadir limpio cuando se implementen.

-- =============================================================================
-- FUNCIONES Y TRIGGERS
-- =============================================================================

-- updated_at auto
CREATE OR REPLACE FUNCTION trigger_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users             FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON addresses         FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON company_profiles  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON categories        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON products          FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON incidents         FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON coupons           FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON returns           FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON groups            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON complaints        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON solicitudes       FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON comm_preferences  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON points            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Generar referral_code al crear user
CREATE OR REPLACE FUNCTION trigger_generate_referral_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code = UPPER(SUBSTR(MD5(NEW.id::TEXT || NOW()::TEXT), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER auto_referral_code BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION trigger_generate_referral_code();

-- Inicializar puntos + preferencias de comunicación al crear user
CREATE OR REPLACE FUNCTION trigger_init_user_side() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO points (user_id)          VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO comm_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER auto_init_user_side AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION trigger_init_user_side();

-- Reconciliar points.balance al insertar en points_history
CREATE OR REPLACE FUNCTION trigger_apply_points_history() RETURNS TRIGGER AS $$
BEGIN
  UPDATE points SET
    balance      = balance + NEW.amount,
    total_earned = total_earned + GREATEST(NEW.amount, 0),
    total_spent  = total_spent + GREATEST(-NEW.amount, 0),
    updated_at   = NOW()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER apply_points_history AFTER INSERT ON points_history FOR EACH ROW EXECUTE FUNCTION trigger_apply_points_history();

-- Incrementar coupon.used_count al registrar un uso
CREATE OR REPLACE FUNCTION trigger_increment_coupon_used() RETURNS TRIGGER AS $$
BEGIN
  UPDATE coupons SET used_count = used_count + 1, updated_at = NOW() WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER increment_coupon_used AFTER INSERT ON coupon_usage FOR EACH ROW EXECUTE FUNCTION trigger_increment_coupon_used();

-- Bloquear UPDATE sobre invoices: inmutables por ley (salvo status/verifactu_id)
CREATE OR REPLACE FUNCTION trigger_invoice_immutable() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.hash           IS DISTINCT FROM NEW.hash           OR
     OLD.prev_hash      IS DISTINCT FROM NEW.prev_hash      OR
     OLD.subtotal       IS DISTINCT FROM NEW.subtotal       OR
     OLD.vat_amount     IS DISTINCT FROM NEW.vat_amount     OR
     OLD.total          IS DISTINCT FROM NEW.total          OR
     OLD.invoice_number IS DISTINCT FROM NEW.invoice_number OR
     OLD.data           IS DISTINCT FROM NEW.data THEN
    RAISE EXCEPTION 'Invoice core fields are immutable. Create a rectificative instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER enforce_invoice_immutability BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION trigger_invoice_immutable();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- El API server usa service_role (bypass). Estas policies son para acceso
-- directo desde el cliente Supabase (si se habilita en el futuro).

ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE points            ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE comm_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reset_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self            ON users            FOR ALL    USING (id      = auth.uid());
CREATE POLICY addresses_self        ON addresses        FOR ALL    USING (user_id = auth.uid());
CREATE POLICY company_self          ON company_profiles FOR ALL    USING (user_id = auth.uid());
CREATE POLICY orders_self           ON orders           FOR SELECT USING (user_id = auth.uid());
CREATE POLICY order_items_self      ON order_items      FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));
CREATE POLICY incidents_self        ON incidents        FOR ALL    USING (user_id = auth.uid());
CREATE POLICY invoices_self         ON invoices         FOR SELECT USING (user_id = auth.uid());
CREATE POLICY returns_self          ON returns          FOR ALL    USING (user_id = auth.uid());
CREATE POLICY points_self           ON points           FOR SELECT USING (user_id = auth.uid());
CREATE POLICY points_history_self   ON points_history   FOR SELECT USING (user_id = auth.uid());
CREATE POLICY consents_self         ON consents         FOR ALL    USING (user_id = auth.uid());
CREATE POLICY prefs_self            ON comm_preferences FOR ALL    USING (user_id = auth.uid());
CREATE POLICY notif_self            ON notifications    FOR ALL    USING (user_id = auth.uid() OR scope = 'broadcast');
CREATE POLICY messages_mine         ON messages         FOR ALL    USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY cart_self             ON carts            FOR ALL    USING (user_id = auth.uid());
CREATE POLICY cart_items_self       ON cart_items       FOR ALL    USING (cart_user_id = auth.uid());
CREATE POLICY favorites_self        ON favorites        FOR ALL    USING (user_id = auth.uid());
CREATE POLICY group_members_self    ON group_members    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY reviews_self          ON reviews          FOR ALL    USING (user_id = auth.uid() OR is_approved = TRUE);
