// Tipos del dominio + storage keys. Antes contenia datos seed; purgado 2026-05-01.

// ─── Orders ──────────────────────────────────────────────────────────────────

// Estados visibles para el cliente. 4 estados de flujo normal + 3 excepcionales.
// Flujo lineal: pedido → pagado → pendiente_envio → enviado.
// "entregado" se eliminó 2026-04-20: depende del transportista y generaba ruido.
export type OrderStatus =
  | "pedido"          // orden creada, pago aún no confirmado (pago diferido)
  | "pagado"          // pago confirmado, aún no acusado por admin
  | "pendiente_envio" // admin preparando envío
  | "enviado"         // salió del almacén (estado final normal)
  | "incidencia"      // excepción: problema reportado
  | "cancelado"       // excepción: pedido anulado
  | "devolucion";     // excepción: devolución en curso

export interface OrderItem {
  id: number;
  name: string;
  qty: number;
  qtyShipped?: number; // if < qty → suministro parcial; defaults to qty when undefined
  price: number;
  game: string;
  /**
   * Metadatos opcionales por línea. Hoy se usa para entradas de eventos
   * (`attendees: string[]` con los nombres de los asistentes), pero el
   * shape se deja abierto para futuros casos (regalos, suscripciones…).
   */
  meta?: { attendees?: string[] };
}

export type PaymentStatus = "paid" | "refunded" | "failed";

export interface Order {
  id: string;
  userId: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  trackingNumber?: string;
  address: string;
  paymentMethod: string;
  paymentStatus?: PaymentStatus;
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export type InvoiceStatus = "pagada" | "pendiente";

export interface InvoiceItem {
  description: string;
  qty: number;
  unitPrice: number; // precio unitario CON IVA
  total: number; // total CON IVA
  vatRate?: number; // porcentaje IVA (default 21)
}

export interface Invoice {
  id: string;
  orderId: string;
  date: string;
  dueDate?: string;
  total: number;
  status: InvoiceStatus;
  items: InvoiceItem[];
  // Emisor / receptor (opcional, usa defaults si no está)
  clientName?: string;
  clientNif?: string;
  clientAddress?: string;
}

// ─── Coupons ─────────────────────────────────────────────────────────────────

export type CouponStatus = "activo" | "usado" | "caducado";

export interface Coupon {
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  value: number;
  expiresAt: string;
  status: CouponStatus;
  applicableTo?: string;
  usedAt?: string;
}

export interface AdminCoupon {
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  value: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  applicableTo: "all" | "game" | "category";
  applicableValue?: string;
  maxUses: number;
  usesPerUser: number;
  timesUsed: number;
  totalSaved: number;
}

// ─── Points ──────────────────────────────────────────────────────────────────

export type PointsTransactionType = "compra" | "canje" | "bonus" | "devolucion";

export interface PointsTransaction {
  id: string;
  date: string;
  concept: string;
  type: PointsTransactionType;
  points: number;
  balance: number;
}

// 10.000 puntos = €1 (tasa de canje, escala actual)
export const POINTS_REDEMPTION_TABLE = [
  { points: 10000,  euros: 1 },
  { points: 25000,  euros: 2.5 },
  { points: 50000,  euros: 5 },
  { points: 100000, euros: 10 },
];

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | "pedido"
  | "envio"
  | "cupon"
  | "puntos"
  | "oferta"
  | "devolucion"
  | "sistema"
  | "asociacion";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  read: boolean;
  link?: string;
}

// ─── Returns ─────────────────────────────────────────────────────────────────

export type ReturnStatus =
  | "solicitada"
  | "en_revision"
  | "aceptada"
  | "reembolsada"
  | "rechazada";

export interface ReturnRequest {
  id: string;
  orderId: string;
  date: string;
  status: ReturnStatus;
  reason: string;
  notes: string;
  items: { name: string; qty: number; price: number }[];
  refundAmount: number;
  timeline: { date: string; status: ReturnStatus; note: string }[];
}

// ─── Admin Users ─────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  /**
   * Handle único y legible del usuario, usado en URLs admin
   * (`/admin/usuarios/{username}`) en lugar del id opaco.
   * Formato: slug `a-z0-9-`, 3–30 chars, único. Si falta, se deriva
   * de `name+lastName` vía `getUserHandle()`.
   */
  username?: string;
  name: string;
  lastName: string;
  email: string;
  role: "cliente" | "mayorista" | "tienda" | "admin";
  registeredAt: string;
  totalOrders: number;
  totalSpent: number;
  points: number;
  active: boolean;
  phone?: string;
  address?: string;
  company?: string; // razón social (B2B)
  cif?: string; // CIF/NIF (B2B)
  lastOrderDate?: string;
  birthDate?: string; // YYYY-MM-DD
}

// ─── Admin Orders ────────────────────────────────────────────────────────────

