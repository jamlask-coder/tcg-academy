// ─── Mock data for demo purposes ─────────────────────────────────────────────
// All data is static and client-side. Replace with API calls when backend is ready.

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus = "pendiente" | "procesando" | "enviado" | "entregado" | "cancelado"

export interface OrderItem {
  id: number
  name: string
  qty: number
  qtyShipped?: number  // if < qty → suministro parcial; defaults to qty when undefined
  price: number
  game: string
}

export interface Order {
  id: string
  userId: string
  date: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  trackingNumber?: string
  address: string
  paymentMethod: string
}

export const MOCK_ORDERS: Order[] = [
  {
    id: "TCG-20250128-001",
    userId: "demo_cliente",
    date: "2025-01-28",
    status: "enviado",
    trackingNumber: "ES2025012800001",
    items: [
      { id: 1, name: "Naruto Mythos: Konoha Shido Booster Box (24 sobres)", qty: 1, price: 79.95, game: "naruto" },
      { id: 2, name: "Naruto Starter Pack — Naruto Uzumaki", qty: 2, price: 14.95, game: "naruto" },
    ],
    subtotal: 109.85,
    shipping: 0,
    total: 109.85,
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "Tarjeta Visa ****4242",
  },
  {
    id: "TCG-20250115-002",
    userId: "demo_cliente",
    date: "2025-01-15",
    status: "entregado",
    trackingNumber: "ES2025011500002",
    items: [
      { id: 3, name: "Magic The Gathering: Bloomburrow Draft Booster Box", qty: 1, price: 129.95, game: "magic" },
      { id: 4, name: "MTG Bloomburrow Bundle", qty: 1, price: 44.95, game: "magic" },
    ],
    subtotal: 174.90,
    shipping: 0,
    total: 174.90,
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "PayPal",
  },
  {
    id: "TCG-20241230-003",
    userId: "demo_cliente",
    date: "2024-12-30",
    status: "entregado",
    trackingNumber: "ES2024123000003",
    items: [
      { id: 5, name: "Pokémon: Prismatic Evolutions Elite Trainer Box", qty: 2, price: 54.95, game: "pokemon" },
    ],
    subtotal: 109.90,
    shipping: 0,
    total: 109.90,
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "Bizum",
  },
  {
    id: "TCG-20241201-004",
    userId: "demo_cliente",
    date: "2024-12-01",
    status: "entregado",
    items: [
      { id: 6, name: "One Piece OP-07 500 Years in the Future Booster Box", qty: 1, price: 89.95, game: "one-piece" },
      { id: 7, name: "One Piece Starter Deck ST-21 Land of Wano", qty: 1, price: 14.95, game: "one-piece" },
    ],
    subtotal: 104.90,
    shipping: 0,
    total: 104.90,
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "Tarjeta Visa ****4242",
  },
]

// All orders across all users (for admin)
export const ALL_ORDERS: Order[] = [
  ...MOCK_ORDERS,
  {
    id: "TCG-20250125-005",
    userId: "demo_mayorista",
    date: "2025-01-25",
    status: "procesando",
    items: [
      { id: 3, name: "Magic: Bloomburrow Draft Booster Box", qty: 5, price: 106.16, game: "magic" },
      { id: 1, name: "Naruto Mythos Booster Box", qty: 3, price: 65.56, game: "naruto" },
    ],
    subtotal: 727.48,
    shipping: 0,
    total: 727.48,
    address: "Polígono Industrial, Calle B 12, 28850 Torrejón",
    paymentMethod: "Transferencia bancaria",
  },
  {
    id: "TCG-20250122-006",
    userId: "demo_tienda",
    date: "2025-01-22",
    status: "pendiente",
    items: [
      { id: 5, name: "Pokémon: Prismatic Evolutions ETB", qty: 10, price: 41.21, game: "pokemon" },
    ],
    subtotal: 412.10,
    shipping: 0,
    total: 412.10,
    address: "C/ Comercio 45, 08003 Barcelona",
    paymentMethod: "Tarjeta Mastercard ****9876",
  },
]

// ─── Invoices ─────────────────────────────────────────────────────────────────

export type InvoiceStatus = "pagada" | "pendiente"

export interface InvoiceItem {
  description: string
  qty: number
  unitPrice: number   // precio unitario CON IVA
  total: number       // total CON IVA
  vatRate?: number    // porcentaje IVA (default 21)
}

export interface Invoice {
  id: string
  orderId: string
  date: string
  dueDate?: string
  total: number
  status: InvoiceStatus
  items: InvoiceItem[]
  // Emisor / receptor (opcional, usa defaults si no está)
  clientName?: string
  clientNif?: string
  clientAddress?: string
}

