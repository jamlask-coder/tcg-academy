/**
 * ORDER ADAPTER — fuente única para transformar pedidos entre formatos.
 *
 * Resuelve la desconexión histórica entre:
 *  - `tcgacademy_orders`      → formato del cliente (Order), creado por el checkout
 *  - `tcgacademy_admin_orders`→ formato admin (AdminOrder), consumido por /admin/pedidos
 *
 * Todos los pedidos (clientes + mayoristas + tiendas) deben acabar en AMBAS claves,
 * porque la tienda (nosotros) tiene que verlos SIEMPRE en el admin inbox.
 *
 * Regla de oro: la información del comprador vive en `shippingAddress` + `userId`.
 * Cualquier otro campo (userName, userEmail, address string) se DERIVA de aquí —
 * nunca se pide dos veces al usuario ni se guarda con nombre distinto.
 */

import { PRODUCTS } from "@/data/products";
import { safeRead, robustWrite } from "@/lib/safeStorage";
import type {
  AdminOrder,
  AdminOrderStatus,
  AdminPaymentStatus,
  OrderItem as AdminItem,
  OrderStatus as CustomerOrderStatus,
} from "@/data/mockData";

/**
 * Shape real escrita por `src/app/finalizar-compra/page.tsx`.
 * Lo mantenemos flexible (campos opcionales/desconocidos) porque el checkout
 * puede evolucionar; sólo leemos lo imprescindible.
 */