export type AdminOrderStatus =
  | "pendiente_envio" // pending shipment (initial state after payment)
  | "enviado" // shipped with tracking — ESTADO FINAL (no hay "entregado")
  | "incidencia" // incident open
  | "cancelado" // order cancelled
  | "devolucion"; // return in progress

export interface StatusEntry {
  status: AdminOrderStatus;
  date: string; // ISO datetime
  by: string; // "admin" | "sistema"
  note?: string;
}

export interface IncidentMsg {
  from: "cliente" | "admin";
  text: string;
  date: string;
}

export interface OrderIncident {
  id: string;
  type: string;
  description: string;
  date: string;
  status: "abierta" | "en_revision" | "resuelta";
  messages: IncidentMsg[];
}

/**
 * Estado de cobro canónico del pedido. SSOT: vive en AdminOrder.paymentStatus.
 * Prohibido mantener un mapa paralelo (clave `tcgacademy_payment_status` queda deprecada).
 */
export type AdminPaymentStatus =
  | "pendiente"      // pago diferido aún no confirmado (tienda, transferencia, recogida)
  | "cobrado"        // pago confirmado (tarjeta/bizum/paypal, o transferencia marcada)
  | "reembolsado"    // devolución total
  | "cancelado"      // pedido anulado sin cobro
  | "fallido";       // intento de pago rechazado

export interface AdminOrder {
  id: string;
  userId: string;
  userRole: "cliente" | "mayorista" | "tienda";
  userName: string;
  userEmail: string;
  /** Teléfono del comprador — congelado del shippingAddress al crear el pedido. */
  userPhone?: string;
  date: string;
  adminStatus: AdminOrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  couponCode?: string;
  couponDiscount?: number; // amount subtracted (positive number)
  /** Descuento aplicado por canje de puntos (euros). Propagado desde el checkout. */
  pointsDiscount?: number;
  trackingNumber?: string;
  address: string;
  paymentMethod: string;
  /**
   * Estado de cobro — SSOT.
   * Opcional en el modelo para compatibilidad con pedidos antiguos, pero CONSULTAR SIEMPRE
   * vía `getOrderPaymentStatus(orderId)` en orderAdapter, que deriva el valor canónico
   * (campo explícito si está, si no se infiere de paymentMethod + adminStatus).
   * Se escribe vía `setOrderPaymentStatus` (nunca directo; dispara tcga:orders:updated).
   */
  paymentStatus?: AdminPaymentStatus;
  pickupStore?: string; // nombre tienda si es recogida en tienda
  incident?: OrderIncident;
  adminNotes?: string;
  statusHistory: StatusEntry[];
  /** NIF/NIE/CIF del comprador — obligatorio para emitir factura (Art. 6.1.d RD 1619/2012). */
  nif?: string;
  nifType?: "DNI" | "NIE" | "CIF";
  /**
   * Pedido importado de la SL anterior: SOLO informativo. NUNCA emitir
   * factura nueva sobre este pedido (la factura pertenece a la sociedad
   * previa). Bloquea acciones de cobro/factura en /admin/pedidos.
   */
  fiscalCarryOver?: boolean;
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface AppMessage {
  id: string;
  fromUserId: string; // "admin" or user id
  toUserId: string; // "admin" or user id
  fromName: string;
  toName: string;
  subject: string;
  body: string;
  date: string; // ISO datetime
  read: boolean;
  orderId?: string;
  parentId?: string;
  isBroadcast?: boolean;
  broadcastId?: string;
}

export const MSG_STORAGE_KEY = "tcgacademy_messages";
export const ORDER_STORAGE_KEY = "tcgacademy_admin_orders";

// countPendingOrders eliminado — migrado a `countPendingOrdersToShip` en
// `@/lib/orderAdapter`, que usa `readAdminOrdersMerged` (SSOT canónico que
// une admin_orders + checkout orders). Ver DataHub registry entidad "orders".

// ─── Broadcast messaging ──────────────────────────────────────────────────────

export type BroadcastChannel = "interno" | "email" | "ambos";
export type BroadcastTarget =
  | "todos"
  | "clientes"
  | "mayoristas"
  | "tiendas"
  | "ultimos30"
  | "sin_compra_60"
  | "manual";

export interface Broadcast {
  id: string;
  subject: string;
  body: string;
  channel: BroadcastChannel;
  target: BroadcastTarget;
  targetLabel: string;
  recipientCount: number;
  date: string;
  sentBy: string;
}

export const BROADCAST_STORAGE_KEY = "tcgacademy_broadcasts";

// ─── Visits / analytics types ─────────────────────────────────────────────────

export interface ProvinceVisit {
  province: string;
  comunidad: string;
  visits: number;
  orders: number;
  revenue: number;
}

export interface CountryVisit {
  country: string;
  flag: string;
  visits: number;
  orders: number;
  revenue: number;
}

export interface TrafficSourceDetail {
  source: string;
  channel: "search" | "direct" | "social" | "email" | "referral" | "other";
  visits: number;
  pct: number;
  color: string;
  icon: string; // emoji icon
}