export const MOCK_INVOICES: Invoice[] = [
  {
    id: "FAC-2025-0128",
    orderId: "TCG-20250128-001",
    date: "2025-01-28",
    total: 109.85,
    status: "pagada",
    items: [
      { description: "Naruto Mythos: Konoha Shido Booster Box", qty: 1, unitPrice: 79.95, total: 79.95 },
      { description: "Naruto Starter Pack — Naruto Uzumaki", qty: 2, unitPrice: 14.95, total: 29.90 },
    ],
  },
  {
    id: "FAC-2025-0115",
    orderId: "TCG-20250115-002",
    date: "2025-01-15",
    total: 174.90,
    status: "pagada",
    items: [
      { description: "Magic: Bloomburrow Draft Booster Box", qty: 1, unitPrice: 129.95, total: 129.95 },
      { description: "MTG Bloomburrow Bundle", qty: 1, unitPrice: 44.95, total: 44.95 },
    ],
  },
  {
    id: "FAC-2024-1230",
    orderId: "TCG-20241230-003",
    date: "2024-12-30",
    total: 109.90,
    status: "pagada",
    items: [
      { description: "Pokémon: Prismatic Evolutions Elite Trainer Box", qty: 2, unitPrice: 54.95, total: 109.90 },
    ],
  },
  {
    id: "FAC-2024-1201",
    orderId: "TCG-20241201-004",
    date: "2024-12-01",
    total: 104.90,
    status: "pagada",
    items: [
      { description: "One Piece OP-07 Booster Box", qty: 1, unitPrice: 89.95, total: 89.95 },
      { description: "One Piece Starter Deck ST-21", qty: 1, unitPrice: 14.95, total: 14.95 },
    ],
  },
]

// ─── Coupons ──────────────────────────────────────────────────────────────────

export type CouponStatus = "activo" | "usado" | "caducado"

export interface Coupon {
  code: string
  description: string
  discountType: "percent" | "fixed"
  value: number
  expiresAt: string
  status: CouponStatus
  applicableTo?: string
  usedAt?: string
}

export const MOCK_USER_COUPONS: Coupon[] = [
  {
    code: "BIENVENIDA15",
    description: "15% de descuento en tu primera compra",
    discountType: "percent",
    value: 15,
    expiresAt: "2025-12-31",
    status: "activo",
  },
  {
    code: "POKEMON10",
    description: "10% de descuento en toda la sección Pokémon",
    discountType: "percent",
    value: 10,
    expiresAt: "2025-06-30",
    status: "activo",
    applicableTo: "pokemon",
  },
  {
    code: "5EUROS",
    description: "5€ de descuento en tu próxima compra",
    discountType: "fixed",
    value: 5,
    expiresAt: "2025-03-31",
    status: "activo",
  },
  {
    code: "TCG10",
    description: "10% de descuento en toda la tienda",
    discountType: "percent",
    value: 10,
    expiresAt: "2024-12-31",
    status: "usado",
    usedAt: "2024-12-28",
  },
  {
    code: "VERANO20",
    description: "20% de descuento — Oferta de verano",
    discountType: "percent",
    value: 20,
    expiresAt: "2024-09-01",
    status: "caducado",
  },
]

// Admin coupons (all system coupons)
export interface AdminCoupon {
  code: string
  description: string
  discountType: "percent" | "fixed"
  value: number
  startsAt: string
  endsAt: string
  active: boolean
  applicableTo: "all" | "game" | "category"
  applicableValue?: string
  maxUses: number
  usesPerUser: number
  timesUsed: number
  totalSaved: number
}

export const MOCK_ADMIN_COUPONS: AdminCoupon[] = [
  {
    code: "BIENVENIDA15",
    description: "Cupón de bienvenida para nuevos usuarios",
    discountType: "percent",
    value: 15,
    startsAt: "2025-01-01",
    endsAt: "2025-12-31",
    active: true,
    applicableTo: "all",
    maxUses: 1000,
    usesPerUser: 1,
    timesUsed: 47,
    totalSaved: 342.50,
  },
  {
    code: "POKEMON10",
    description: "Promoción sección Pokémon",
    discountType: "percent",
    value: 10,
    startsAt: "2025-01-01",
    endsAt: "2025-06-30",
    active: true,
    applicableTo: "game",
    applicableValue: "pokemon",
    maxUses: 500,
    usesPerUser: 3,
    timesUsed: 123,
    totalSaved: 890.40,
  },
  {
    code: "5EUROS",
    description: "Descuento fijo bienvenida",
    discountType: "fixed",
    value: 5,
    startsAt: "2025-02-01",
    endsAt: "2025-03-31",
    active: true,
    applicableTo: "all",
    maxUses: 200,
    usesPerUser: 1,
    timesUsed: 89,
    totalSaved: 445.00,
  },
  {
    code: "TCG10",
    description: "Promo general fin de año",
    discountType: "percent",
    value: 10,
    startsAt: "2024-12-01",
    endsAt: "2024-12-31",
    active: false,
    applicableTo: "all",
    maxUses: 2000,
    usesPerUser: 1,
    timesUsed: 834,
    totalSaved: 12450.30,
  },
]

