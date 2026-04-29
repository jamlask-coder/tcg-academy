-- ─── order_items_legacy ────────────────────────────────────────────────────
-- Items de pedidos heredados de la SL anterior (WP/WooCommerce).
--
-- Por qué tabla aparte (Opción B vs Opción A):
--   `order_items.product_id` referencia `products(id)` con ON DELETE RESTRICT
--   y NOT NULL. Los IDs de producto WP no existen en `products` Supabase, así
--   que NO podemos reusar `order_items` sin debilitar la integridad
--   referencial del flujo nuevo. En su lugar, esta tabla sin FK alberga
--   exclusivamente los snapshots heredados (carry-over).
--
-- Reglas:
--   - Solo se insertan filas para pedidos con `notes` que empiezan por
--     "[Carry-over WP]" — el flujo nuevo NUNCA escribe aquí.
--   - El UI lo lee junto a `order_items` y los presenta como una sola lista.
--   - No tiene FK a products. `wp_product_id` es informativo (number puro).
--   - El adapter lo congela como snapshot: name + unit_price NO se
--     re-derivan de products (no existirían).

CREATE TABLE IF NOT EXISTS order_items_legacy (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  wp_product_id   INTEGER,                              -- ID original en WP (informativo)
  name            TEXT NOT NULL,                        -- nombre congelado del item WP
  quantity        INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 9999),
  unit_price      NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total      NUMERIC(10,2) NOT NULL CHECK (line_total >= 0),
  vat_rate        NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  source          TEXT NOT NULL DEFAULT 'wp'            -- 'wp' / futuro 'shopify' / etc.
);

CREATE INDEX IF NOT EXISTS idx_order_items_legacy_order
  ON order_items_legacy (order_id);

-- Las inserciones las hace `migrations/wp_order_items_import.sql`,
-- generado por `scripts/migrate-wp-order-items.mjs`.
