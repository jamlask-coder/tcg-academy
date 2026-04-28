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
 *
 * ─── INVARIANTE MULTI-ROL (ver memoria project_all_orders_reach_admin) ────────
 *  Los siguientes roles generan entradas en la bandeja admin vía este adapter:
 *    - `cliente`   (B2C)      → checkout público → normalizeLegacyOrder → inbox
 *    - `tienda`    (tiendas)  → MISMO checkout público (no tiene panel propio);
 *                               se distingue por `userRole` + flag `storePrice`.
 *                               Todos los filtros tipo "mis pedidos" son VISTAS
 *                               sobre el inbox común, no un almacén paralelo.
 *    - `mayorista` (B2B)      → checkout público o API /api/orders → inbox
 *    - `admin`     (manual)   → /admin/pedidos/nuevo → appendToAdminInbox directo
 *
 *  EXCEPCIÓN INTENCIONAL (ver memoria feedback_deferred_payment_no_order):
 *    Los pagos diferidos (transferencia / recogida / "pago en tienda") NO crean
 *    pedido ni factura hasta que se confirma cobro (paymentStatus="cobrado").
 *    Esto NO es una violación del invariante: son "intenciones de compra" que
 *    viven en `tcgacademy_email_log` + email a la tienda. Cuando se confirma el
 *    pago manualmente, el admin crea el pedido desde /admin/pedidos/nuevo y
 *    entonces sí pasa por `appendToAdminInbox`. De este modo el invariante se
 *    cumple siempre sobre "pedidos confirmados fiscalmente".
 * ────────────────────────────────────────────────────────────────────────────
 */

import { getMergedById } from "@/lib/productStore";
import { safeRead, robustWrite } from "@/lib/safeStorage";
import { DataHub } from "@/lib/dataHub";
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
    // getMergedById cubre PRODUCTS + productos creados por admin. Antes
    // PRODUCTS.find() devolvía undefined para admin-created y el juego
    // caía a "otros" en el admin, rompiendo filtros por juego.
    const prod = getMergedById(idNum);
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
    userPhone: o.shippingAddress.telefono,
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
    if (ok) DataHub.emit("orders");
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

/**
 * En server-mode (BACKEND_MODE=server) la BD es la ÚNICA fuente de verdad.
 * Los mocks (ADMIN_ORDERS) y los pedidos de demo en localStorage NO se mezclan
 * — sólo se hidratan vía `readAdminOrdersMergedAsync` desde /api/orders.
 *
 * Razón: en producción los pedidos reales de la web actual pertenecen a la SL
 * anterior (ver `fiscalCarryOver`) y NO podemos contaminar la lista con cuentas
 * mock o intentos de checkout local. Ver memoria `feedback_fiscal_carry_over`.
 */
const SERVER_MODE = process.env.NEXT_PUBLIC_BACKEND_MODE === "server";

