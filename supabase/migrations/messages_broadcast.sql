-- Migración: añadir metadata de broadcast a la tabla messages.
--
-- Antes: la metadata `isBroadcast` / `broadcastId` se quedaba en localStorage
-- del emisor. Otros dispositivos del destinatario veían el mensaje sin el
-- icono de megáfono (no podían distinguirlo de un envío 1:1).
--
-- Ahora: ambos campos se persisten en BD y se replican en hidratación, así
-- el destinatario los ve en cualquier dispositivo.
--
-- Idempotente: usa IF NOT EXISTS por si la migración se aplica dos veces.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS broadcast_id TEXT;

-- Índice para listar/filtrar broadcasts emitidos (admin).
CREATE INDEX IF NOT EXISTS idx_messages_broadcast
  ON messages (broadcast_id)
  WHERE broadcast_id IS NOT NULL;
