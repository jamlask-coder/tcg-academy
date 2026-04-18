# TCG Academy — Database Design

> Manual de diseño, convenciones y mantenimiento de la base de datos.
> **Antes de crear una tabla, columna o relación nueva, leer este documento.**

El archivo físico vive en `supabase/schema.sql`. Este documento explica el **por qué** de cada decisión y las reglas para ampliarlo sin romper la coherencia.

---

## 1. Filosofía

La base de datos es **SSOT** (single source of truth). Una entidad = una tabla. Un dato = una columna. Una relación = una foreign key explícita. Todo lo que no encaje en esas tres frases es deuda y debe refactorizarse.

Dos fuentes de verdad en el proyecto que **siempre deben concordar**:

1. **`src/lib/dataHub/registry.ts`** → registro de entidades a nivel aplicación (storageKeys, eventos, PII, retención).
2. **`supabase/schema.sql`** → registro de entidades a nivel persistencia (tablas, columnas, FKs, triggers).

Toda entidad con `maturity: "stable"` o `"partial"` en el registry tiene su tabla aquí. Los `"stub"` están documentados en la sección [STUBS](#stubs) para encajar cuando se implementen.

---

## 2. Principios de normalización

1. **Una entidad → una tabla.** Nombres en `snake_case` plural (`orders`, `order_items`, `group_members`). Sin excepciones.
2. **PK = `id UUID DEFAULT uuid_generate_v4()`.** Excepciones controladas: `orders.id` (`TCG-YYMMDD-NNNNNN`), `invoices.invoice_number` y `returns.rma_number` son human-ids con `CHECK` regex; `products.id` sigue siendo `INTEGER` por compatibilidad con el catálogo estático existente.
3. **Foreign keys = `<singular>_id`** con `ON DELETE` explícito (`CASCADE` / `SET NULL` / `RESTRICT`). Nunca un FK sin política de borrado.
4. **Timestamps**: toda tabla mutable tiene `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` y `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` gestionado por trigger `set_updated_at`.
5. **Soft-delete con `deleted_at TIMESTAMPTZ`**, nunca un booleano `is_deleted`. Filtrar vía `WHERE deleted_at IS NULL` + índice parcial.
6. **JSONB solo para snapshots inmutables** (`orders.customer_snapshot`, `invoices.data`). Nunca para datos vivos que pudieran consultarse/actualizarse.
7. **ENUMs para vocabularios cerrados** (`order_status`, `payment_method`, `consent_type`, …). `TEXT + CHECK` si la lista puede crecer con frecuencia.
8. **RLS activado** en todas las tablas con PII. Las policies usan `auth.uid()`. El API server usa `service_role` que bypasea RLS.
9. **Sin duplicación de datos.** Si dos columnas guardan lo mismo (ej: `email` en `users` y `orders`), la que esté en el registro subordinado es un **snapshot** justificado legalmente — si no, se borra.

---

## 3. Convenciones de nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Tabla | `snake_case` plural | `order_items`, `group_members` |
| Columna | `snake_case` | `created_at`, `customer_snapshot` |
| PK | `id` | — |
| FK | `<tabla_singular>_id` | `user_id`, `order_id`, `product_id` |
| Índice | `idx_<tabla>_<cols>` | `idx_orders_user`, `idx_products_slug` |
| Unique parcial | `idx_<tabla>_<semantica>` | `idx_addresses_one_default` |
| ENUM | `<dominio>_<concepto>` | `user_role`, `payment_status`, `invite_status` |
| Trigger | `<verb>_<scope>` | `set_updated_at`, `auto_referral_code` |
| Función trigger | `trigger_<snake_case>` | `trigger_set_updated_at` |
| Policy RLS | `<tabla>_<semantica>` | `orders_self`, `notif_self` |

---

## 4. Mapping registry → tablas

Cada entidad del registry se traduce a una o varias tablas. Relación completa:

| Registry key | Tablas | Notas |
|---|---|---|
| `users` | `users`, `addresses`, `company_profiles`, `reset_tokens`, `sessions` | `email` único global (CITEXT); `tax_id` vive en `users`, no duplicado en direcciones |
| `products` | `categories`, `products` | `categories` absorbe games + subcategorías como árbol (`parent_id` self-FK) |
| `cart` | `carts`, `cart_items` | Un carrito por usuario; invitados solo en localStorage |
| `favorites` | `favorites` | M:N `users ↔ products`, PK compuesta |
| `orders` | `orders`, `order_items` | `customer_snapshot` JSONB guarda datos inmutables del comprador |
| `incidents` | `incidents` | Asociadas a `orders` — pueden derivar en `returns` |
| `coupons` | `coupons`, `coupon_usage` | `used_count` cache reconciliada por trigger desde `coupon_usage` |
| `points` | `points`, `points_history` | `points.balance` cache reconciliada por trigger desde `points_history` |
| `invoices` | `invoices` | Inmutables (trigger `enforce_invoice_immutability`); cadena VeriFactu en `hash`/`prev_hash` |
| `returns` | `returns`, `return_items` | Reembolsos emiten factura rectificativa → `returns.rectificative_id → invoices.id` |
| `messages` | `messages` | Hilos vía `parent_id` self-FK; `order_id` opcional para contexto |
| `notifications` | `notifications` | Una tabla, discriminador `scope ∈ {user, broadcast, fiscal}` |
| `associations` | `groups`, `group_members`, `group_invites` | Antes eran 5 storageKeys sueltas; aquí normalizadas |
| `reviews` | `reviews` | Inactivas en UI por regla de proyecto (no mostrar estrellas) |
| `complaints` | `complaints` | Hoja de reclamaciones formal |
| `solicitudes` | `solicitudes` | B2B / franquicia / vending; `type` enum |
| `consents` | `consents`, `comm_preferences` | `consents` append-only (último estado por `type`) + preferencias 1:1 |
| `settings` | `settings` | Clave/valor; `updated_by` FK a `users` |
| `logs` | `audit_log`, `app_logs`, `email_log` | `audit_log` unifica audit + fiscal + autopilot vía `entity_type` |
| `subcategories` | (dentro de `categories` con `parent_id`) | No hay tabla separada — el árbol lo resuelve |

---

## 5. Contratos cross-entidad (FKs clave)

Relaciones que no deben romperse al añadir funcionalidad:

- `orders.user_id → users(id) ON DELETE SET NULL` — un pedido sobrevive al borrado RGPD del usuario. Los datos del comprador quedan en `customer_snapshot`.
- `orders.coupon_id → coupons(id) ON DELETE SET NULL` — si un cupón se elimina, el pedido histórico conserva el `coupon_discount`.
- `order_items.product_id → products(id) ON DELETE RESTRICT` — no se puede borrar un producto con pedidos. Usar soft-delete (`products.deleted_at`).
- `invoices.order_id → orders(id) ON DELETE RESTRICT` — no se puede borrar un pedido con factura. Cumplimiento fiscal.
- `invoices.rectifies → invoices(id) ON DELETE RESTRICT` — cadena de rectificativas inmutable.
- `returns.rectificative_id → invoices(id) ON DELETE SET NULL` — reembolso referencia factura rectificativa.
- `points_history.ref_order → orders(id) ON DELETE SET NULL` — histórico sobrevive al pedido.
- `coupon_usage.coupon_id / user_id → CASCADE` — si se borra cupón o usuario, se limpia su uso.

---

## 6. Triggers y funciones

Todos en `supabase/schema.sql` al final del archivo.

| Trigger | Tabla | Momento | Qué hace |
|---|---|---|---|
| `set_updated_at` | múltiples | `BEFORE UPDATE` | `updated_at = NOW()` |
| `auto_referral_code` | `users` | `BEFORE INSERT` | Genera `referral_code` único si viene `NULL` |
| `auto_init_user_side` | `users` | `AFTER INSERT` | Crea filas en `points` y `comm_preferences` |
| `apply_points_history` | `points_history` | `AFTER INSERT` | Reconcilia `points.balance`, `total_earned`, `total_spent` |
| `increment_coupon_used` | `coupon_usage` | `AFTER INSERT` | Incrementa `coupons.used_count` |
| `enforce_invoice_immutability` | `invoices` | `BEFORE UPDATE` | Rechaza cambios a campos fiscales (`hash`, `total`, `data`…) |

**Regla**: si un dato se puede derivar de otro (`points.balance` ← `points_history`), el derivado es **cache** y se reconcilia por trigger, nunca por código cliente.

---

## 7. Row Level Security

Todas las tablas con PII tienen RLS activada. Patrón estándar:

```sql
CREATE POLICY <tabla>_self ON <tabla> FOR ALL USING (user_id = auth.uid());
```

Excepciones documentadas:

- `orders` / `invoices` → `FOR SELECT` (el cliente no inserta/actualiza — solo vía API).
- `notifications` → usuario ve las suyas **o** los broadcasts (`user_id = auth.uid() OR scope = 'broadcast'`).
- `reviews` → `user_id = auth.uid() OR is_approved = TRUE` (aprobadas son públicas).
- `messages` → `from_user_id = auth.uid() OR to_user_id = auth.uid()`.

El backend Next.js usa `SUPABASE_SERVICE_ROLE_KEY` para bypasear RLS en operaciones administrativas.

---

## 8. Cómo añadir una entidad nueva

**Paso 1 — Registry (`src/lib/dataHub/registry.ts`)**

1. Buscar con `listEntities()` si ya existe la entidad o una afín reutilizable. Si la respuesta es sí → no crear nada, reutilizar.
2. Si no existe, añadir entrada al array correspondiente (`STABLE` si se implementa ya, `PARTIAL` si falta consolidar, `STUB` si es solo planificación):
   ```ts
   {
     key: "tickets",
     description: "Tickets de soporte",
     storageKeys: ["tcgacademy_tickets"],
     event: DataHubEvents.TICKETS_UPDATED,
     pii: true,
     retentionMonths: 24,
     adapter: "@/services/ticketService",
     maturity: "stable",
     category: "mensajes",        // obligatorio para entrar en backups
     criticalJson: true,          // si su corrupción bloquea flujo
     dependsOn: ["users", "orders"],
   }
   ```

**Paso 2 — Evento (`src/lib/dataHub/events.ts`)**

Si el evento no existe, añadirlo en `DataHubEvents` con nombre `tcga:<entidad>:updated`.

**Paso 3 — Schema (`supabase/schema.sql`)**

1. Localizar la sección temática correcta (identidad / catálogo / comercial / fiscal / comunicación / grupos / contenido / config-logs).
2. Añadir `CREATE TABLE` respetando los 9 principios de [§2](#2-principios-de-normalización).
3. Añadir índices mínimos (PK ya cuenta, añadir por cada FK y por columnas usadas en filtros frecuentes).
4. Si tiene `updated_at` → registrar `CREATE TRIGGER set_updated_at …`.
5. Si contiene PII → `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY` + policy `<t>_self`.

**Paso 4 — Adapter (`src/lib/db.ts`)**

Extender `DbAdapter` interface con operaciones CRUD. Implementar en `LocalDbAdapter` (localStorage) y `ServerDbAdapter` (Supabase). Mapear filas con función `map<Entity>Row`.

**Paso 5 — Servicio canónico (`src/services/<x>Service.ts`)**

Único punto de escritura. Tras cada write:
```ts
import { DataHub } from "@/lib/dataHub";
// … write logic …
DataHub.emit("<entity>");
```

**Paso 6 — Validación**

```bash
npm run typecheck && npm run build
node tests/audit/run-audit.mjs
```

---

## 9. Cómo modificar una entidad existente

1. **Columna nueva**: `ALTER TABLE <t> ADD COLUMN <c> …;` en migración, reflejar en `DbAdapter` y mapper. Si hace falta backfill, hacerlo en la misma migración con `UPDATE`.
2. **Columna a renombrar**: evitar si se puede. Si es imprescindible: `ALTER TABLE <t> RENAME COLUMN <old> TO <new>;` + actualizar todos los consumidores (`grep` del nombre). Si la columna era snapshot JSONB, **no se renombra**, se añade la clave nueva al snapshot y se migran las filas con una sola transacción.
3. **Columna a borrar**: soft-deprecate primero (no escribir ya). Tras ≥1 release sin lectura, `ALTER TABLE <t> DROP COLUMN <c>`.
4. **Relación a cambiar**: nunca cambiar un `ON DELETE` existente sin auditar los datos actuales. Añadir FK nueva con `NOT VALID` y validar luego con `ALTER TABLE … VALIDATE CONSTRAINT`.

---

## 10. Snapshots inmutables

Dos patrones de snapshot JSONB en el schema:

- **`orders.customer_snapshot`** — forma `CustomerSnapshot` (`src/types/customer.ts`): `{userId, role, firstName, lastName, email, phone, taxId, taxIdType, shippingAddress}`. Se congela en el momento del checkout.
- **`invoices.data`** — payload completo de la factura (items, totales, recargo, serie VeriFactu). Se congela en `createInvoice()`.

**Regla**: un snapshot NUNCA se actualiza después de insertado. Si el usuario cambia su email más tarde, `orders.customer_snapshot.email` sigue siendo el de la compra.

Consecuencia: los FKs `orders.user_id → users(id) ON DELETE SET NULL` y `invoices.user_id → users(id) ON DELETE SET NULL` permiten que el usuario desaparezca por RGPD sin perder el histórico fiscal.

---

## 11. STUBS

Entidades registradas en `dataHub/registry.ts` con `maturity: "stub"`. Aún no se implementan, pero su diseño está previsto. Cuando se construyan, añadir la tabla siguiente a `schema.sql` en la sección temática correcta y cambiar la entrada del registry a `"partial"` o `"stable"`.

```sql
-- ─── affiliates ─────────────────────────────────────────────────────────────
CREATE TABLE affiliates (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code  TEXT NOT NULL UNIQUE,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_earned   NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- NOTA: reutilizar users.referred_by + users.referral_code cuando sea posible.

-- ─── subscriptions ──────────────────────────────────────────────────────────
CREATE TYPE subscription_status AS ENUM ('activa', 'pausada', 'cancelada');
CREATE TABLE subscriptions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id       INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  frequency_days   INTEGER NOT NULL CHECK (frequency_days > 0),
  status           subscription_status NOT NULL DEFAULT 'activa',
  next_order_at    TIMESTAMPTZ NOT NULL,
  last_order_id    TEXT REFERENCES orders(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── warehouses ─────────────────────────────────────────────────────────────
CREATE TABLE warehouses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  address    TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── stock_movements ────────────────────────────────────────────────────────
CREATE TYPE stock_move_type AS ENUM ('entrada', 'salida', 'traspaso', 'merma', 'ajuste');
CREATE TABLE stock_movements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id     UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  type             stock_move_type NOT NULL,
  quantity         INTEGER NOT NULL,
  ref_order        TEXT REFERENCES orders(id) ON DELETE SET NULL,
  ref_purchase     UUID,   -- FK a purchase_orders cuando exista
  note             TEXT,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- NOTA: cuando esta tabla exista, products.stock pasa a cache reconciliada
-- por trigger (suma de movements por producto).

-- ─── suppliers ──────────────────────────────────────────────────────────────
CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_name    TEXT NOT NULL,
  cif           TEXT NOT NULL UNIQUE,
  contact_email CITEXT,
  contact_phone TEXT,
  address       TEXT,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── purchase_orders + purchase_order_items ─────────────────────────────────
CREATE TYPE purchase_status AS ENUM ('borrador', 'enviada', 'recibida_parcial', 'recibida', 'cancelada');
CREATE TABLE purchase_orders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number       TEXT NOT NULL UNIQUE,
  supplier_id  UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  status       purchase_status NOT NULL DEFAULT 'borrador',
  expected_at  TIMESTAMPTZ,
  received_at  TIMESTAMPTZ,
  total        NUMERIC(10,2) NOT NULL DEFAULT 0,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE purchase_order_items (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id  UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id         INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity           INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost          NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
  UNIQUE (purchase_order_id, product_id)
);

-- ─── tickets ────────────────────────────────────────────────────────────────
CREATE TYPE ticket_status AS ENUM ('abierto', 'en_curso', 'esperando_cliente', 'resuelto', 'cerrado');
CREATE TABLE tickets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id      TEXT REFERENCES orders(id) ON DELETE SET NULL,
  subject       TEXT NOT NULL,
  status        ticket_status NOT NULL DEFAULT 'abierto',
  assigned_to   UUID REFERENCES users(id) ON DELETE SET NULL,
  priority      TEXT NOT NULL DEFAULT 'normal',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- NOTA: incidents es el caso particular "incidencia de pedido"; tickets es la
-- generalización. Considerar si absorber incidents como ticket.type='incidencia'.

-- ─── promotions ─────────────────────────────────────────────────────────────
CREATE TABLE promotions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  rule          JSONB NOT NULL,                -- condiciones + descuentos
  valid_from    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until   TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- NOTA: coupon = instancia canjeable; promotion = regla que puede aplicarse
-- automáticamente o generar cupones.

-- ─── banners / pages / languages / currencies ───────────────────────────────
-- Diseño mínimo recomendado (ampliar según necesidad real):
CREATE TABLE banners (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot       TEXT NOT NULL,               -- 'home_hero', 'category_top', …
  image_url  TEXT NOT NULL,
  link_url   TEXT,
  title      TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  meta_title TEXT,
  meta_desc  TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE languages (
  code       TEXT PRIMARY KEY,            -- 'es', 'en', 'ja', …
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE currencies (
  code           TEXT PRIMARY KEY,        -- ISO-4217: 'EUR', 'USD', 'JPY'
  name           TEXT NOT NULL,
  exchange_rate  NUMERIC(14,6) NOT NULL DEFAULT 1.0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── shipping_methods / payment_methods ─────────────────────────────────────
CREATE TABLE shipping_methods (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  carrier       TEXT NOT NULL,
  cost          NUMERIC(10,2) NOT NULL DEFAULT 0,
  eta_hours     INTEGER,
  free_threshold NUMERIC(10,2),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE payment_methods_config (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  method        payment_method NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- ─── stores / sellers ───────────────────────────────────────────────────────
CREATE TABLE stores (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  address      TEXT NOT NULL,
  is_physical  BOOLEAN NOT NULL DEFAULT TRUE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Cuando exista stores, orders.pickup_store_id pasa a tener FK real.

CREATE TABLE sellers (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  store_id     UUID REFERENCES stores(id) ON DELETE SET NULL,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);
-- NOTA: un seller ES un user con rol extendido; no duplicar datos personales.

-- ─── integrations ───────────────────────────────────────────────────────────
CREATE TABLE integrations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key           TEXT NOT NULL UNIQUE,       -- 'stripe', 'resend', 'verifactu_seres'
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,
  last_status   TEXT,
  last_tested_at TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── tracking_events ────────────────────────────────────────────────────────
CREATE TABLE tracking_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id  TEXT,
  event_name  TEXT NOT NULL,
  payload     JSONB,
  page_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tracking_user    ON tracking_events (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_tracking_created ON tracking_events (created_at DESC);
-- NOTA: respetar consents.cookies_analytics antes de escribir.
```

---

## 12. Antipatrones a evitar

- **Denormalizar "por rendimiento" antes de medir.** Un `JOIN` bien indexado gana a un JSONB difícil de mantener.
- **Arrays de IDs** (`user_ids INT[]`) cuando la relación merece tabla M:N. Solo acceptable para conjuntos pequeños e inmutables.
- **Booleanos `is_deleted`** en vez de `deleted_at TIMESTAMPTZ`. Perder la hora de borrado es irrecuperable.
- **Status libres** (`status TEXT`) cuando el dominio es cerrado. Usar ENUM; si crece, migrar con `ALTER TYPE … ADD VALUE`.
- **Timestamps `INTEGER` epoch**. Siempre `TIMESTAMPTZ`.
- **Emails en `TEXT`**. Usar `CITEXT` para comparaciones case-insensitive sin `LOWER()` en cada query.
- **Tablas "genéricas"** tipo `metadata (entity_type, entity_id, key, value)`. Si un campo existe en la lógica de negocio, que sea columna tipada.
- **Cachés en código sin trigger de reconciliación.** Si `points.balance` se recalcula desde `points_history` → trigger. Sin excepciones.
- **Duplicar datos del usuario en `orders.customer_*` columns**. El snapshot es **un** JSONB, no seis columnas sueltas.
- **FK sin `ON DELETE`**. Es una decisión que debe tomarse explícitamente al crear la relación.

---

## 13. Checklist al añadir un cambio a schema.sql

- [ ] Entrada correspondiente existe / se añade en `dataHub/registry.ts`.
- [ ] Nombres en `snake_case` plural (tablas) / singular (columnas FK).
- [ ] PK definida (`id UUID` o human-id con CHECK regex).
- [ ] FKs con `ON DELETE` explícito.
- [ ] `created_at` + `updated_at` si es mutable.
- [ ] Trigger `set_updated_at` registrado.
- [ ] Índices por cada FK y por columnas filtradas.
- [ ] RLS activada + policy si contiene PII.
- [ ] `npm run typecheck` y `npm run build` sin errores tras actualizar `src/lib/db.ts`.
- [ ] `grep` de la clave nueva en todo el repo para detectar consumidores afectados.