// ─── Loyalty points ───────────────────────────────────────────────────────────

export type PointsTransactionType = "compra" | "canje" | "bonus" | "devolucion"

export interface PointsTransaction {
  id: string
  date: string
  concept: string
  type: PointsTransactionType
  points: number
  balance: number
}

export const MOCK_POINTS_HISTORY: PointsTransaction[] = [
  { id: "pt1", date: "2025-01-28", concept: "Compra #TCG-20250128-001", type: "compra", points: 110, balance: 520 },
  { id: "pt2", date: "2025-01-15", concept: "Compra #TCG-20250115-002", type: "compra", points: 175, balance: 410 },
  { id: "pt3", date: "2025-01-10", concept: "Bonus bienvenida", type: "bonus", points: 50, balance: 235 },
  { id: "pt4", date: "2024-12-30", concept: "Compra #TCG-20241230-003", type: "compra", points: 110, balance: 185 },
  { id: "pt5", date: "2024-12-15", concept: "Canje 75 puntos = 0,75€", type: "canje", points: -75, balance: 75 },
  { id: "pt6", date: "2024-12-01", concept: "Compra #TCG-20241201-004", type: "compra", points: 105, balance: 150 },
  { id: "pt7", date: "2024-11-15", concept: "Bonus Black Friday", type: "bonus", points: 30, balance: 45 },
  { id: "pt8", date: "2024-11-01", concept: "Primera compra", type: "compra", points: 15, balance: 15 },
]

export const MOCK_POINTS_BALANCE = 520

export const POINTS_REDEMPTION_TABLE = [
  { points: 100, euros: 1.00 },
  { points: 250, euros: 2.75 },
  { points: 500, euros: 6.00 },
  { points: 1000, euros: 13.00 },
  { points: 2000, euros: 28.00 },
]

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = "pedido" | "envio" | "cupon" | "puntos" | "oferta" | "devolucion" | "sistema"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  date: string
  read: boolean
  link?: string
}

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "envio",
    title: "Tu pedido ha sido enviado",
    message: "El pedido #TCG-20250128-001 ha salido de nuestro almacén. Nº de seguimiento: ES2025012800001",
    date: "2025-01-29T10:30:00Z",
    read: false,
    link: "/cuenta/pedidos/TCG-20250128-001",
  },
  {
    id: "n2",
    type: "cupon",
    title: "Nuevo cupón disponible",
    message: "¡Te hemos enviado un cupón especial! Usa el código POKEMON10 para obtener 10% en Pokémon.",
    date: "2025-01-20T09:00:00Z",
    read: false,
    link: "/cuenta/cupones",
  },
  {
    id: "n3",
    type: "puntos",
    title: "Puntos añadidos a tu cuenta",
    message: "Has ganado 175 puntos por tu compra. Saldo actual: 520 puntos.",
    date: "2025-01-15T16:45:00Z",
    read: false,
    link: "/cuenta/bonos",
  },
  {
    id: "n4",
    type: "pedido",
    title: "Pedido confirmado",
    message: "Tu pedido #TCG-20250115-002 ha sido confirmado. Importe: 174,90€",
    date: "2025-01-15T14:20:00Z",
    read: true,
    link: "/cuenta/pedidos/TCG-20250115-002",
  },
  {
    id: "n5",
    type: "oferta",
    title: "¡Ofertas exclusivas Magic: The Gathering!",
    message: "Hasta 20% de descuento en Booster Boxes de Magic este fin de semana. ¡No te lo pierdas!",
    date: "2025-01-10T08:00:00Z",
    read: true,
    link: "/magic",
  },
  {
    id: "n6",
    type: "pedido",
    title: "Pedido entregado",
    message: "Tu pedido #TCG-20241230-003 ha sido entregado. ¿Qué te ha parecido?",
    date: "2025-01-03T11:15:00Z",
    read: true,
    link: "/cuenta/pedidos/TCG-20241230-003",
  },
  {
    id: "n7",
    type: "sistema",
    title: "Bienvenido a TCG Academy",
    message: "Tu cuenta ha sido creada correctamente. Tienes 50 puntos de bienvenida en tu cuenta.",
    date: "2024-11-10T10:00:00Z",
    read: true,
    link: "/cuenta/bonos",
  },
]

