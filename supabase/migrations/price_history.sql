-- ═══════════════════════════════════════════════════════════════════════════
-- Tabla price_history — histórico diario de precios Cardmarket (EUR)
-- ═══════════════════════════════════════════════════════════════════════════
-- Alimentada por POST /api/cron/price-snapshot (diario, 04:00 UTC).
-- Consultada por GET /api/price-history?cardId=<game>:<externalId> (público).

CREATE TABLE IF NOT EXISTS price_history (
  card_id         text        NOT NULL,   -- p.ej. "magic:abc-123" | "pokemon:sv3pt5-199"
  game            text        NOT NULL,   -- magic | pokemon | yugioh | one-piece | ...
  card_name       text        NOT NULL,   -- snapshot del nombre al primer snapshot
  date            date        NOT NULL,   -- 1 punto por día max
  eur             numeric(10,2) NOT NULL, -- precio Cardmarket trend en EUR
  source_currency text,                   -- EUR | USD | JPY ... (si hubo conversión)
  source          text,                   -- scryfall | ygoprodeck | pokemontcg | tcgplayer
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, date)
);

-- Índice para consultas por cardId (la query más frecuente).
CREATE INDEX IF NOT EXISTS price_history_card_idx
  ON price_history (card_id, date DESC);

-- Índice por juego (útil para analíticas admin).
CREATE INDEX IF NOT EXISTS price_history_game_idx
  ON price_history (game);

-- RLS: lectura pública, escritura solo service_role.
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_history public read" ON price_history;
CREATE POLICY "price_history public read"
  ON price_history FOR SELECT
  USING (true);

-- (Las escrituras van siempre vía service_role desde /api/cron/price-snapshot,
-- por lo que no necesitamos policy de INSERT/UPDATE para usuarios normales.)

-- Vista: último precio conocido por carta (para joins rápidos).
CREATE OR REPLACE VIEW price_history_latest AS
SELECT DISTINCT ON (card_id)
  card_id, game, card_name, date, eur, source_currency, source, updated_at
FROM price_history
ORDER BY card_id, date DESC;
