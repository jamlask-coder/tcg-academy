/**
 * Servicio de límites de compra por rol.
 *
 * SSOT para: "¿cuántas unidades puede llevarse este usuario de este producto?"
 *
 * Reglas de negocio:
 * 1. Cada producto puede definir tres límites opcionales: maxPerClient,
 *    maxPerWholesaler, maxPerStore. El que aplica depende del rol del usuario.
 * 2. El límite es ACUMULATIVO DE POR VIDA: se suman TODAS las compras del
 *    usuario para ese producto (todos sus pedidos históricos, excepto los
 *    cancelados o devueltos). Si el límite son 2 y ya pidió 2, no puede
 *    volver a pedir aunque haya stock.
 * 3. maxPerUser queda como fallback deprecado para productos que aún no
 *    tengan los nuevos campos rellenos.
 */
import type { LocalProduct } from "@/data/products";
import type { UserRole } from "@/types/user";
import { readAdminOrdersMerged } from "@/lib/orderAdapter";

/**
 * Devuelve el límite acumulado de por vida aplicable al rol dado.
 * undefined = sin límite.
 */
export function getRoleLimit(
  product: Pick<LocalProduct, "maxPerClient" | "maxPerWholesaler" | "maxPerStore" | "maxPerUser">,
  role: UserRole | null | undefined,
): number | undefined {
  // admin nunca está limitado
  if (role === "admin") return undefined;

  let roleSpecific: number | undefined;
  if (role === "mayorista") roleSpecific = product.maxPerWholesaler;
  else if (role === "tienda") roleSpecific = product.maxPerStore;
  else roleSpecific = product.maxPerClient; // cliente o null (invitado)

  if (typeof roleSpecific === "number") return roleSpecific;
  // Fallback: límite genérico heredado
  if (typeof product.maxPerUser === "number") return product.maxPerUser;
  return undefined;
}

/**
 * Cuenta las unidades que el usuario ya ha comprado de `productId` a lo largo
 * de toda su historia. Excluye pedidos cancelados y devoluciones — esas
 * unidades no consumen cupo.
 *
 * Se apoya en `readAdminOrdersMerged` (SSOT de pedidos) para incluir tanto los
 * pedidos registrados desde el admin como los recuperados del flujo checkout.
 */
export function getPurchasedQty(userId: string, productId: number): number {
  if (!userId) return 0;
  const orders = readAdminOrdersMerged();
  let total = 0;
  for (const o of orders) {
    if (o.userId !== userId) continue;
    if (o.adminStatus === "cancelado" || o.adminStatus === "devolucion") continue;
    for (const it of o.items) {
      if (it.id === productId) total += it.qty;
    }
  }
  return total;
}

/**
 * Devuelve cuántas unidades más puede añadir al carrito un usuario concreto,
 * teniendo en cuenta el límite de su rol, lo que ya compró históricamente y lo
 * que ya lleva en el carrito actual.
 *
 * - `undefined` significa "sin límite" (rol admin o producto sin límite).
 * - `0` significa "ya no puede llevarse más".
 */
export function getRemainingForUser(params: {
  userId: string | null | undefined;
  role: UserRole | null | undefined;
  product: Pick<LocalProduct, "maxPerClient" | "maxPerWholesaler" | "maxPerStore" | "maxPerUser">;
  cartQty: number;
}): number | undefined {
  const limit = getRoleLimit(params.product, params.role);
  if (limit === undefined) return undefined;
  const purchased = params.userId ? getPurchasedQty(params.userId, asProductId(params.product)) : 0;
  const remaining = limit - purchased - params.cartQty;
  return Math.max(0, remaining);
}

// Helper interno: el product puede venir sin id (tipo Pick) pero en la práctica
// siempre lo pasamos completo. Para evitar cambiar todas las firmas, recuperamos
// el id cuando esté disponible.
function asProductId(p: unknown): number {
  return typeof p === "object" && p !== null && "id" in p && typeof (p as { id: unknown }).id === "number"
    ? (p as { id: number }).id
    : -1;
}

/**
 * Etiqueta legible para UI: "Máx. 2 uds/cliente", "Sin límite", "Ya alcanzaste
 * el máximo", etc. Pensado para ProductDetail/ProductCard.
 */
export function describeLimitForRole(
  product: Pick<LocalProduct, "maxPerClient" | "maxPerWholesaler" | "maxPerStore" | "maxPerUser">,
  role: UserRole | null | undefined,
): string | null {
  const limit = getRoleLimit(product, role);
  if (limit === undefined) return null;
  const who = role === "mayorista" ? "mayorista" : role === "tienda" ? "tienda" : "cliente";
  return `Máx. ${limit} uds/${who}`;
}