export interface CheckoutOrder {
  id: string;
  date: string;
  status: string;
  items: Array<{
    id: string | number;
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
  coupon?: { code: string } | null;
  couponDiscount?: number;
  pointsDiscount?: number;
  shippingAddress: {
    nombre: string;
    apellidos: string;
    email: string;
    telefono?: string;
    direccion: string;
    ciudad: string;
    cp: string;
    provincia?: string;
    pais?: string;
  };
  envio: "estandar" | "tienda" | string;
  tiendaRecogida?: string | null;
  pago: string;
  userRole?: string | null;
  userId?: string | null;
  /** NIF/NIE/CIF del comprador — obligatorio para factura (Art. 6.1.d RD 1619/2012). */
  nif?: string;
  nifType?: "DNI" | "NIE" | "CIF";
  /** Estado de cobro explícito (si lo conoce el origen). Normalmente se deriva. */
  paymentStatus?: AdminPaymentStatus;
}

/**
 * Métodos de pago diferido: el cobro no se confirma en el momento del pedido.
 * Requieren marcarse manualmente como "cobrado" para emitir factura.
 */
export function isDeferredPayment(method: string): boolean {
  const m = (method ?? "").toLowerCase();
  return (
    m.includes("transferencia") ||
    m.includes("tienda") ||
    m.includes("recogida") ||
    m.includes("contrarrembolso") ||
    m.includes("contra reembolso")
  );
}

/**
 * Deriva el estado de cobro canónico de un pedido en función de su método de
 * pago y estado admin. Usar SIEMPRE esto al crear/sembrar pedidos.
 */
export function derivePaymentStatus(
  method: string,
  adminStatus: AdminOrderStatus,
): AdminPaymentStatus {
  if (adminStatus === "cancelado") return "cancelado";
  if (adminStatus === "devolucion") return "reembolsado";
  return isDeferredPayment(method) ? "pendiente" : "cobrado";
}

/**
 * Mapea estado del cliente → estado admin (defecto: pendiente_envio).
 *
 * Regla 2026-04-18: el estado "entregado"/"finalizado" se eliminó del admin
 * porque depende de la confirmación del transportista (no de nosotros) y
 * generaba ruido operativo. Cualquier valor heredado entregado/finalizado
 * se normaliza a "enviado", que es ahora el estado final del pipeline.
 */
export function toAdminStatus(status: string): AdminOrderStatus {
  switch (status) {
    case "entregado":
    case "finalizado":
      return "enviado";
    case "enviado":
      return "enviado";
    case "cancelado":
      return "cancelado";
    case "devuelto":
    case "devolucion":
      return "devolucion";
    case "incidencia":
      return "incidencia";
    case "procesando":
    case "pendiente":
    case "pedido":
    case "pagado":
    case "pendiente_envio":
    case "preparado":
    default:
      return "pendiente_envio";
  }
}

/**
 * Deriva el estado visible para el cliente desde admin + cobro.
 *
 * Estados cliente (2026-04-20): pedido → pagado → pendiente_envio → enviado
 * más excepciones (incidencia, cancelado, devolucion).
 *
 * REGLA DE NEGOCIO (TCG Academy): "sin pago no hay pedido". En la web,
 * un pedido sólo se crea si el pago se confirma. Por tanto, para el
 * cliente "pedido" y "pagado" van unidos — el timeline arranca siempre
 * con ambos hitos completados. "pedido" puro como estado cliente no
 * existe; cualquier pedido visible es, mínimo, "pagado".
 *
 * Mapeo:
 *  - admin "enviado"         → "enviado"
 *  - admin "cancelado"       → "cancelado"
 *  - admin "devolucion"      → "devolucion"
 *  - admin "incidencia"      → "incidencia"
 *  - admin "pendiente_envio" → "pagado" (defecto) o "pendiente_envio" si
 *    el admin lo marcó explícitamente como en preparación con tracking.
 */
export function toCustomerStatus(
  adminStatus: AdminOrderStatus,
  paymentStatus: AdminPaymentStatus | undefined,
  paymentMethod: string,
): CustomerOrderStatus {
  if (adminStatus === "enviado") return "enviado";
  if (adminStatus === "cancelado") return "cancelado";
  if (adminStatus === "devolucion") return "devolucion";
  if (adminStatus === "incidencia") return "incidencia";
  // adminStatus === "pendiente_envio": en nuestro flujo, si existe el pedido
  // ya está pagado. Mostramos "pagado" como estado inicial estable.
  void paymentStatus;
  void paymentMethod;
  return "pagado";
}

/**
 * Normaliza un status heredado/externo a uno del set cliente.
 * Útil cuando leemos `tcgacademy_orders` donde el checkout escribe strings
 * libres ("pendiente", "procesando", "entregado", etc.).
 *
 * Importante: "pedido"/"pendiente" legacy → "pagado" (regla de negocio
 * "sin pago no hay pedido"). Ningún pedido visible al cliente se queda
 * colgado en "pedido" puro.
 */
export function normalizeCustomerStatus(s: string): CustomerOrderStatus {
  const v = (s ?? "").toLowerCase();
  switch (v) {
    case "entregado":
    case "finalizado":
    case "enviado":
      return "enviado";
    case "pendiente_envio":
    case "preparado":
    case "procesando":
      return "pendiente_envio";
    case "cancelado":
      return "cancelado";
    case "devuelto":
    case "devolucion":
      return "devolucion";
    case "incidencia":
      return "incidencia";
    case "pagado":
    case "pedido":
    case "pendiente":
    default:
      return "pagado";
  }
}

/** Formatea la dirección de envío como string único (para tabla admin). */
export function formatAddressLine(addr: CheckoutOrder["shippingAddress"]): string {
  const parts = [
    addr.direccion,
    [addr.cp, addr.ciudad].filter(Boolean).join(" "),
    addr.provincia,
  ].filter((p): p is string => Boolean(p && p.trim()));
  return parts.join(", ");
}

/** Rol que acepta AdminOrder (sin "guest" ni "admin"). */
function coerceAdminRole(
  role: string | null | undefined,
): "cliente" | "mayorista" | "tienda" {
  if (role === "mayorista" || role === "tienda") return role;
  return "cliente";
}

/**
 * Transforma un pedido del checkout en el formato que consume /admin/pedidos.
 * Resultado determinista: mismos inputs ⇒ mismo AdminOrder.
 */
export function checkoutOrderToAdmin(o: CheckoutOrder): AdminOrder {
  const items: AdminItem[] = o.items.map((it) => {
    const idNum = Number(it.id);
    const prod = PRODUCTS.find((p) => p.id === idNum);
    return {
      id: Number.isFinite(idNum) ? idNum : 0,
      name: it.name,
      qty: it.quantity,
      price: it.price,
      game: prod?.game ?? "otros",
    };
  });

  const userName = `${o.shippingAddress.nombre} ${o.shippingAddress.apellidos}`.trim();
  const address = formatAddressLine(o.shippingAddress);
  const isPickup = o.envio === "tienda";
  const adminStatus = toAdminStatus(o.status);

  return {
    id: o.id,
    userId: o.userId ?? `guest-${o.id}`,
    userRole: coerceAdminRole(o.userRole),
    userName: userName || "Cliente sin nombre",
    userEmail: o.shippingAddress.email,
    date: o.date.slice(0, 10),
    adminStatus,
    items,
    subtotal: o.subtotal,
    shipping: o.shipping,
    total: o.total,
    couponCode: o.coupon?.code,
    couponDiscount: o.couponDiscount && o.couponDiscount > 0 ? o.couponDiscount : undefined,
    pointsDiscount: o.pointsDiscount && o.pointsDiscount > 0 ? o.pointsDiscount : undefined,
    address: isPickup ? "— Recogida en tienda —" : address,
    paymentMethod: o.pago,
    paymentStatus: o.paymentStatus ?? derivePaymentStatus(o.pago, adminStatus),
    pickupStore: o.tiendaRecogida ?? undefined,
    statusHistory: [
      { status: adminStatus, date: o.date, by: "sistema" as const },
    ],
    nif: o.nif,
    nifType: o.nifType,
  };
}

// ─── Persistencia dual ──────────────────────────────────────────────────────

const ADMIN_KEY = "tcgacademy_admin_orders";

/**
 * Añade el pedido al inbox admin (`tcgacademy_admin_orders`).
 * Llamado desde el checkout justo después de guardar en `tcgacademy_orders`.
 * Usa robustWrite → se recupera de quota-full con 3 niveles de fallback.
 * Devuelve true si se escribió correctamente.
 */
export function appendToAdminInbox(order: CheckoutOrder): boolean {
  try {
    const admin = checkoutOrderToAdmin(order);
    const existing = safeRead<AdminOrder[]>(ADMIN_KEY, []);
    // Idempotencia: si ya existe (mismo id) lo reemplazamos en su sitio.
    const idx = existing.findIndex((o) => o.id === admin.id);
    const next = idx >= 0
      ? existing.map((o, i) => (i === idx ? admin : o))
      : [admin, ...existing];
    const ok = robustWrite(ADMIN_KEY, next);
    // SSOT: cualquier entrada al inbox notifica a las vistas.
    if (ok && typeof window !== "undefined") {
      try { window.dispatchEvent(new Event("tcga:orders:updated")); } catch { /* non-fatal */ }
    }
    return ok;
  } catch {
    return false;
  }
}

/**
 * Fuente unificada para leer el inbox admin.
 * 1. Lee `tcgacademy_admin_orders` (canónico).
 * 2. Además, escanea `tcgacademy_orders` y añade cualquier pedido del checkout
 *    que no estuviera ya en admin (recuperación de pedidos huérfanos).
 * Útil para el admin panel: garantiza que TODO pedido real acaba visible.
 */
/**
 * Normaliza un AdminOrder heredado. Migración 2026-04-18:
 * el estado "finalizado" (entregado) se eliminó; cualquier orden almacenado
 * con ese valor se reinterpreta como "enviado" (estado final actual).
 * Aplicamos la misma normalización al statusHistory para que la línea
 * temporal no muestre un estado inexistente.
 */
function normalizeLegacyOrder(o: AdminOrder): AdminOrder {
  const legacyStatus = (o.adminStatus as unknown as string) === "finalizado";
  const legacyHistory = o.statusHistory?.some(
    (h) => (h.status as unknown as string) === "finalizado",
  );
  if (!legacyStatus && !legacyHistory) return o;
  return {
    ...o,
    adminStatus: legacyStatus ? "enviado" : o.adminStatus,
    statusHistory: legacyHistory
      ? o.statusHistory.map((h) =>
          (h.status as unknown as string) === "finalizado"
            ? { ...h, status: "enviado" as AdminOrderStatus }
            : h,
        )
      : o.statusHistory,
  };
}

export function readAdminOrdersMerged(fallback: AdminOrder[] = []): AdminOrder[] {
  if (typeof window === "undefined") return fallback.map(normalizeLegacyOrder);
  const admin = safeRead<AdminOrder[]>(ADMIN_KEY, []).map(normalizeLegacyOrder);
  const checkout = safeRead<CheckoutOrder[]>("tcgacademy_orders", []);

  const seen = new Set(admin.map((o) => o.id));
  const recovered: AdminOrder[] = [];
  for (const co of checkout) {
    if (!co || typeof co !== "object" || !co.id) continue;
    if (seen.has(co.id)) continue;
    try {
      recovered.push(normalizeLegacyOrder(checkoutOrderToAdmin(co)));
      seen.add(co.id);
    } catch {
      /* pedido corrupto — saltar */
    }
  }

  const merged = [...recovered, ...admin];
  if (merged.length === 0) return fallback.map(normalizeLegacyOrder);
  // Orden: más recientes primero por fecha
  return merged.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Visibilidad SSOT para el admin:
 * - Pagos diferidos (transferencia/recogida/contrarreembolso) NO se consideran
 *   pedidos reales hasta que `paymentStatus === "cobrado"`. Son intenciones.
 * - Esta función es la ÚNICA verdad sobre "¿aparece este pedido en el admin?".
 *   La usan tanto la tabla /admin/pedidos como cualquier contador/badge para
 *   garantizar que los números coincidan siempre.
 */
export function isAdminVisibleOrder(o: AdminOrder): boolean {
  if (!isDeferredPayment(o.paymentMethod)) return true;
  const pay = o.paymentStatus ?? derivePaymentStatus(o.paymentMethod, o.adminStatus);
  return pay === "cobrado";
}

/**
 * Cuenta los pedidos pendientes por enviar, tirando del SSOT unificado
 * (`readAdminOrdersMerged`) para incluir también los que sólo existen todavía
 * en el checkout (`tcgacademy_orders`) y aún no se propagaron al inbox admin.
 *
 * Criterio: `adminStatus === "pendiente_envio"` Y `isAdminVisibleOrder` (i.e.
 * NO son pagos diferidos pendientes de cobro). Así el badge de la cabecera,
 * el del sidebar admin y la tarjeta "Pendientes" de /admin/pedidos muestran
 * exactamente el mismo número — no puede haber desfase.
 */
export function countPendingOrdersToShip(): number {
  if (typeof window === "undefined") return 0;
  const orders = readAdminOrdersMerged();
  return orders
    .filter(isAdminVisibleOrder)
    .filter((o) => o.adminStatus === "pendiente_envio").length;
}

// ─── Payment status — SSOT ──────────────────────────────────────────────────
//
// Antes vivía en la clave paralela `tcgacademy_payment_status` (Record<orderId,status>).
// Ahora la fuente de verdad es `AdminOrder.paymentStatus`. Estas funciones son el
// ÚNICO camino autorizado para leer/escribir el estado de cobro de un pedido.
//
// Cualquier consumidor antiguo debe migrar a `getOrderPaymentStatus(id)` / `setOrderPaymentStatus(id, status)`.

/**
 * Devuelve el estado de cobro canónico de un pedido.
 * Prioridad: (1) campo explícito en AdminOrder, (2) campo en CheckoutOrder, (3) derivado del método de pago y estado.
 */
export function getOrderPaymentStatus(orderId: string): AdminPaymentStatus {
  if (typeof window === "undefined") return "pendiente";
  const admin = safeRead<AdminOrder[]>(ADMIN_KEY, []);
  const found = admin.find((o) => o.id === orderId);
  if (found) {
    if (found.paymentStatus) return found.paymentStatus;
    return derivePaymentStatus(found.paymentMethod, found.adminStatus);
  }
  // Fallback: pedido huérfano que sólo vive en `tcgacademy_orders`.
  const checkout = safeRead<CheckoutOrder[]>("tcgacademy_orders", []);
  const co = checkout.find((o) => o.id === orderId);
  if (co) {
    if (co.paymentStatus) return co.paymentStatus;
    return derivePaymentStatus(co.pago, toAdminStatus(co.status));
  }
  return "pendiente";
}

/**
 * Actualiza el estado de cobro de un pedido en el inbox admin (SSOT).
 * Dispara `tcga:orders:updated` para que cualquier vista subscrita refresque.
 * Devuelve true si se encontró y guardó; false si el pedido no existe en el inbox.
 */
export function setOrderPaymentStatus(
  orderId: string,
  next: AdminPaymentStatus,
): boolean {
  if (typeof window === "undefined") return false;
  const admin = safeRead<AdminOrder[]>(ADMIN_KEY, []);
  const idx = admin.findIndex((o) => o.id === orderId);
  if (idx < 0) return false;
  if (admin[idx].paymentStatus === next) return true; // no-op
  admin[idx] = { ...admin[idx], paymentStatus: next };
  const ok = robustWrite(ADMIN_KEY, admin);
  if (ok) {
    try {
      window.dispatchEvent(new Event("tcga:orders:updated"));
    } catch { /* non-fatal */ }
  }
  return ok;
}

/**
 * Construye un mapa `orderId → paymentStatus` (compatibilidad con el API antiguo
 * de `Record<string,string>` usado en accounting/invoiceRecovery).
 * Prefiere la nueva lectura SSOT vía getOrderPaymentStatus cuando sea posible.
 */
export function getPaymentStatusMap(): Record<string, AdminPaymentStatus> {
  if (typeof window === "undefined") return {};
  const admin = safeRead<AdminOrder[]>(ADMIN_KEY, []);
  const out: Record<string, AdminPaymentStatus> = {};
  for (const o of admin) {
    out[o.id] =
      o.paymentStatus ?? derivePaymentStatus(o.paymentMethod, o.adminStatus);
  }
  // Also cover orphan checkout orders
  const checkout = safeRead<CheckoutOrder[]>("tcgacademy_orders", []);
  for (const co of checkout) {
    if (!co?.id || out[co.id]) continue;
    out[co.id] =
      co.paymentStatus ?? derivePaymentStatus(co.pago, toAdminStatus(co.status));
  }
  return out;
}

/**
 * Dispara el evento canónico `tcga:orders:updated`.
 * Usar tras CUALQUIER escritura sobre el inbox admin o sobre `tcgacademy_orders`
 * (checkout, seed, admin edits…). Centralizado para evitar olvidos.
 */
export function notifyOrdersUpdated(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("tcga:orders:updated"));
  } catch { /* non-fatal */ }
}

/**
 * Aplica un patch (merge parcial) a un pedido del checkout (`tcgacademy_orders`)
 * localizándolo por `id`. Ruta ÚNICA y autorizada para mutar campos post-checkout
 * tipo `invoiceId` o `pointsDeductionFailed` — nadie debe tocar la clave cruda.
 *
 * Dispara `tcga:orders:updated` si se modificó algo, para que admin/cuenta
 * se refresquen sin recargar la página. Devuelve true si encontró el pedido.
 */
export function patchCheckoutOrder(
  orderId: string,
  patch: Partial<CheckoutOrder> & Record<string, unknown>,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const orders = safeRead<CheckoutOrder[]>("tcgacademy_orders", []);
    const idx = orders.findIndex((o) => o?.id === orderId);
    if (idx < 0) return false;
    orders[idx] = { ...orders[idx], ...patch };
    const ok = robustWrite("tcgacademy_orders", orders);
    if (ok) notifyOrdersUpdated();
    return ok;
  } catch {
    return false;
  }
}