// ─── Returns ──────────────────────────────────────────────────────────────────

export type ReturnStatus = "solicitada" | "en_revision" | "aceptada" | "reembolsada" | "rechazada"

export interface ReturnRequest {
  id: string
  orderId: string
  date: string
  status: ReturnStatus
  reason: string
  notes: string
  items: { name: string; qty: number; price: number }[]
  refundAmount: number
  timeline: { date: string; status: ReturnStatus; note: string }[]
}

export const MOCK_RETURNS: ReturnRequest[] = [
  {
    id: "DEV-2025-001",
    orderId: "TCG-20241230-003",
    date: "2025-01-05",
    status: "reembolsada",
    reason: "Producto dañado",
    notes: "La caja llegó con la esquina aplastada y varios sobres abiertos.",
    items: [{ name: "Pokémon: Prismatic Evolutions Elite Trainer Box", qty: 1, price: 54.95 }],
    refundAmount: 54.95,
    timeline: [
      { date: "2025-01-05", status: "solicitada", note: "Devolución solicitada por el cliente." },
      { date: "2025-01-07", status: "en_revision", note: "Revisando fotos adjuntas del daño." },
      { date: "2025-01-09", status: "aceptada", note: "Devolución aceptada. Producto dañado en el transporte." },
      { date: "2025-01-12", status: "reembolsada", note: "Reembolso de 54,95€ procesado a tu Visa ****4242." },
    ],
  },
]

// ─── Users (admin view) ───────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  name: string
  lastName: string
  email: string
  role: "cliente" | "mayorista" | "tienda" | "admin"
  registeredAt: string
  totalOrders: number
  totalSpent: number
  points: number
  active: boolean
}

export const MOCK_USERS: AdminUser[] = [
  { id: "demo_cliente", name: "Cliente", lastName: "Demo", email: "cliente@demo.com", role: "cliente", registeredAt: "2024-11-10", totalOrders: 4, totalSpent: 499.55, points: 520, active: true },
  { id: "demo_mayorista", name: "Mayorista", lastName: "Demo", email: "mayorista@demo.com", role: "mayorista", registeredAt: "2024-09-15", totalOrders: 28, totalSpent: 14820.50, points: 2200, active: true },
  { id: "demo_tienda", name: "Tienda", lastName: "Demo", email: "tienda@demo.com", role: "tienda", registeredAt: "2024-08-01", totalOrders: 45, totalSpent: 28540.00, points: 0, active: true },
  { id: "admin", name: "Admin", lastName: "TCG", email: "admin@tcgacademy.com", role: "admin", registeredAt: "2024-01-01", totalOrders: 0, totalSpent: 0, points: 0, active: true },
  { id: "u5", name: "María", lastName: "García", email: "maria.garcia@email.com", role: "cliente", registeredAt: "2025-01-15", totalOrders: 2, totalSpent: 145.80, points: 146, active: true },
  { id: "u6", name: "Carlos", lastName: "Martínez", email: "carlos.m@email.com", role: "cliente", registeredAt: "2025-01-20", totalOrders: 1, totalSpent: 79.95, points: 80, active: true },
  { id: "u7", name: "Ana", lastName: "López", email: "ana.lopez@email.com", role: "cliente", registeredAt: "2024-12-10", totalOrders: 6, totalSpent: 380.40, points: 380, active: true },
  { id: "u8", name: "Pedro", lastName: "Sánchez", email: "pedro.s@email.com", role: "mayorista", registeredAt: "2024-10-05", totalOrders: 15, totalSpent: 6820.00, points: 1200, active: false },
]

// ─── Sales chart data ─────────────────────────────────────────────────────────

export const MOCK_SALES_7D = [
  { day: "Lun", sales: 420, orders: 4 },
  { day: "Mar", sales: 850, orders: 8 },
  { day: "Mié", sales: 320, orders: 3 },
  { day: "Jue", sales: 1240, orders: 12 },
  { day: "Vie", sales: 980, orders: 9 },
  { day: "Sáb", sales: 1560, orders: 15 },
  { day: "Dom", sales: 740, orders: 7 },
]
