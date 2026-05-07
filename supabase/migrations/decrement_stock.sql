-- ============================================================================
-- decrement_stock(product_id, quantity)
-- ============================================================================
-- Decremento atómico de stock con validación. Evita race conditions cuando
-- dos pedidos concurrentes intentan reservar el último stock disponible.
--
-- Comportamiento:
--   - Si quantity > 0 y stock >= quantity → resta y devuelve el stock resultante.
--   - Si quantity > 0 y stock < quantity  → devuelve NULL (rechazo).
--   - Si quantity < 0                     → suma de vuelta (compensación de
--                                            rollback). Siempre acepta.
--   - Si el producto no existe            → devuelve NULL.
--
-- Atomicidad: el WHERE stock >= quantity es atómico a nivel fila en Postgres
-- gracias a row-level locking implícito en UPDATE. No hace falta SELECT FOR
-- UPDATE explícito porque la condición se evalúa contra la versión bloqueada.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_product_id BIGINT,
  p_quantity INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_stock INTEGER;
BEGIN
  -- Caso compensación (quantity negativo): suma sin condición.
  IF p_quantity < 0 THEN
    UPDATE public.products
       SET stock = stock + ABS(p_quantity)
     WHERE id = p_product_id
     RETURNING stock INTO v_new_stock;
    RETURN v_new_stock;
  END IF;

  -- Caso normal: decrementar solo si hay stock suficiente.
  UPDATE public.products
     SET stock = stock - p_quantity
   WHERE id = p_product_id
     AND stock >= p_quantity
   RETURNING stock INTO v_new_stock;

  -- Si no hubo UPDATE (stock insuficiente o producto inexistente) devolvemos NULL.
  RETURN v_new_stock;
END;
$$;

-- Service role la llama desde el adapter de Node. RLS no aplica a SECURITY
-- DEFINER + service_role, pero revocamos al rol public por defensa en
-- profundidad — solo authenticated/service_role deberían tocarla.
REVOKE EXECUTE ON FUNCTION public.decrement_stock(BIGINT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_stock(BIGINT, INTEGER) TO service_role;

COMMENT ON FUNCTION public.decrement_stock(BIGINT, INTEGER) IS
  'Atomic stock decrement with availability check. Returns NULL if insufficient stock. Negative quantity adds back (rollback compensation).';
