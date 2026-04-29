"use client";

import { ShoppingCart } from "lucide-react";

/**
 * Indicador "Añadido" — se muestra debajo de los botones +/− cuando el
 * usuario ya tiene el producto en su carrito. Aparece tanto en las cards
 * del catálogo como en la página de detalle de producto.
 *
 * Variants:
 *  - "card"   → tamaño compacto (LocalProductCard)
 *  - "detail" → tamaño normal (ProductDetailClient)
 */
export function InCartBadge({
  variant = "card",
}: {
  variant?: "card" | "detail";
}) {
  const sizes =
    variant === "detail" ? "gap-1.5 text-xs" : "gap-1 text-[10px]";
  const iconSize = variant === "detail" ? 13 : 11;
  return (
    <span
      className={`inline-flex items-center font-semibold text-green-600 ${sizes}`}
    >
      <ShoppingCart size={iconSize} strokeWidth={2.5} />
      Añadido
    </span>
  );
}