export function readAdminOrdersMerged(fallback: AdminOrder[] = []): AdminOrder[] {
  if (SERVER_MODE) {
    // Server-mode: ignoramos mocks y localStorage de demo. La rama síncrona
    // devuelve [] hasta que `readAdminOrdersMergedAsync` hidrate desde BD.
    return [];
  }
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
 * Helper canónico "Vista 360°": devuelve todos los pedidos de un usuario.
 * Usar en vez de `readAdminOrdersMerged().filter(o => o.userId === id)` inline.
 * Mantiene el orden (recientes primero) heredado de readAdminOrdersMerged.
 */
export function getOrdersByUser(userId: string): AdminOrder[] {
  return readAdminOrdersMerged().filter((o) => o.userId === userId);
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
  if (ok) DataHub.emit("orders");
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
 * Dispara el evento canónico `tcga:orders:updated` vía DataHub.
 * Usar tras CUALQUIER escritura sobre el inbox admin o sobre `tcgacademy_orders`
 * (checkout, seed, admin edits…). Centralizado para evitar olvidos.
 */
export function notifyOrdersUpdated(): void {
  DataHub.emit("orders");
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

/**
 * Mutación canónica del `adminStatus` de un AdminOrder en el inbox admin
 * (`tcgacademy_admin_orders`). Si el pedido existe, actualiza el estado,
 * añade entrada al `statusHistory` y dispara el evento del DataHub.
 *
 * Devuelve `false` si el pedido no se encuentra (caso típico: facturas
 * manuales emitidas sin pedido web — no hay nada que sincronizar).
 *
 * Uso principal: side-effect de `markAsRefunded()` para que el KPI
 * "Devoluciones" de `/admin/pedidos` refleje los RMA reembolsados.
 */
export function setAdminOrderStatus(
  orderId: string,
  next: AdminOrderStatus,
  note?: string,
  by: "sistema" | "admin" = "sistema",
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const orders = safeRead<AdminOrder[]>(ADMIN_KEY, []);
    const idx = orders.findIndex((o) => o?.id === orderId);
    if (idx < 0) return false;
    const current = orders[idx];
    if (current.adminStatus === next) return true; // no-op
    orders[idx] = {
      ...current,
      adminStatus: next,
      statusHistory: [
        ...current.statusHistory,
        { status: next, date: new Date().toISOString(), by, note },
      ],
    };
    const ok = robustWrite(ADMIN_KEY, orders);
    if (ok) notifyOrdersUpdated();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Replica un cambio sobre un pedido a la BD vía PATCH /api/orders/[id].
 * Sólo actúa en server-mode; en local-mode es no-op (la persistencia ya
 * ha ocurrido en localStorage antes de llamar a este helper).
 *
 * Pensado para que las páginas admin (/admin/pedidos y /admin/pedidos/[id])
 * no dupliquen el `fetch(...)` inline. Si la petición falla, se ignora —
 * localStorage es la SSOT visual; la próxima vez que el admin abra la BD
 * los datos no coincidirán y un re-save los reconcilia.
 */
// ─── BD → AdminOrder ────────────────────────────────────────────────────────

/** Shape mínima de OrderRecord que devuelve GET /api/orders. Lo declaramos
 *  inline para evitar acoplar el cliente a `@/lib/db` (que es server-only). */
interface ApiOrderRecord {
  id: string;
  userId?: string | null;
  customerEmail?: string;
  customerName?: string;
  customerTaxId?: string;
  customerPhone?: string;
  customerRole?: { role?: string } | string | null;
  items: Array<{
    productId: number | string;
    name: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string;
  }>;
  subtotal: number;
  shippingCost?: number;
  couponCode?: string;
  couponDiscount?: number;
  pointsDiscount?: number;
  total: number;
  status: string;
  shippingMethod?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  trackingNumber?: string;
  notes?: string;
  shippingAddress?: {
    calle?: string;
    numero?: string;
    piso?: string;
    cp?: string;
    ciudad?: string;
    provincia?: string;
    pais?: string;
  } | null;
  tiendaRecogida?: string;
  createdAt?: string;
}

function coerceUserRoleFromBd(v: ApiOrderRecord["customerRole"]): AdminOrder["userRole"] {
  const raw =
    typeof v === "string" ? v : typeof v === "object" && v ? v.role : undefined;
  return coerceAdminRole(raw ?? null);
}

function coercePaymentStatusFromBd(v?: string): AdminPaymentStatus | undefined {
  switch ((v ?? "").toLowerCase()) {
    case "paid":
    case "cobrado":
      return "cobrado";
    case "refunded":
    case "reembolsado":
      return "reembolsado";
    case "cancelled":
    case "cancelado":
      return "cancelado";
    case "failed":
    case "fallido":
      return "fallido";
    case "pending":
    case "pendiente":
      return "pendiente";
    default:
      return undefined;
  }
}

function formatBdAddress(a: ApiOrderRecord["shippingAddress"]): string {
  if (!a) return "";
  const street = [a.calle, a.numero].filter(Boolean).join(" ");
  const streetWithFloor = a.piso ? `${street}, ${a.piso}` : street;
  return [
    streetWithFloor,
    [a.cp, a.ciudad].filter(Boolean).join(" "),
    a.provincia,
    a.pais,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Convierte un OrderRecord (tal como lo expone /api/orders) en AdminOrder.
 * Pure: no toca BD ni localStorage. Usado por `fetchAdminOrdersFromBd`.
 */
export function orderRecordToAdmin(r: ApiOrderRecord): AdminOrder {
  const adminStatus = toAdminStatus(r.status);
  const items: AdminItem[] = (r.items ?? []).map((it) => {
    const idNum = Number(it.productId);
    const prod = getMergedById(idNum);
    return {
      id: Number.isFinite(idNum) ? idNum : 0,
      name: it.name,
      qty: Number(it.quantity) || 0,
      price: Number(it.unitPrice) || 0,
      game: prod?.game ?? "otros",
    };
  });
  const isPickup = (r.shippingMethod ?? "") === "tienda" || !!r.tiendaRecogida;
  const explicitPay = coercePaymentStatusFromBd(r.paymentStatus);
  return {
    id: r.id,
    userId: r.userId ?? `guest-${r.id}`,
    userRole: coerceUserRoleFromBd(r.customerRole ?? null),
    userName: r.customerName?.trim() || "Cliente sin nombre",
    userEmail: r.customerEmail ?? "",
    userPhone: r.customerPhone,
    date: (r.createdAt ?? "").slice(0, 10),
    adminStatus,
    items,
    subtotal: Number(r.subtotal) || 0,
    shipping: Number(r.shippingCost) || 0,
    total: Number(r.total) || 0,
    couponCode: r.couponCode,
    couponDiscount:
      r.couponDiscount && r.couponDiscount > 0 ? r.couponDiscount : undefined,
    pointsDiscount:
      r.pointsDiscount && r.pointsDiscount > 0 ? r.pointsDiscount : undefined,
    trackingNumber: r.trackingNumber,
    address: isPickup ? "— Recogida en tienda —" : formatBdAddress(r.shippingAddress),
    paymentMethod: r.paymentMethod ?? "",
    paymentStatus:
      explicitPay ?? derivePaymentStatus(r.paymentMethod ?? "", adminStatus),
    pickupStore: r.tiendaRecogida ?? undefined,
    adminNotes: r.notes,
    statusHistory: [
      {
        status: adminStatus,
        date: r.createdAt ?? new Date().toISOString(),
        by: "sistema" as const,
      },
    ],
    nif: r.customerTaxId,
    // Toda orden cargada de la BD pertenece a la SL anterior — sólo
    // informativa, no se emiten facturas nuevas sobre ella. Bloqueado en
    // /admin/pedidos y servicios de invoice. Ver memoria fiscal_carry_over.
    fiscalCarryOver: true,
  };
}

/**
 * Lee pedidos de la BD vía GET /api/orders (server-mode). Mapea a AdminOrder.
 * En local-mode devuelve [].
 *
 * Usado por /admin/pedidos para que pedidos creados desde otros navegadores
 * (otros admins, otros dispositivos) lleguen al inbox sin depender de
 * localStorage del navegador admin actual.
 */
export async function fetchAdminOrdersFromBd(): Promise<AdminOrder[]> {
  if (typeof window === "undefined") return [];
  const isServerMode = process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
  if (!isServerMode) return [];
  try {
    const res = await fetch("/api/orders", { credentials: "include" });
    if (!res.ok) return [];
    const data = (await res.json()) as { ok: boolean; orders?: ApiOrderRecord[] };
    if (!data.ok || !Array.isArray(data.orders)) return [];
    return data.orders.map(orderRecordToAdmin).map(normalizeLegacyOrder);
  } catch {
    return [];
  }
}

/**
 * Variante async de readAdminOrdersMerged que ADEMÁS hidrata desde BD en
 * server-mode. Mantiene el orden recientes-primero. Dedup por id.
 */
export async function readAdminOrdersMergedAsync(
  fallback: AdminOrder[] = [],
): Promise<AdminOrder[]> {
  if (SERVER_MODE) {
    // Server-mode: SOLO BD. Sin mocks, sin localStorage de demo.
    const bd = await fetchAdminOrdersFromBd();
    return bd.sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  const local = readAdminOrdersMerged(fallback);
  const bd = await fetchAdminOrdersFromBd();
  if (bd.length === 0) return local;
  const seen = new Set(local.map((o) => o.id));
  const extra = bd.filter((o) => !seen.has(o.id));
  return [...local, ...extra].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function replicateOrderUpdateToBd(
  id: string,
  fields: {
    status?: AdminOrderStatus;
    tracking?: string;
    note?: string;
    adminNotes?: string;
  },
): Promise<void> {
  if (typeof window === "undefined") return;
  const isServerMode = process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
  if (!isServerMode) return;
  try {
    await fetch(`/api/orders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(fields),
    });
  } catch {
    // localStorage ya está actualizado; un futuro reload reconciliará
  }
}
