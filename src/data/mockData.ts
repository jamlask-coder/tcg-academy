// ─── Mock data for demo purposes ─────────────────────────────────────────────
// All data is static and client-side. Replace with API calls when backend is ready.

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus = "pedido" | "enviado" | "entregado" | "incidencia";

export interface OrderItem {
  id: number;
  name: string;
  qty: number;
  qtyShipped?: number; // if < qty → suministro parcial; defaults to qty when undefined
  price: number;
  game: string;
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

export const MOCK_ORDERS: Order[] = [
  {
    id: "TCG-20250128-001",
    userId: "demo_cliente",
    date: "2025-01-28",
    status: "enviado",
    trackingNumber: "ES2025012800001",
    items: [
      {
        id: 1,
        name: "Naruto Mythos: Konoha Shidō Booster Box (24 sobres)",
        qty: 1,
        price: 79.95,
        game: "naruto",
      },
      {
        id: 2,
        name: "Naruto Starter Pack — Naruto Uzumaki",
        qty: 2,
        price: 14.95,
        game: "naruto",
      },
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
      {
        id: 3,
        name: "Magic The Gathering: Bloomburrow Draft Booster Box",
        qty: 1,
        price: 129.95,
        game: "magic",
      },
      {
        id: 4,
        name: "MTG Bloomburrow Bundle",
        qty: 1,
        price: 44.95,
        game: "magic",
      },
    ],
    subtotal: 174.9,
    shipping: 0,
    total: 174.9,
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
      {
        id: 5,
        name: "Pokémon: Prismatic Evolutions Elite Trainer Box",
        qty: 2,
        price: 54.95,
        game: "pokemon",
      },
    ],
    subtotal: 109.9,
    shipping: 0,
    total: 109.9,
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "Bizum",
  },
  {
    id: "TCG-20241201-004",
    userId: "demo_cliente",
    date: "2024-12-01",
    status: "entregado",
    items: [
      {
        id: 6,
        name: "One Piece OP-07 500 Years in the Future Booster Box",
        qty: 1,
        price: 89.95,
        game: "one-piece",
      },
      {
        id: 7,
        name: "One Piece Starter Deck ST-21 Land of Wano",
        qty: 1,
        price: 14.95,
        game: "one-piece",
      },
    ],
    subtotal: 104.9,
    shipping: 0,
    total: 104.9,
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "Tarjeta Visa ****4242",
  },
];

// All orders across all users (for admin)
export const ALL_ORDERS: Order[] = [
  ...MOCK_ORDERS,
  {
    id: "TCG-20250125-005",
    userId: "demo_mayorista",
    date: "2025-01-25",
    status: "pedido",
    items: [
      {
        id: 3,
        name: "Magic: Bloomburrow Draft Booster Box",
        qty: 5,
        price: 106.16,
        game: "magic",
      },
      {
        id: 1,
        name: "Naruto Mythos Booster Box",
        qty: 3,
        price: 65.56,
        game: "naruto",
      },
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
    status: "pedido",
    items: [
      {
        id: 5,
        name: "Pokémon: Prismatic Evolutions ETB",
        qty: 10,
        price: 41.21,
        game: "pokemon",
      },
    ],
    subtotal: 412.1,
    shipping: 0,
    total: 412.1,
    address: "C/ Comercio 45, 08003 Barcelona",
    paymentMethod: "Tarjeta Mastercard ****9876",
  },
];

// ─── Invoices ─────────────────────────────────────────────────────────────────

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

export const MOCK_INVOICES: Invoice[] = [
  {
    id: "FAC-2025-0128",
    orderId: "TCG-20250128-001",
    date: "2025-01-28",
    total: 109.85,
    status: "pagada",
    items: [
      {
        description: "Naruto Mythos: Konoha Shidō Booster Box",
        qty: 1,
        unitPrice: 79.95,
        total: 79.95,
      },
      {
        description: "Naruto Starter Pack — Naruto Uzumaki",
        qty: 2,
        unitPrice: 14.95,
        total: 29.9,
      },
    ],
  },
  {
    id: "FAC-2025-0115",
    orderId: "TCG-20250115-002",
    date: "2025-01-15",
    total: 174.9,
    status: "pagada",
    items: [
      {
        description: "Magic: Bloomburrow Draft Booster Box",
        qty: 1,
        unitPrice: 129.95,
        total: 129.95,
      },
      {
        description: "MTG Bloomburrow Bundle",
        qty: 1,
        unitPrice: 44.95,
        total: 44.95,
      },
    ],
  },
  {
    id: "FAC-2024-1230",
    orderId: "TCG-20241230-003",
    date: "2024-12-30",
    total: 109.9,
    status: "pagada",
    items: [
      {
        description: "Pokémon: Prismatic Evolutions Elite Trainer Box",
        qty: 2,
        unitPrice: 54.95,
        total: 109.9,
      },
    ],
  },
  {
    id: "FAC-2024-1201",
    orderId: "TCG-20241201-004",
    date: "2024-12-01",
    total: 104.9,
    status: "pagada",
    items: [
      {
        description: "One Piece OP-07 Booster Box",
        qty: 1,
        unitPrice: 89.95,
        total: 89.95,
      },
      {
        description: "One Piece Starter Deck ST-21",
        qty: 1,
        unitPrice: 14.95,
        total: 14.95,
      },
    ],
  },
];

// ─── Coupons ──────────────────────────────────────────────────────────────────

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
];

// Admin coupons (all system coupons)
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

export const MOCK_ADMIN_COUPONS: AdminCoupon[] = [
  {
    code: "BIENVENIDA15",
    description: "Cupón de bienvenida para nuevos usuarios",
    discountType: "percent",
    value: 15,
    startsAt: "2026-01-01",
    endsAt: "2026-12-31",
    active: true,
    applicableTo: "all",
    maxUses: 1000,
    usesPerUser: 1,
    timesUsed: 47,
    totalSaved: 342.5,
  },
  {
    code: "POKEMON10",
    description: "Promoción sección Pokémon",
    discountType: "percent",
    value: 10,
    startsAt: "2026-01-01",
    endsAt: "2026-06-30",
    active: true,
    applicableTo: "game",
    applicableValue: "pokemon",
    maxUses: 500,
    usesPerUser: 3,
    timesUsed: 123,
    totalSaved: 890.4,
  },
  {
    code: "5EUROS",
    description: "Descuento fijo bienvenida",
    discountType: "fixed",
    value: 5,
    startsAt: "2026-02-01",
    endsAt: "2026-06-30",
    active: true,
    applicableTo: "all",
    maxUses: 200,
    usesPerUser: 1,
    timesUsed: 89,
    totalSaved: 445.0,
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
    totalSaved: 12450.3,
  },
];

// ─── Loyalty points ───────────────────────────────────────────────────────────

export type PointsTransactionType = "compra" | "canje" | "bonus" | "devolucion";

export interface PointsTransaction {
  id: string;
  date: string;
  concept: string;
  type: PointsTransactionType;
  points: number;
  balance: number;
}

export const MOCK_POINTS_HISTORY: PointsTransaction[] = [
  {
    id: "pt1",
    date: "2025-01-28",
    concept: "Compra #TCG-20250128-001",
    type: "compra",
    points: 110,
    balance: 520,
  },
  {
    id: "pt2",
    date: "2025-01-15",
    concept: "Compra #TCG-20250115-002",
    type: "compra",
    points: 175,
    balance: 410,
  },
  {
    id: "pt3",
    date: "2025-01-10",
    concept: "Bonus bienvenida",
    type: "bonus",
    points: 50,
    balance: 235,
  },
  {
    id: "pt4",
    date: "2024-12-30",
    concept: "Compra #TCG-20241230-003",
    type: "compra",
    points: 110,
    balance: 185,
  },
  {
    id: "pt5",
    date: "2024-12-15",
    concept: "Canje 75 puntos = 0,75€",
    type: "canje",
    points: -75,
    balance: 75,
  },
  {
    id: "pt6",
    date: "2024-12-01",
    concept: "Compra #TCG-20241201-004",
    type: "compra",
    points: 105,
    balance: 150,
  },
  {
    id: "pt7",
    date: "2024-11-15",
    concept: "Bonus Black Friday",
    type: "bonus",
    points: 30,
    balance: 45,
  },
  {
    id: "pt8",
    date: "2024-11-01",
    concept: "Primera compra",
    type: "compra",
    points: 15,
    balance: 15,
  },
];

export const MOCK_POINTS_BALANCE = 520;

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

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "envio",
    title: "Tu pedido ha sido enviado",
    message:
      "El pedido #TCG-20250128-001 ha salido de nuestro almacén. Nº de seguimiento: ES2025012800001",
    date: "2025-01-29T10:30:00Z",
    read: false,
    link: "/cuenta/pedidos/TCG-20250128-001",
  },
  {
    id: "n2",
    type: "cupon",
    title: "Nuevo cupón disponible",
    message:
      "¡Te hemos enviado un cupón especial! Usa el código POKEMON10 para obtener 10% en Pokémon.",
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
    message:
      "Hasta 20% de descuento en Booster Boxes de Magic este fin de semana. ¡No te lo pierdas!",
    date: "2025-01-10T08:00:00Z",
    read: true,
    link: "/magic",
  },
  {
    id: "n6",
    type: "pedido",
    title: "Pedido entregado",
    message:
      "Tu pedido #TCG-20241230-003 ha sido entregado. ¿Qué te ha parecido?",
    date: "2025-01-03T11:15:00Z",
    read: true,
    link: "/cuenta/pedidos/TCG-20241230-003",
  },
  {
    id: "n7",
    type: "sistema",
    title: "Bienvenido a TCG Academy",
    message:
      "Tu cuenta ha sido creada correctamente. Tienes 50 puntos de bienvenida en tu cuenta.",
    date: "2024-11-10T10:00:00Z",
    read: true,
    link: "/cuenta/bonos",
  },
];

// ─── Returns ──────────────────────────────────────────────────────────────────

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

export const MOCK_RETURNS: ReturnRequest[] = [
  {
    id: "DEV-2025-001",
    orderId: "TCG-20241230-003",
    date: "2025-01-05",
    status: "reembolsada",
    reason: "Producto dañado",
    notes: "La caja llegó con la esquina aplastada y varios sobres abiertos.",
    items: [
      {
        name: "Pokémon: Prismatic Evolutions Elite Trainer Box",
        qty: 1,
        price: 54.95,
      },
    ],
    refundAmount: 54.95,
    timeline: [
      {
        date: "2025-01-05",
        status: "solicitada",
        note: "Devolución solicitada por el cliente.",
      },
      {
        date: "2025-01-07",
        status: "en_revision",
        note: "Revisando fotos adjuntas del daño.",
      },
      {
        date: "2025-01-09",
        status: "aceptada",
        note: "Devolución aceptada. Producto dañado en el transporte.",
      },
      {
        date: "2025-01-12",
        status: "reembolsada",
        note: "Reembolso de 54,95€ procesado a tu Visa ****4242.",
      },
    ],
  },
];

// ─── Users (admin view) ───────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
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

export const MOCK_USERS: AdminUser[] = [
  // ── Demo auth accounts ────────────────────────────────────────────────────
  {
    id: "demo_cliente",
    name: "Laura",
    lastName: "Sánchez García",
    email: "cliente@test.com",
    role: "cliente",
    registeredAt: "2025-06-15",
    totalOrders: 8,
    totalSpent: 780.25,
    points: 780,
    active: true,
    phone: "+34 622 345 678",
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    lastOrderDate: "2026-03-28",
    birthDate: "1998-04-15",
  },
  {
    id: "demo_mayorista",
    name: "Carlos",
    lastName: "López Distribuciones",
    email: "mayorista@test.com",
    role: "mayorista",
    registeredAt: "2024-03-01",
    totalOrders: 42,
    totalSpent: 28540.0,
    points: 3200,
    active: true,
    phone: "+34 91 456 7890",
    address: "Polígono Industrial, Calle B 12, 28850 Torrejón de Ardoz, Madrid",
    company: "Distribuciones López S.L.",
    cif: "B12345678",
    lastOrderDate: "2026-03-26",
  },
  {
    id: "demo_tienda",
    name: "Ana",
    lastName: "Martínez Vidal",
    email: "tienda@test.com",
    role: "tienda",
    registeredAt: "2024-01-15",
    totalOrders: 55,
    totalSpent: 38560.0,
    points: 0,
    active: true,
    phone: "+34 93 345 6789",
    address: "Calle Comercio 45, 08003 Barcelona",
    company: "Game Zone Barcelona S.L.",
    cif: "B56789012",
    lastOrderDate: "2026-03-27",
  },
  {
    id: "admin",
    name: "Admin",
    lastName: "TCG",
    email: "admin@tcgacademy.es",
    role: "admin",
    registeredAt: "2024-01-01",
    totalOrders: 0,
    totalSpent: 0,
    points: 0,
    active: true,
  },
  // ── Clientes ──────────────────────────────────────────────────────────────
  {
    id: "u5",
    name: "Miguel",
    lastName: "Torres Blanco",
    email: "miguel.torres@email.com",
    role: "cliente",
    registeredAt: "2025-09-20",
    totalOrders: 3,
    totalSpent: 329.55,
    points: 330,
    active: true,
    phone: "+34 634 567 890",
    address: "Avda. de la Constitución 8, 3ºA, 41001 Sevilla",
    lastOrderDate: "2026-03-25",
  },
  {
    id: "u6",
    name: "Isabel",
    lastName: "Fernández Morales",
    email: "isabel.f@email.com",
    role: "cliente",
    registeredAt: "2025-11-05",
    totalOrders: 2,
    totalSpent: 219.8,
    points: 220,
    active: true,
    phone: "+34 645 678 901",
    address: "Calle Ancha 22, 1ºD, 08001 Barcelona",
    lastOrderDate: "2026-03-20",
  },
  {
    id: "u7",
    name: "Javier",
    lastName: "Ruiz Martínez",
    email: "javier.ruiz@email.com",
    role: "cliente",
    registeredAt: "2025-08-12",
    totalOrders: 4,
    totalSpent: 580.1,
    points: 580,
    active: true,
    phone: "+34 656 789 012",
    address: "Gran Vía 45, 5ºC, 48001 Bilbao",
    lastOrderDate: "2026-03-08",
  },
  {
    id: "u8",
    name: "Carmen",
    lastName: "Navarro Ortiz",
    email: "carmen.nav@email.com",
    role: "cliente",
    registeredAt: "2026-01-10",
    totalOrders: 1,
    totalSpent: 109.9,
    points: 110,
    active: true,
    phone: "+34 667 890 123",
    address: "Calle Colón 3, 2ºB, 46001 Valencia",
    lastOrderDate: "2026-03-10",
  },
  // ── Mayoristas ───────────────────────────────────────────────────────────
  {
    id: "u9",
    name: "Pedro",
    lastName: "Pérez Almansa",
    email: "distribuciones.perez@email.com",
    role: "mayorista",
    registeredAt: "2024-05-20",
    totalOrders: 18,
    totalSpent: 12840.5,
    points: 1500,
    active: true,
    phone: "+34 93 567 8901",
    address:
      "Polígono Industrial Can Parellada, Nave 15, 08228 Terrassa, Barcelona",
    company: "Juguetes Pérez S.A.",
    cif: "A23456789",
    lastOrderDate: "2026-03-22",
  },
  {
    id: "u10",
    name: "Ramón",
    lastName: "Morales Izquierdo",
    email: "tcg.norte@email.com",
    role: "mayorista",
    registeredAt: "2024-07-08",
    totalOrders: 12,
    totalSpent: 8920.0,
    points: 1100,
    active: true,
    phone: "+34 94 678 9012",
    address: "Polígono Jundiz, Calle D 8, 01015 Vitoria-Gasteiz, Álava",
    company: "TCG Distribución Norte S.L.",
    cif: "B34567890",
    lastOrderDate: "2026-03-12",
  },
  {
    id: "u11",
    name: "Sofía",
    lastName: "Ibáñez Cano",
    email: "iberian@email.com",
    role: "mayorista",
    registeredAt: "2024-09-14",
    totalOrders: 9,
    totalSpent: 6240.8,
    points: 800,
    active: true,
    phone: "+34 96 789 0123",
    address: "Calle Industria 30, Nave 3, 46017 Valencia",
    company: "Iberian Cards S.L.",
    cif: "B45678901",
    lastOrderDate: "2026-03-05",
  },
  // ── Tiendas ───────────────────────────────────────────────────────────────
  {
    id: "u12",
    name: "Tomás",
    lastName: "García Serrano",
    email: "cards.madrid@email.com",
    role: "tienda",
    registeredAt: "2024-04-22",
    totalOrders: 22,
    totalSpent: 15820.4,
    points: 0,
    active: true,
    phone: "+34 91 234 5678",
    address: "Calle Fuencarral 78, 28004 Madrid",
    company: "Cards & Comics Madrid S.L.U.",
    cif: "B67890123",
    lastOrderDate: "2026-03-25",
  },
  {
    id: "u13",
    name: "Elena",
    lastName: "Romero Castillo",
    email: "dragon.tcg@email.com",
    role: "tienda",
    registeredAt: "2024-06-30",
    totalOrders: 16,
    totalSpent: 9840.2,
    points: 0,
    active: true,
    phone: "+34 95 456 7890",
    address: "Avenida Kansas City 12, Local 3, 41007 Sevilla",
    company: "Dragon TCG Sevilla S.L.",
    cif: "B78901234",
    lastOrderDate: "2026-03-18",
  },
  {
    id: "u14",
    name: "Francisco",
    lastName: "Vidal Herrero",
    email: "magic.corner@email.com",
    role: "tienda",
    registeredAt: "2024-08-15",
    totalOrders: 14,
    totalSpent: 7920.6,
    points: 0,
    active: true,
    phone: "+34 96 567 8901",
    address: "Gran Vía Marqués del Turia 54, Bajo, 46005 Valencia",
    company: "Magic Corner Valencia S.L.",
    cif: "B89012345",
    lastOrderDate: "2026-03-01",
  },
];

// ─── Sales chart data ─────────────────────────────────────────────────────────

export const MOCK_SALES_7D = [
  { day: "Lun", sales: 420, orders: 4 },
  { day: "Mar", sales: 850, orders: 8 },
  { day: "Mié", sales: 320, orders: 3 },
  { day: "Jue", sales: 1240, orders: 12 },
  { day: "Vie", sales: 980, orders: 9 },
  { day: "Sáb", sales: 1560, orders: 15 },
  { day: "Dom", sales: 740, orders: 7 },
];

// ─── Admin order system (extended) ───────────────────────────────────────────

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
}

const _DT = (d: string, t = "10:00") => `${d}T${t}:00`;

export const ADMIN_ORDERS: AdminOrder[] = [
  // ── FAC-2026-00001 · tienda · finalizado ─────────────────────────────────
  {
    id: "TCG-20260301-001",
    userId: "u14",
    userRole: "tienda",
    userName: "Francisco Vidal (Magic Corner Valencia)",
    userEmail: "magic.corner@email.com",
    date: "2026-03-01",
    adminStatus: "enviado",
    trackingNumber: "7824561220",
    items: [
      {
        id: 10001,
        name: "MTG Duskmourn: House of Horror Draft Booster Display (36 sobres)",
        qty: 2,
        price: 85.46,
        game: "magic",
      },
    ],
    subtotal: 170.92,
    shipping: 0,
    total: 170.92,
    address: "Gran Vía Marqués del Turia 54, Bajo, 46005 Valencia",
    paymentMethod: "Tarjeta Visa ****2210",
    adminNotes:
      "Cliente habitual — siempre recoge en tienda o prefiere envío express.",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-01", "10:15"),
        by: "sistema",
      },
      {
        status: "pendiente_envio",
        date: _DT("2026-03-01", "11:30"),
        by: "admin",
      },
      {
        status: "enviado",
        date: _DT("2026-03-02", "08:45"),
        by: "admin",
        note: "GLS 7824561220",
      },
      {
        status: "enviado",
        date: _DT("2026-03-03", "14:20"),
        by: "admin",
        note: "GLS confirmó entrega",
      },
    ],
  },
  // ── FAC-2026-00002 · mayorista · finalizado ──────────────────────────────
  {
    id: "TCG-20260305-002",
    userId: "u11",
    userRole: "mayorista",
    userName: "Sofía Ibáñez (Iberian Cards S.L.)",
    userEmail: "iberian@email.com",
    date: "2026-03-05",
    adminStatus: "enviado",
    trackingNumber: "7824561221",
    items: [
      {
        id: 10002,
        name: "Naruto Mythos: Konoha Shidō Booster Box (24 sobres)",
        qty: 3,
        price: 65.56,
        game: "naruto",
      },
      {
        id: 10003,
        name: "One Piece OP-09 500 Years in the Future Booster Display",
        qty: 1,
        price: 81.96,
        game: "one-piece",
      },
    ],
    subtotal: 278.64,
    shipping: 0,
    total: 278.64,
    address: "Calle Industria 30, Nave 3, 46017 Valencia",
    paymentMethod: "Transferencia bancaria",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-05", "09:00"),
        by: "sistema",
      },
      {
        status: "pendiente_envio",
        date: _DT("2026-03-05", "12:00"),
        by: "admin",
      },
      {
        status: "enviado",
        date: _DT("2026-03-06", "08:30"),
        by: "admin",
        note: "GLS 7824561221",
      },
      {
        status: "enviado",
        date: _DT("2026-03-07", "16:00"),
        by: "admin",
        note: "Entregado según GLS",
      },
    ],
  },
  // ── FAC-2026-00003 · cliente · finalizado · CUPÓN BIENVENIDA15 ───────────
  {
    id: "TCG-20260308-003",
    userId: "u7",
    userRole: "cliente",
    userName: "Javier Ruiz Martínez",
    userEmail: "javier.ruiz@email.com",
    date: "2026-03-08",
    adminStatus: "enviado",
    trackingNumber: "7824561222",
    items: [
      {
        id: 10004,
        name: "One Piece OP-09 500 Years in the Future Booster Box",
        qty: 1,
        price: 99.95,
        game: "one-piece",
      },
      {
        id: 10005,
        name: "One Piece Starter Deck ST-21 Land of Wano",
        qty: 2,
        price: 14.95,
        game: "one-piece",
      },
    ],
    subtotal: 129.85,
    shipping: 0,
    couponCode: "BIENVENIDA15",
    couponDiscount: 19.48,
    total: 110.37,
    address: "Gran Vía 45, 5ºC, 48001 Bilbao",
    paymentMethod: "PayPal",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-08", "15:40"),
        by: "sistema",
      },
      {
        status: "pendiente_envio",
        date: _DT("2026-03-08", "17:00"),
        by: "admin",
      },
      {
        status: "enviado",
        date: _DT("2026-03-09", "09:00"),
        by: "admin",
        note: "GLS 7824561222",
      },
      {
        status: "enviado",
        date: _DT("2026-03-10", "12:30"),
        by: "admin",
        note: "Cliente confirmó recepción",
      },
    ],
  },
  // ── FAC-2026-00004 · cliente · incidencia (producto dañado) ──────────────
  {
    id: "TCG-20260310-004",
    userId: "u8",
    userRole: "cliente",
    userName: "Carmen Navarro Ortiz",
    userEmail: "carmen.nav@email.com",
    date: "2026-03-10",
    adminStatus: "incidencia",
    trackingNumber: "7824561223",
    items: [
      {
        id: 20001,
        name: "Pokémon: Prismatic Evolutions Elite Trainer Box",
        qty: 2,
        price: 54.95,
        game: "pokemon",
      },
    ],
    subtotal: 109.9,
    shipping: 0,
    total: 109.9,
    address: "Calle Colón 3, 2ºB, 46001 Valencia",
    paymentMethod: "Tarjeta Mastercard ****5544",
    incident: {
      id: "INC-001",
      type: "producto_defectuoso",
      description:
        "Las dos cajas llegaron con los plásticos rotos y una con una esquina muy aplastada. Parece un problema de embalaje.",
      date: _DT("2026-03-12", "11:20"),
      status: "en_revision",
      messages: [
        {
          from: "cliente",
          text: "Buenos días, recibí las dos cajas pero venían con daños en el embalaje exterior. Una tiene la esquina completamente aplastada. ¿Podéis enviarme un sustituto?",
          date: _DT("2026-03-12", "11:20"),
        },
        {
          from: "admin",
          text: "Hola Carmen, lamentamos los daños. Estamos revisando tu caso con nuestro proveedor de transporte. Por favor envíanos fotos a soporte@tcgacademy.es y lo resolvemos lo antes posible.",
          date: _DT("2026-03-12", "14:05"),
        },
        {
          from: "cliente",
          text: "Ya os he enviado las fotos por email. Gracias.",
          date: _DT("2026-03-12", "15:30"),
        },
      ],
    },
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-10", "10:00"),
        by: "sistema",
      },
      {
        status: "pendiente_envio",
        date: _DT("2026-03-10", "12:00"),
        by: "admin",
      },
      {
        status: "enviado",
        date: _DT("2026-03-11", "08:30"),
        by: "admin",
        note: "GLS 7824561223",
      },
      {
        status: "incidencia",
        date: _DT("2026-03-12", "11:20"),
        by: "sistema",
        note: "Cliente reporta producto dañado",
      },
    ],
  },
  // ── FAC-2026-00005 · mayorista · incidencia (cambio dirección) ───────────
  {
    id: "TCG-20260312-005",
    userId: "u10",
    userRole: "mayorista",
    userName: "Ramón Morales (TCG Distribución Norte S.L.)",
    userEmail: "tcg.norte@email.com",
    date: "2026-03-12",
    adminStatus: "incidencia",
    items: [
      {
        id: 10006,
        name: "Magic: The Gathering Bloomburrow Collector Booster Display",
        qty: 2,
        price: 204.96,
        game: "magic",
      },
    ],
    subtotal: 409.92,
    shipping: 0,
    total: 409.92,
    address: "Polígono Jundiz, Calle D 8, 01015 Vitoria-Gasteiz, Álava",
    paymentMethod: "Transferencia bancaria",
    incident: {
      id: "INC-002",
      type: "cambio_direccion",
      description:
        "El cliente solicita cambio de dirección de entrega antes del envío. Nueva dirección: Calle Portal de Castilla 2, Nave 8, 01013 Vitoria-Gasteiz.",
      date: _DT("2026-03-13", "09:45"),
      status: "abierta",
      messages: [
        {
          from: "cliente",
          text: "Necesitamos cambiar la dirección de entrega. La nave se ha trasladado. Nueva dirección: Calle Portal de Castilla 2, Nave 8, 01013 Vitoria-Gasteiz.",
          date: _DT("2026-03-13", "09:45"),
        },
        {
          from: "admin",
          text: "Entendido. Actualizaremos la dirección antes de generar el envío. Le confirmamos en breve.",
          date: _DT("2026-03-13", "10:30"),
        },
      ],
    },
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-12", "08:00"),
        by: "sistema",
      },
      {
        status: "pendiente_envio",
        date: _DT("2026-03-12", "11:00"),
        by: "admin",
      },
      {
        status: "incidencia",
        date: _DT("2026-03-13", "09:45"),
        by: "sistema",
        note: "Cliente solicita cambio de dirección",
      },
    ],
  },
  // ── FAC-2026-00006 · tienda · enviado · SUMINISTRO PARCIAL ───────────────
  {
    id: "TCG-20260318-006",
    userId: "u13",
    userRole: "tienda",
    userName: "Elena Romero (Dragon TCG Sevilla S.L.)",
    userEmail: "dragon.tcg@email.com",
    date: "2026-03-18",
    adminStatus: "enviado",
    trackingNumber: "7824561224",
    items: [
      {
        id: 20001,
        name: "Pokémon: Prismatic Evolutions Elite Trainer Box",
        qty: 10,
        qtyShipped: 6,
        price: 41.21,
        game: "pokemon",
      },
    ],
    subtotal: 412.1,
    shipping: 0,
    total: 412.1,
    address: "Avenida Kansas City 12, Local 3, 41007 Sevilla",
    paymentMethod: "Tarjeta Mastercard ****7732",
    adminNotes:
      "Suministro parcial: solo 6 unidades en stock. Faltan 4 ETB — pendiente de reposición. Notificar cuando lleguen.",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-18", "09:30"),
        by: "sistema",
      },
      {
        status: "pendiente_envio",
        date: _DT("2026-03-18", "11:00"),
        by: "admin",
      },
      {
        status: "enviado",
        date: _DT("2026-03-19", "08:45"),
        by: "admin",
        note: "GLS 7824561224 — envío parcial 6/10 unidades",
      },
    ],
  },
  // ── FAC-2026-00007 · cliente · enviado ───────────────────────────────────
  {
    id: "TCG-20260320-007",
    userId: "u6",
    userRole: "cliente",
    userName: "Isabel Fernández Morales",
    userEmail: "isabel.f@email.com",
    date: "2026-03-20",
    adminStatus: "enviado",
    trackingNumber: "7824561225",
    items: [
      {
        id: 30001,
        name: "Dragon Ball Super Card Game Fusion World Booster Box (24 sobres)",
        qty: 1,
        price: 89.95,
        game: "dragon-ball",
      },
      {
        id: 30002,
        name: "Dragon Ball Super Starter Deck FS04 — Bardock",
        qty: 2,
        price: 9.95,
        game: "dragon-ball",
      },
    ],
    subtotal: 109.85,
    shipping: 0,
    total: 109.85,
    address: "Calle Ancha 22, 1ºD, 08001 Barcelona",
    paymentMethod: "Bizum",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-20", "16:20"),
        by: "sistema",
      },
      {
        status: "pendiente_envio",
        date: _DT("2026-03-21", "09:00"),
        by: "admin",
      },
      {
        status: "enviado",
        date: _DT("2026-03-21", "14:30"),
        by: "admin",
        note: "GLS 7824561225",
      },
    ],
  },
  // ── FAC-2026-00008 · mayorista · enviado ─────────────────────────────────
  {
    id: "TCG-20260322-008",
    userId: "u9",
    userRole: "mayorista",
    userName: "Pedro Pérez (Juguetes Pérez S.A.)",
    userEmail: "distribuciones.perez@email.com",
    date: "2026-03-22",
    adminStatus: "enviado",
    trackingNumber: "7824561226",
    items: [
      {
        id: 10007,
        name: "Magic: The Gathering Bloomburrow Draft Booster Display",
        qty: 3,
        price: 81.96,
        game: "magic",
      },
      {
        id: 10002,
        name: "Naruto Mythos: Konoha Shidō Booster Box (24 sobres)",
        qty: 2,
        price: 65.56,
        game: "naruto",
      },
    ],
    subtotal: 377.0,
    shipping: 0,
    total: 377.0,
    address:
      "Polígono Industrial Can Parellada, Nave 15, 08228 Terrassa, Barcelona",
    paymentMethod: "Transferencia bancaria",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-22", "08:00"),
        by: "sistema",
      },
      {
        status: "pendiente_envio",
        date: _DT("2026-03-22", "11:30"),
        by: "admin",
      },
      {
        status: "enviado",
        date: _DT("2026-03-23", "09:00"),
        by: "admin",
        note: "GLS 7824561226",
      },
    ],
  },
  // ── FAC-2026-00009 · tienda · pendiente_envio ────────────────────────────
  {
    id: "TCG-20260325-009",
    userId: "u12",
    userRole: "tienda",
    userName: "Tomás García (Cards & Comics Madrid S.L.U.)",
    userEmail: "cards.madrid@email.com",
    date: "2026-03-25",
    adminStatus: "pendiente_envio",
    items: [
      {
        id: 10007,
        name: "Magic: The Gathering Bloomburrow Draft Booster Display",
        qty: 5,
        price: 85.46,
        game: "magic",
      },
    ],
    subtotal: 427.3,
    shipping: 0,
    total: 427.3,
    address: "Calle Fuencarral 78, 28004 Madrid",
    paymentMethod: "Tarjeta Visa ****1122",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-25", "10:00"),
        by: "sistema",
      },
      {
        status: "pendiente_envio",
        date: _DT("2026-03-25", "15:30"),
        by: "admin",
      },
    ],
  },
  // ── FAC-2026-00010 · mayorista · pendiente_envio ─────────────────────────
  {
    id: "TCG-20260326-010",
    userId: "demo_mayorista",
    userRole: "mayorista",
    userName: "Carlos López (Distribuciones López S.L.)",
    userEmail: "mayorista@test.com",
    date: "2026-03-26",
    adminStatus: "pendiente_envio",
    items: [
      {
        id: 20001,
        name: "Pokémon: Prismatic Evolutions Elite Trainer Box",
        qty: 8,
        price: 45.06,
        game: "pokemon",
      },
      {
        id: 20002,
        name: "Pokémon SV7 Stellar Crown Booster Display (36 sobres)",
        qty: 2,
        price: 81.96,
        game: "pokemon",
      },
    ],
    subtotal: 524.4,
    shipping: 0,
    total: 524.4,
    address: "Polígono Industrial, Calle B 12, 28850 Torrejón de Ardoz, Madrid",
    paymentMethod: "Transferencia bancaria",
    adminNotes:
      "Cliente VIP — envío siempre GLS Express. Confirmar disponibilidad Stellar Crown antes de preparar.",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-26", "09:15"),
        by: "sistema",
      },
      {
        status: "pendiente_envio",
        date: _DT("2026-03-26", "14:00"),
        by: "admin",
      },
    ],
  },
  // ── FAC-2026-00011 · tienda · pendiente_envio ────────────────────────────
  {
    id: "TCG-20260327-011",
    userId: "demo_tienda",
    userRole: "tienda",
    userName: "Ana Martínez (Game Zone Barcelona S.L.)",
    userEmail: "tienda@test.com",
    date: "2026-03-27",
    adminStatus: "pendiente_envio",
    items: [
      {
        id: 10008,
        name: "One Piece OP-09 500 Years in the Future Booster Display (24 sobres)",
        qty: 2,
        price: 85.46,
        game: "one-piece",
      },
      {
        id: 10009,
        name: "One Piece Starter Deck ST-21 Land of Wano",
        qty: 3,
        price: 12.71,
        game: "one-piece",
      },
    ],
    subtotal: 209.05,
    shipping: 0,
    total: 209.05,
    address: "Calle Comercio 45, 08003 Barcelona",
    paymentMethod: "Tarjeta Mastercard ****9876",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-27", "11:00"),
        by: "sistema",
      },
      {
        status: "pendiente_envio",
        date: _DT("2026-03-27", "16:45"),
        by: "admin",
      },
    ],
  },
  // ── FAC-2026-00012 · cliente · pagado (URGENTE > 48h) ────────────────────
  {
    id: "TCG-20260325-012",
    userId: "u5",
    userRole: "cliente",
    userName: "Miguel Torres Blanco",
    userEmail: "miguel.torres@email.com",
    date: "2026-03-25",
    adminStatus: "pendiente_envio",
    items: [
      {
        id: 10002,
        name: "Naruto Mythos: Konoha Shidō Booster Box (24 sobres)",
        qty: 1,
        price: 79.95,
        game: "naruto",
      },
      {
        id: 10010,
        name: "Naruto Starter Pack — Naruto Uzumaki",
        qty: 2,
        price: 14.95,
        game: "naruto",
      },
    ],
    subtotal: 109.85,
    shipping: 0,
    total: 109.85,
    address: "Avda. de la Constitución 8, 3ºA, 41001 Sevilla",
    paymentMethod: "Tarjeta Visa ****8899",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-25", "08:30"),
        by: "sistema",
      },
    ],
  },
  // ── FAC-2026-00013 · cliente · pagado ────────────────────────────────────
  {
    id: "TCG-20260327-013",
    userId: "demo_cliente",
    userRole: "cliente",
    userName: "Laura Sánchez García",
    userEmail: "cliente@test.com",
    date: "2026-03-27",
    adminStatus: "pendiente_envio",
    items: [
      {
        id: 10007,
        name: "Magic: The Gathering Bloomburrow Draft Booster Box (36 sobres)",
        qty: 1,
        price: 99.95,
        game: "magic",
      },
      {
        id: 10011,
        name: "Magic: The Gathering Bloomburrow Bundle",
        qty: 1,
        price: 44.95,
        game: "magic",
      },
    ],
    subtotal: 144.9,
    shipping: 0,
    total: 144.9,
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "PayPal",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-27", "19:12"),
        by: "sistema",
      },
    ],
  },
  // ── FAC-2026-00014 · cliente · pendiente (hoy, 2º pedido de Laura) ─────────
  {
    id: "TCG-20260328-014",
    userId: "demo_cliente",
    userRole: "cliente",
    userName: "Laura Sánchez García",
    userEmail: "cliente@test.com",
    date: "2026-03-28",
    adminStatus: "pendiente_envio",
    items: [
      {
        id: 20001,
        name: "Pokémon: Prismatic Evolutions Elite Trainer Box",
        qty: 1,
        price: 54.95,
        game: "pokemon",
      },
    ],
    subtotal: 54.95,
    shipping: 0,
    total: 54.95,
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "Bizum",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-28", "10:05"),
        by: "sistema",
      },
    ],
  },
  // ── FAC-2026-00015 · cliente · cancelado ─────────────────────────────────
  {
    id: "TCG-20260320-015",
    userId: "u3",
    userRole: "cliente",
    userName: "Pedro Fernández Ruiz",
    userEmail: "pedro.fernandez@email.com",
    date: "2026-03-20",
    adminStatus: "cancelado",
    items: [
      {
        id: 10003,
        name: "One Piece Card Game: Two Legends Booster Box (24 sobres)",
        qty: 2,
        price: 89.95,
        game: "onepiece",
      },
    ],
    subtotal: 179.9,
    shipping: 0,
    total: 179.9,
    address: "Calle Serrano 42, 1ºD, 28001 Madrid",
    paymentMethod: "Tarjeta Visa ****1234",
    adminNotes: "Cliente solicitó cancelación por duplicado accidental.",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-20", "09:00"),
        by: "sistema",
      },
      {
        status: "cancelado",
        date: _DT("2026-03-20", "14:30"),
        by: "admin",
        note: "Cancelado a petición del cliente",
      },
    ],
  },
  // ── FAC-2026-00016 · tienda · devolución ─────────────────────────────────
  {
    id: "TCG-20260310-016",
    userId: "u14",
    userRole: "tienda",
    userName: "Tienda Mágica Granada",
    userEmail: "info@tiendamagicagranada.com",
    date: "2026-03-10",
    adminStatus: "devolucion",
    items: [
      {
        id: 10005,
        name: "Dragon Ball Super Card Game: Zenkai Series 07 Booster Box",
        qty: 3,
        price: 74.95,
        game: "dragonball",
      },
    ],
    subtotal: 224.85,
    shipping: 0,
    total: 224.85,
    address: "Calle Recogidas 22, Local 3, 18005 Granada",
    paymentMethod: "Transferencia bancaria",
    adminNotes: "Producto llegó con desperfectos en el embalaje exterior.",
    statusHistory: [
      {
        status: "pendiente_envio",
        date: _DT("2026-03-10", "10:00"),
        by: "sistema",
      },
      {
        status: "enviado",
        date: _DT("2026-03-12", "15:00"),
        by: "admin",
        note: "GLS ES2026031200099",
      },
      { status: "enviado", date: _DT("2026-03-15", "11:00"), by: "sistema" },
      {
        status: "devolucion",
        date: _DT("2026-03-22", "09:30"),
        by: "admin",
        note: "Devolución aceptada por desperfectos",
      },
    ],
    trackingNumber: "ES2026031200099",
  },
];

// ─── Messages ─────────────────────────────────────────────────────────────────

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

export const MOCK_MESSAGES: AppMessage[] = [
  // ── Mensajes individuales admin ↔ cliente ─────────────────────────────────
  {
    id: "msg-001",
    fromUserId: "admin",
    toUserId: "demo_cliente",
    fromName: "TCG Academy",
    toName: "Laura Sánchez García",
    subject: "Tu pedido TCG-20260327-013 está siendo preparado",
    body: "Hola Laura,\n\nTu pedido TCG-20260327-013 está pendiente de envío y ya lo estamos preparando.\n\nTe notificaremos por aquí en cuanto sea enviado con el número de seguimiento GLS.\n\nMuchas gracias por tu confianza,\nEquipo TCG Academy",
    date: "2026-03-27T20:00:00",
    read: false,
    orderId: "TCG-20260327-013",
  },
  {
    id: "msg-002",
    fromUserId: "demo_mayorista",
    toUserId: "admin",
    fromName: "Carlos López (Distribuciones López S.L.)",
    toName: "TCG Academy",
    subject: "Consulta sobre disponibilidad de stock Stellar Crown",
    body: "Buenos días,\n\n¿Tenéis previsto reponer el stock de Pokémon Stellar Crown Display para la próxima semana? Necesitamos planificar el pedido del mes de abril.\n\nTambién queríamos preguntar si hay posibilidad de conseguir Bloomburrow Collector Booster en cantidades para nuestra red de distribución.\n\nQuedamos a la espera.\nSaludos,\nCarlos López\nDistribuciones López S.L.",
    date: "2026-03-26T10:30:00",
    read: false,
  },
  {
    id: "msg-003",
    fromUserId: "admin",
    toUserId: "demo_tienda",
    fromName: "TCG Academy",
    toName: "Ana Martínez (Game Zone Barcelona S.L.)",
    subject: "Condiciones especiales campaña Pokémon Prismatic Evolutions",
    body: "Hola Ana,\n\nDada tu fidelidad como tienda partner, te ofrecemos condiciones especiales para la nueva campaña de Pokémon Prismatic Evolutions: un 3% adicional sobre el precio de tiendas TCG en pedidos de 10+ unidades.\n\nEsta oferta es válida hasta el 30 de abril. Contacta con nosotros para reservar stock.\n\nUn saludo,\nEquipo TCG Academy",
    date: "2026-03-24T11:00:00",
    read: true,
  },
  // ── Mensajes generados por broadcasts (bc-001 → todos, bc-002 → mayoristas) ─
  {
    id: "msg-bc001-demo_cliente",
    fromUserId: "admin",
    toUserId: "demo_cliente",
    fromName: "TCG Academy",
    toName: "Laura Sánchez García",
    subject: "Nuevas expansiones Pokémon disponibles",
    body: "¡Hola Laura!\n\nYa están disponibles las últimas expansiones de Pokémon: Prismatic Evolutions y Surging Sparks. ¡Stocks limitados!\n\nEntra en nuestro catálogo para ver todos los productos disponibles.\n\nEquipo TCG Academy",
    date: "2026-03-23T09:00:00",
    read: true,
    isBroadcast: true,
    broadcastId: "bc-001",
  },
  {
    id: "msg-bc002-demo_mayorista",
    fromUserId: "admin",
    toUserId: "demo_mayorista",
    fromName: "TCG Academy",
    toName: "Carlos López (Distribuciones López S.L.)",
    subject: "Descuento exclusivo para mayoristas",
    body: "Estimado Carlos,\n\nDurante esta semana tienes un descuento adicional del 2% en todos los pedidos superiores a 500€. Válido hasta el 31 de marzo.\n\nNo dejes pasar esta oportunidad para reponer stock antes del cierre de mes.\n\nEquipo TCG Academy",
    date: "2026-03-26T10:00:00",
    read: false,
    isBroadcast: true,
    broadcastId: "bc-002",
  },
  {
    id: "msg-bc001-demo_tienda",
    fromUserId: "admin",
    toUserId: "demo_tienda",
    fromName: "TCG Academy",
    toName: "Ana Martínez (Game Zone Barcelona S.L.)",
    subject: "Nuevas expansiones Pokémon disponibles",
    body: "¡Hola Ana!\n\nYa están disponibles las últimas expansiones de Pokémon: Prismatic Evolutions y Surging Sparks. ¡Stocks limitados!\n\nEntra en nuestro catálogo para ver todos los productos disponibles.\n\nEquipo TCG Academy",
    date: "2026-03-23T09:00:00",
    read: true,
    isBroadcast: true,
    broadcastId: "bc-001",
  },
];

// Storage helpers for messages (client-side)
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

export const MOCK_BROADCASTS: Broadcast[] = [
  {
    id: "bc-001",
    subject: "Nuevas expansiones Pokémon disponibles",
    body: "¡Hola!\n\nYa están disponibles las últimas expansiones de Pokémon: Prismatic Evolutions y Surging Sparks. ¡Stocks limitados! No te quedes sin las tuyas.\n\nEntra en nuestro catálogo para ver todos los productos disponibles.\n\nEquipo TCG Academy",
    channel: "ambos",
    target: "todos",
    targetLabel: "Todos los usuarios",
    recipientCount: 13,
    date: "2026-03-23T09:00:00",
    sentBy: "admin",
  },
  {
    id: "bc-002",
    subject: "Descuento exclusivo para mayoristas",
    body: "Estimado mayorista,\n\nDurante esta semana tienes un descuento adicional del 2% en todos los pedidos superiores a 500€. Válido hasta el 31 de marzo.\n\nNo dejes pasar esta oportunidad para reponer stock antes del cierre de mes.\n\nEquipo TCG Academy",
    channel: "interno",
    target: "mayoristas",
    targetLabel: "Solo mayoristas",
    recipientCount: 4,
    date: "2026-03-26T10:00:00",
    sentBy: "admin",
  },
  {
    id: "bc-003",
    subject: "Actualización de precios Tiendas TCG",
    body: "Hola,\n\nTe informamos de una actualización en nuestra tarifa de precios para tiendas TCG. Los nuevos precios entrarán en vigor el 1 de abril.\n\nContacta con nosotros a través de este canal o llámanos para recibir la nueva lista de precios completa.\n\nEquipo TCG Academy",
    channel: "email",
    target: "tiendas",
    targetLabel: "Solo tiendas TCG",
    recipientCount: 4,
    date: "2026-03-27T14:00:00",
    sentBy: "admin",
  },
];

export const BROADCAST_STORAGE_KEY = "tcgacademy_broadcasts";

// ─── Extended sales data ───────────────────────────────────────────────────────

// ─── User growth ──────────────────────────────────────────────────────────────
export const MOCK_USERS_7D = [
  { day: "Lun", newUsers: 3, totalUsers: 91 },
  { day: "Mar", newUsers: 6, totalUsers: 97 },
  { day: "Mié", newUsers: 2, totalUsers: 99 },
  { day: "Jue", newUsers: 8, totalUsers: 107 },
  { day: "Vie", newUsers: 5, totalUsers: 112 },
  { day: "Sáb", newUsers: 9, totalUsers: 121 },
  { day: "Dom", newUsers: 4, totalUsers: 125 },
];
export const MOCK_USERS_30D = [
  { day: "06/03", newUsers: 4, totalUsers: 72 },
  { day: "08/03", newUsers: 7, totalUsers: 79 },
  { day: "10/03", newUsers: 3, totalUsers: 82 },
  { day: "12/03", newUsers: 9, totalUsers: 91 },
  { day: "14/03", newUsers: 5, totalUsers: 96 },
  { day: "16/03", newUsers: 6, totalUsers: 102 },
  { day: "18/03", newUsers: 2, totalUsers: 104 },
  { day: "20/03", newUsers: 8, totalUsers: 112 },
  { day: "22/03", newUsers: 4, totalUsers: 116 },
  { day: "24/03", newUsers: 11, totalUsers: 127 },
  { day: "26/03", newUsers: 3, totalUsers: 130 },
  { day: "28/03", newUsers: 7, totalUsers: 137 },
  { day: "30/03", newUsers: 5, totalUsers: 142 },
  { day: "01/04", newUsers: 10, totalUsers: 152 },
  { day: "04/04", newUsers: 6, totalUsers: 158 },
];
export const MOCK_USERS_3M = [
  { day: "Sem 1 Feb", newUsers: 18, totalUsers: 52 },
  { day: "Sem 2 Feb", newUsers: 24, totalUsers: 76 },
  { day: "Sem 3 Feb", newUsers: 15, totalUsers: 91 },
  { day: "Sem 4 Feb", newUsers: 31, totalUsers: 122 },
  { day: "Sem 1 Mar", newUsers: 19, totalUsers: 141 },
  { day: "Sem 2 Mar", newUsers: 28, totalUsers: 169 },
  { day: "Sem 3 Mar", newUsers: 22, totalUsers: 191 },
  { day: "Sem 4 Mar", newUsers: 35, totalUsers: 226 },
  { day: "Sem 1 Abr", newUsers: 17, totalUsers: 243 },
  { day: "Sem 2 Abr", newUsers: 41, totalUsers: 284 },
  { day: "Sem 3 Abr", newUsers: 26, totalUsers: 310 },
  { day: "Sem 4 Abr", newUsers: 38, totalUsers: 348 },
];

// ─── Product growth ───────────────────────────────────────────────────────────
export const MOCK_PRODUCTS_7D = [
  { day: "Lun", newProducts: 1, totalProducts: 118 },
  { day: "Mar", newProducts: 3, totalProducts: 121 },
  { day: "Mié", newProducts: 0, totalProducts: 121 },
  { day: "Jue", newProducts: 2, totalProducts: 123 },
  { day: "Vie", newProducts: 4, totalProducts: 127 },
  { day: "Sáb", newProducts: 1, totalProducts: 128 },
  { day: "Dom", newProducts: 0, totalProducts: 128 },
];
export const MOCK_PRODUCTS_30D = [
  { day: "06/03", newProducts: 2, totalProducts: 98 },
  { day: "08/03", newProducts: 4, totalProducts: 102 },
  { day: "10/03", newProducts: 1, totalProducts: 103 },
  { day: "12/03", newProducts: 5, totalProducts: 108 },
  { day: "14/03", newProducts: 0, totalProducts: 108 },
  { day: "16/03", newProducts: 3, totalProducts: 111 },
  { day: "18/03", newProducts: 6, totalProducts: 117 },
  { day: "20/03", newProducts: 1, totalProducts: 118 },
  { day: "22/03", newProducts: 2, totalProducts: 120 },
  { day: "24/03", newProducts: 4, totalProducts: 124 },
  { day: "26/03", newProducts: 0, totalProducts: 124 },
  { day: "28/03", newProducts: 3, totalProducts: 127 },
  { day: "30/03", newProducts: 1, totalProducts: 128 },
  { day: "01/04", newProducts: 2, totalProducts: 130 },
  { day: "04/04", newProducts: 1, totalProducts: 131 },
];
export const MOCK_PRODUCTS_3M = [
  { day: "Sem 1 Feb", newProducts: 8, totalProducts: 72 },
  { day: "Sem 2 Feb", newProducts: 12, totalProducts: 84 },
  { day: "Sem 3 Feb", newProducts: 6, totalProducts: 90 },
  { day: "Sem 4 Feb", newProducts: 14, totalProducts: 104 },
  { day: "Sem 1 Mar", newProducts: 7, totalProducts: 111 },
  { day: "Sem 2 Mar", newProducts: 9, totalProducts: 120 },
  { day: "Sem 3 Mar", newProducts: 5, totalProducts: 125 },
  { day: "Sem 4 Mar", newProducts: 11, totalProducts: 136 },
  { day: "Sem 1 Abr", newProducts: 4, totalProducts: 140 },
  { day: "Sem 2 Abr", newProducts: 13, totalProducts: 153 },
  { day: "Sem 3 Abr", newProducts: 8, totalProducts: 161 },
  { day: "Sem 4 Abr", newProducts: 15, totalProducts: 176 },
];

// ─── Discount usage ───────────────────────────────────────────────────────────
export const MOCK_DISCOUNTS_7D = [
  { day: "Lun", used: 5, redeemed: 2 },
  { day: "Mar", used: 9, redeemed: 4 },
  { day: "Mié", used: 3, redeemed: 1 },
  { day: "Jue", used: 14, redeemed: 7 },
  { day: "Vie", used: 11, redeemed: 5 },
  { day: "Sáb", used: 18, redeemed: 9 },
  { day: "Dom", used: 8, redeemed: 3 },
];
export const MOCK_DISCOUNTS_30D = [
  { day: "06/03", used: 6, redeemed: 2 },
  { day: "08/03", used: 10, redeemed: 5 },
  { day: "10/03", used: 4, redeemed: 1 },
  { day: "12/03", used: 15, redeemed: 8 },
  { day: "14/03", used: 9, redeemed: 4 },
  { day: "16/03", used: 13, redeemed: 6 },
  { day: "18/03", used: 7, redeemed: 3 },
  { day: "20/03", used: 19, redeemed: 10 },
  { day: "22/03", used: 8, redeemed: 4 },
  { day: "24/03", used: 22, redeemed: 12 },
  { day: "26/03", used: 11, redeemed: 5 },
  { day: "28/03", used: 16, redeemed: 7 },
  { day: "30/03", used: 9, redeemed: 4 },
  { day: "01/04", used: 24, redeemed: 14 },
  { day: "04/04", used: 14, redeemed: 6 },
];
export const MOCK_DISCOUNTS_3M = [
  { day: "Sem 1 Feb", used: 38, redeemed: 18 },
  { day: "Sem 2 Feb", used: 52, redeemed: 26 },
  { day: "Sem 3 Feb", used: 41, redeemed: 20 },
  { day: "Sem 4 Feb", used: 67, redeemed: 34 },
  { day: "Sem 1 Mar", used: 49, redeemed: 24 },
  { day: "Sem 2 Mar", used: 74, redeemed: 38 },
  { day: "Sem 3 Mar", used: 58, redeemed: 29 },
  { day: "Sem 4 Mar", used: 89, redeemed: 45 },
  { day: "Sem 1 Abr", used: 63, redeemed: 31 },
  { day: "Sem 2 Abr", used: 97, redeemed: 51 },
  { day: "Sem 3 Abr", used: 78, redeemed: 40 },
  { day: "Sem 4 Abr", used: 112, redeemed: 58 },
];

export const MOCK_SALES_30D = [
  { day: "06/03", sales: 380, orders: 3 },
  { day: "07/03", sales: 520, orders: 5 },
  { day: "08/03", sales: 290, orders: 2 },
  { day: "09/03", sales: 810, orders: 7 },
  { day: "10/03", sales: 640, orders: 6 },
  { day: "11/03", sales: 1120, orders: 11 },
  { day: "12/03", sales: 430, orders: 4 },
  { day: "13/03", sales: 760, orders: 7 },
  { day: "14/03", sales: 920, orders: 9 },
  { day: "15/03", sales: 340, orders: 3 },
  { day: "16/03", sales: 1080, orders: 10 },
  { day: "17/03", sales: 870, orders: 8 },
  { day: "18/03", sales: 1340, orders: 13 },
  { day: "19/03", sales: 590, orders: 5 },
  { day: "20/03", sales: 710, orders: 6 },
  { day: "21/03", sales: 980, orders: 9 },
  { day: "22/03", sales: 450, orders: 4 },
  { day: "23/03", sales: 1190, orders: 11 },
  { day: "24/03", sales: 820, orders: 8 },
  { day: "25/03", sales: 1560, orders: 15 },
  { day: "26/03", sales: 670, orders: 6 },
  { day: "27/03", sales: 420, orders: 4 },
  { day: "28/03", sales: 850, orders: 8 },
  { day: "29/03", sales: 320, orders: 3 },
  { day: "30/03", sales: 1240, orders: 12 },
  { day: "31/03", sales: 980, orders: 9 },
  { day: "01/04", sales: 1560, orders: 15 },
  { day: "02/04", sales: 740, orders: 7 },
  { day: "03/04", sales: 1090, orders: 10 },
  { day: "04/04", sales: 930, orders: 9 },
];

export const MOCK_SALES_3M = [
  { day: "Sem 1 Feb", sales: 3840, orders: 36 },
  { day: "Sem 2 Feb", sales: 5120, orders: 48 },
  { day: "Sem 3 Feb", sales: 4390, orders: 41 },
  { day: "Sem 4 Feb", sales: 6780, orders: 63 },
  { day: "Sem 1 Mar", sales: 5210, orders: 49 },
  { day: "Sem 2 Mar", sales: 7340, orders: 68 },
  { day: "Sem 3 Mar", sales: 6120, orders: 57 },
  { day: "Sem 4 Mar", sales: 8910, orders: 83 },
  { day: "Sem 1 Abr", sales: 7230, orders: 67 },
  { day: "Sem 2 Abr", sales: 9840, orders: 91 },
  { day: "Sem 3 Abr", sales: 8560, orders: 79 },
  { day: "Sem 4 Abr", sales: 11240, orders: 104 },
];

// ─── Datos anuales y todo ─────────────────────────────────────────────────────
export const MOCK_SALES_1Y = [
  { day: "May 24", sales: 18400, orders: 172 },
  { day: "Jun 24", sales: 21300, orders: 198 },
  { day: "Jul 24", sales: 16800, orders: 157 },
  { day: "Ago 24", sales: 14200, orders: 133 },
  { day: "Sep 24", sales: 22900, orders: 214 },
  { day: "Oct 24", sales: 31400, orders: 293 },
  { day: "Nov 24", sales: 38700, orders: 361 },
  { day: "Dic 24", sales: 52100, orders: 487 },
  { day: "Ene 25", sales: 28300, orders: 265 },
  { day: "Feb 25", sales: 24100, orders: 225 },
  { day: "Mar 25", sales: 29800, orders: 278 },
  { day: "Abr 25", sales: 34600, orders: 323 },
];
export const MOCK_SALES_ALL = [
  { day: "2023", sales: 89400, orders: 834 },
  { day: "T1 24", sales: 54200, orders: 506 },
  { day: "T2 24", sales: 68100, orders: 635 },
  { day: "T3 24", sales: 61800, orders: 577 },
  { day: "T4 24", sales: 138200, orders: 1290 },
  { day: "T1 25", sales: 82200, orders: 768 },
  { day: "Abr 25", sales: 34600, orders: 323 },
];
export const MOCK_USERS_1Y = [
  { day: "May 24", newUsers: 28, totalUsers: 18 },
  { day: "Jun 24", newUsers: 34, totalUsers: 52 },
  { day: "Jul 24", newUsers: 21, totalUsers: 73 },
  { day: "Ago 24", newUsers: 19, totalUsers: 92 },
  { day: "Sep 24", newUsers: 41, totalUsers: 133 },
  { day: "Oct 24", newUsers: 57, totalUsers: 190 },
  { day: "Nov 24", newUsers: 68, totalUsers: 258 },
  { day: "Dic 24", newUsers: 82, totalUsers: 340 },
  { day: "Ene 25", newUsers: 49, totalUsers: 389 },
  { day: "Feb 25", newUsers: 88, totalUsers: 477 },
  { day: "Mar 25", newUsers: 105, totalUsers: 582 },
  { day: "Abr 25", newUsers: 131, totalUsers: 713 },
];
export const MOCK_USERS_ALL = [
  { day: "2023", newUsers: 124, totalUsers: 124 },
  { day: "T1 24", newUsers: 87, totalUsers: 211 },
  { day: "T2 24", newUsers: 94, totalUsers: 305 },
  { day: "T3 24", newUsers: 78, totalUsers: 383 },
  { day: "T4 24", newUsers: 218, totalUsers: 601 },
  { day: "T1 25", newUsers: 242, totalUsers: 843 },
  { day: "Abr 25", newUsers: 131, totalUsers: 974 },
];
export const MOCK_PRODUCTS_1Y = [
  { day: "May 24", newProducts: 6, totalProducts: 42 },
  { day: "Jun 24", newProducts: 9, totalProducts: 51 },
  { day: "Jul 24", newProducts: 4, totalProducts: 55 },
  { day: "Ago 24", newProducts: 7, totalProducts: 62 },
  { day: "Sep 24", newProducts: 12, totalProducts: 74 },
  { day: "Oct 24", newProducts: 18, totalProducts: 92 },
  { day: "Nov 24", newProducts: 24, totalProducts: 116 },
  { day: "Dic 24", newProducts: 31, totalProducts: 147 },
  { day: "Ene 25", newProducts: 14, totalProducts: 161 },
  { day: "Feb 25", newProducts: 19, totalProducts: 180 },
  { day: "Mar 25", newProducts: 22, totalProducts: 202 },
  { day: "Abr 25", newProducts: 28, totalProducts: 230 },
];
export const MOCK_PRODUCTS_ALL = [
  { day: "2023", newProducts: 31, totalProducts: 31 },
  { day: "T1 24", newProducts: 22, totalProducts: 53 },
  { day: "T2 24", newProducts: 29, totalProducts: 82 },
  { day: "T3 24", newProducts: 25, totalProducts: 107 },
  { day: "T4 24", newProducts: 68, totalProducts: 175 },
  { day: "T1 25", newProducts: 55, totalProducts: 230 },
  { day: "Abr 25", newProducts: 28, totalProducts: 258 },
];
export const MOCK_DISCOUNTS_1Y = [
  { day: "May 24", used: 89, redeemed: 44 },
  { day: "Jun 24", used: 112, redeemed: 56 },
  { day: "Jul 24", used: 78, redeemed: 39 },
  { day: "Ago 24", used: 67, redeemed: 33 },
  { day: "Sep 24", used: 134, redeemed: 67 },
  { day: "Oct 24", used: 198, redeemed: 99 },
  { day: "Nov 24", used: 241, redeemed: 121 },
  { day: "Dic 24", used: 312, redeemed: 156 },
  { day: "Ene 25", used: 156, redeemed: 78 },
  { day: "Feb 25", used: 187, redeemed: 94 },
  { day: "Mar 25", used: 218, redeemed: 109 },
  { day: "Abr 25", used: 264, redeemed: 132 },
];
export const MOCK_DISCOUNTS_ALL = [
  { day: "2023", used: 423, redeemed: 211 },
  { day: "T1 24", used: 312, redeemed: 156 },
  { day: "T2 24", used: 389, redeemed: 194 },
  { day: "T3 24", used: 345, redeemed: 172 },
  { day: "T4 24", used: 867, redeemed: 434 },
  { day: "T1 25", used: 561, redeemed: 281 },
  { day: "Abr 25", used: 264, redeemed: 132 },
];

// ─── Top products ──────────────────────────────────────────────────────────────

export const MOCK_TOP_PRODUCTS = [
  {
    id: 5,
    name: "Pokémon Prismatic Evolutions ETB",
    game: "pokemon",
    units: 89,
    revenue: 3669.69,
    trend: +12,
  },
  {
    id: 3,
    name: "Magic: Bloomburrow Draft Booster Box",
    game: "magic",
    units: 54,
    revenue: 5732.64,
    trend: +8,
  },
  {
    id: 2,
    name: "Pokémon: Prismatic Evolutions Booster Box",
    game: "pokemon",
    units: 47,
    revenue: 5163.44,
    trend: +21,
  },
  {
    id: 8,
    name: "One Piece: OP10 Booster Box",
    game: "one-piece",
    units: 43,
    revenue: 2365.0,
    trend: -3,
  },
  {
    id: 1,
    name: "Naruto Mythos Booster Box",
    game: "naruto",
    units: 38,
    revenue: 2491.28,
    trend: +5,
  },
  {
    id: 12,
    name: "Dragon Ball SCG: Set 7 Booster",
    game: "dragonball",
    units: 31,
    revenue: 1023.0,
    trend: +14,
  },
  {
    id: 6,
    name: "Yu-Gi-Oh!: Rage of the Abyss Booster Box",
    game: "yugioh",
    units: 28,
    revenue: 2548.44,
    trend: -7,
  },
  {
    id: 4,
    name: "Lorcana: Archazia's Island Booster Box",
    game: "lorcana",
    units: 22,
    revenue: 1847.56,
    trend: +2,
  },
];

// ─── Revenue by game ───────────────────────────────────────────────────────────

export const MOCK_REVENUE_BY_GAME = [
  { game: "Pokémon", revenue: 12480, color: "#FFCC00", pct: 38 },
  { game: "Magic", revenue: 9320, color: "#9B4DCA", pct: 28 },
  { game: "One Piece", revenue: 4210, color: "#EF4444", pct: 13 },
  { game: "Yu-Gi-Oh!", revenue: 3180, color: "#F97316", pct: 10 },
  { game: "Naruto", revenue: 1840, color: "#EAB308", pct: 6 },
  { game: "Otros", revenue: 1730, color: "#94A3B8", pct: 5 },
];

// ─── Visits by Spanish province ───────────────────────────────────────────────

export interface ProvinceVisit {
  province: string;
  comunidad: string;
  visits: number;
  orders: number;
  revenue: number;
}

export const MOCK_PROVINCE_VISITS: ProvinceVisit[] = [
  {
    province: "Madrid",
    comunidad: "Madrid",
    visits: 8241,
    orders: 312,
    revenue: 28450,
  },
  {
    province: "Barcelona",
    comunidad: "Cataluña",
    visits: 6892,
    orders: 241,
    revenue: 22180,
  },
  {
    province: "Valencia",
    comunidad: "C. Valenciana",
    visits: 3214,
    orders: 118,
    revenue: 10920,
  },
  {
    province: "Sevilla",
    comunidad: "Andalucía",
    visits: 2891,
    orders: 97,
    revenue: 8740,
  },
  {
    province: "Zaragoza",
    comunidad: "Aragón",
    visits: 1820,
    orders: 63,
    revenue: 5810,
  },
  {
    province: "Málaga",
    comunidad: "Andalucía",
    visits: 1654,
    orders: 54,
    revenue: 4920,
  },
  {
    province: "Murcia",
    comunidad: "R. de Murcia",
    visits: 1421,
    orders: 48,
    revenue: 4380,
  },
  {
    province: "Alicante",
    comunidad: "C. Valenciana",
    visits: 1380,
    orders: 45,
    revenue: 4120,
  },
  {
    province: "Vizcaya",
    comunidad: "País Vasco",
    visits: 1290,
    orders: 43,
    revenue: 3980,
  },
  {
    province: "Valladolid",
    comunidad: "Castilla y León",
    visits: 1120,
    orders: 38,
    revenue: 3540,
  },
  {
    province: "Córdoba",
    comunidad: "Andalucía",
    visits: 980,
    orders: 32,
    revenue: 2890,
  },
  {
    province: "Palmas, Las",
    comunidad: "Canarias",
    visits: 910,
    orders: 29,
    revenue: 2640,
  },
  {
    province: "Coruña, A",
    comunidad: "Galicia",
    visits: 870,
    orders: 27,
    revenue: 2480,
  },
  {
    province: "Granada",
    comunidad: "Andalucía",
    visits: 841,
    orders: 26,
    revenue: 2320,
  },
  {
    province: "Asturias",
    comunidad: "Asturias",
    visits: 790,
    orders: 25,
    revenue: 2180,
  },
  {
    province: "Tarragona",
    comunidad: "Cataluña",
    visits: 720,
    orders: 23,
    revenue: 2040,
  },
  {
    province: "Santa Cruz de Tenerife",
    comunidad: "Canarias",
    visits: 698,
    orders: 22,
    revenue: 1980,
  },
  {
    province: "Cantabria",
    comunidad: "Cantabria",
    visits: 640,
    orders: 20,
    revenue: 1820,
  },
  {
    province: "Girona",
    comunidad: "Cataluña",
    visits: 610,
    orders: 19,
    revenue: 1720,
  },
  {
    province: "Toledo",
    comunidad: "Castilla-La Mancha",
    visits: 590,
    orders: 18,
    revenue: 1640,
  },
  {
    province: "Salamanca",
    comunidad: "Castilla y León",
    visits: 560,
    orders: 17,
    revenue: 1540,
  },
  {
    province: "Badajoz",
    comunidad: "Extremadura",
    visits: 520,
    orders: 16,
    revenue: 1440,
  },
  {
    province: "Guipúzcoa",
    comunidad: "País Vasco",
    visits: 498,
    orders: 15,
    revenue: 1380,
  },
  {
    province: "Navarra",
    comunidad: "Navarra",
    visits: 481,
    orders: 15,
    revenue: 1320,
  },
  {
    province: "León",
    comunidad: "Castilla y León",
    visits: 450,
    orders: 14,
    revenue: 1240,
  },
  {
    province: "Almería",
    comunidad: "Andalucía",
    visits: 430,
    orders: 13,
    revenue: 1180,
  },
  {
    province: "Castellón",
    comunidad: "C. Valenciana",
    visits: 410,
    orders: 12,
    revenue: 1120,
  },
  {
    province: "Huelva",
    comunidad: "Andalucía",
    visits: 390,
    orders: 12,
    revenue: 1080,
  },
  {
    province: "Burgos",
    comunidad: "Castilla y León",
    visits: 370,
    orders: 11,
    revenue: 1020,
  },
  {
    province: "Lleida",
    comunidad: "Cataluña",
    visits: 350,
    orders: 10,
    revenue: 960,
  },
  {
    province: "Albacete",
    comunidad: "Castilla-La Mancha",
    visits: 330,
    orders: 10,
    revenue: 920,
  },
  {
    province: "Logroño",
    comunidad: "La Rioja",
    visits: 312,
    orders: 9,
    revenue: 880,
  },
  {
    province: "Pontevedra",
    comunidad: "Galicia",
    visits: 298,
    orders: 9,
    revenue: 840,
  },
  {
    province: "Jaén",
    comunidad: "Andalucía",
    visits: 281,
    orders: 8,
    revenue: 800,
  },
  {
    province: "Cáceres",
    comunidad: "Extremadura",
    visits: 260,
    orders: 8,
    revenue: 760,
  },
  {
    province: "Álava",
    comunidad: "País Vasco",
    visits: 245,
    orders: 7,
    revenue: 720,
  },
  {
    province: "Ciudad Real",
    comunidad: "Castilla-La Mancha",
    visits: 230,
    orders: 7,
    revenue: 680,
  },
  {
    province: "Lugo",
    comunidad: "Galicia",
    visits: 218,
    orders: 6,
    revenue: 640,
  },
  {
    province: "Ourense",
    comunidad: "Galicia",
    visits: 198,
    orders: 6,
    revenue: 580,
  },
  {
    province: "Palencia",
    comunidad: "Castilla y León",
    visits: 185,
    orders: 5,
    revenue: 540,
  },
  {
    province: "Zamora",
    comunidad: "Castilla y León",
    visits: 172,
    orders: 5,
    revenue: 500,
  },
  {
    province: "Segovia",
    comunidad: "Castilla y León",
    visits: 160,
    orders: 4,
    revenue: 460,
  },
  {
    province: "Guadalajara",
    comunidad: "Castilla-La Mancha",
    visits: 148,
    orders: 4,
    revenue: 420,
  },
  {
    province: "Ávila",
    comunidad: "Castilla y León",
    visits: 135,
    orders: 4,
    revenue: 380,
  },
  {
    province: "Cuenca",
    comunidad: "Castilla-La Mancha",
    visits: 122,
    orders: 3,
    revenue: 340,
  },
  {
    province: "Huesca",
    comunidad: "Aragón",
    visits: 112,
    orders: 3,
    revenue: 320,
  },
  {
    province: "Teruel",
    comunidad: "Aragón",
    visits: 98,
    orders: 2,
    revenue: 280,
  },
  {
    province: "Soria",
    comunidad: "Castilla y León",
    visits: 85,
    orders: 2,
    revenue: 240,
  },
  {
    province: "Ceuta",
    comunidad: "Ceuta",
    visits: 72,
    orders: 2,
    revenue: 200,
  },
  {
    province: "Melilla",
    comunidad: "Melilla",
    visits: 61,
    orders: 1,
    revenue: 180,
  },
  {
    province: "Rioja, La",
    comunidad: "La Rioja",
    visits: 52,
    orders: 1,
    revenue: 160,
  },
  {
    province: "Baleares",
    comunidad: "I. Baleares",
    visits: 841,
    orders: 28,
    revenue: 2540,
  },
];

// ─── Traffic sources ───────────────────────────────────────────────────────────

export const MOCK_TRAFFIC_SOURCES = [
  { source: "Búsqueda orgánica", visits: 14521, pct: 35, color: "#2563eb" },
  { source: "Directo", visits: 11240, pct: 27, color: "#7c3aed" },
  { source: "Redes sociales", visits: 8320, pct: 20, color: "#ec4899" },
  { source: "Email marketing", visits: 4180, pct: 10, color: "#f59e0b" },
  { source: "Referidos", visits: 2490, pct: 6, color: "#10b981" },
  { source: "Otros", visits: 820, pct: 2, color: "#94a3b8" },
];

// ─── Devices ───────────────────────────────────────────────────────────────────

export const MOCK_DEVICES = [
  { device: "Móvil", visits: 20480, pct: 49, color: "#2563eb" },
  { device: "Escritorio", visits: 14620, pct: 35, color: "#7c3aed" },
  { device: "Tablet", visits: 6670, pct: 16, color: "#10b981" },
];

// ─── Top pages ─────────────────────────────────────────────────────────────────

export const MOCK_TOP_PAGES = [
  { page: "/", label: "Inicio", visits: 18420, bounce: 32 },
  { page: "/pokemon", label: "Pokémon", visits: 12840, bounce: 28 },
  { page: "/magic", label: "Magic: The Gathering", visits: 8920, bounce: 31 },
  { page: "/one-piece", label: "One Piece TCG", visits: 5640, bounce: 35 },
  { page: "/registro", label: "Registro", visits: 3210, bounce: 58 },
  { page: "/login", label: "Iniciar sesión", visits: 2890, bounce: 42 },
  { page: "/yugioh", label: "Yu-Gi-Oh!", visits: 2540, bounce: 37 },
  { page: "/mayoristas", label: "Mayoristas", visits: 1980, bounce: 22 },
  { page: "/tiendas", label: "Tiendas", visits: 1420, bounce: 45 },
  { page: "/eventos", label: "Eventos", visits: 980, bounce: 51 },
];

// ─── Hourly traffic ────────────────────────────────────────────────────────────

export const MOCK_HOURLY_TRAFFIC = [
  { hour: "00h", visits: 120 },
  { hour: "01h", visits: 80 },
  { hour: "02h", visits: 60 },
  { hour: "03h", visits: 45 },
  { hour: "04h", visits: 38 },
  { hour: "05h", visits: 52 },
  { hour: "06h", visits: 145 },
  { hour: "07h", visits: 320 },
  { hour: "08h", visits: 580 },
  { hour: "09h", visits: 890 },
  { hour: "10h", visits: 1240 },
  { hour: "11h", visits: 1480 },
  { hour: "12h", visits: 1320 },
  { hour: "13h", visits: 1180 },
  { hour: "14h", visits: 980 },
  { hour: "15h", visits: 1090 },
  { hour: "16h", visits: 1340 },
  { hour: "17h", visits: 1620 },
  { hour: "18h", visits: 1890 },
  { hour: "19h", visits: 2140 },
  { hour: "20h", visits: 2320 },
  { hour: "21h", visits: 1980 },
  { hour: "22h", visits: 1540 },
  { hour: "23h", visits: 820 },
];

// ─── Age distribution ─────────────────────────────────────────────────────────

export const MOCK_AGE_DISTRIBUTION = [
  { group: "13–17", users: 89, pct: 9, color: "#a78bfa" },
  { group: "18–24", users: 214, pct: 22, color: "#2563eb" },
  { group: "25–34", users: 312, pct: 32, color: "#0891b2" },
  { group: "35–44", users: 194, pct: 20, color: "#059669" },
  { group: "45–54", users: 107, pct: 11, color: "#d97706" },
  { group: "55+", users: 58, pct: 6, color: "#dc2626" },
];

// ─── Country visits ───────────────────────────────────────────────────────────

export interface CountryVisit {
  country: string;
  flag: string;
  visits: number;
  orders: number;
  revenue: number;
}

export const MOCK_COUNTRY_VISITS: CountryVisit[] = [
  { country: "España", flag: "🇪🇸", visits: 38420, orders: 1240, revenue: 48200 },
  { country: "Portugal", flag: "🇵🇹", visits: 2140, orders: 62, revenue: 2840 },
  { country: "México", flag: "🇲🇽", visits: 1820, orders: 21, revenue: 1240 },
  { country: "Argentina", flag: "🇦🇷", visits: 980, orders: 14, revenue: 820 },
  { country: "Francia", flag: "🇫🇷", visits: 720, orders: 8, revenue: 640 },
  { country: "Alemania", flag: "🇩🇪", visits: 540, orders: 5, revenue: 480 },
  { country: "Chile", flag: "🇨🇱", visits: 420, orders: 6, revenue: 360 },
  { country: "Colombia", flag: "🇨🇴", visits: 380, orders: 4, revenue: 280 },
  { country: "Reino Unido", flag: "🇬🇧", visits: 310, orders: 3, revenue: 240 },
  { country: "Otros", flag: "🌍", visits: 840, orders: 11, revenue: 620 },
];

// ─── Detailed traffic sources ─────────────────────────────────────────────────

export interface TrafficSourceDetail {
  source: string;
  channel: "search" | "direct" | "social" | "email" | "referral" | "other";
  visits: number;
  pct: number;
  color: string;
  icon: string; // emoji icon
}

export const MOCK_TRAFFIC_SOURCES_DETAIL: TrafficSourceDetail[] = [
  { source: "Google Orgánico", channel: "search",   visits: 11240, pct: 27, color: "#4285f4", icon: "🔍" },
  { source: "Directo",         channel: "direct",   visits: 11240, pct: 27, color: "#6b7280", icon: "🔗" },
  { source: "Instagram",       channel: "social",   visits: 4980,  pct: 12, color: "#e1306c", icon: "📸" },
  { source: "Email marketing", channel: "email",    visits: 4180,  pct: 10, color: "#f59e0b", icon: "📧" },
  { source: "Google Ads",      channel: "search",   visits: 3280,  pct: 8,  color: "#ea4335", icon: "📢" },
  { source: "Referidos",       channel: "referral", visits: 2490,  pct: 6,  color: "#10b981", icon: "🤝" },
  { source: "Facebook",        channel: "social",   visits: 2160,  pct: 5,  color: "#1877f2", icon: "👥" },
  { source: "TikTok",          channel: "social",   visits: 1490,  pct: 4,  color: "#010101", icon: "🎵" },
  { source: "YouTube",         channel: "social",   visits: 620,   pct: 1,  color: "#ff0000", icon: "▶️" },
  { source: "Twitter / X",     channel: "social",   visits: 410,   pct: 1,  color: "#14171a", icon: "🐦" },
  { source: "Otros",           channel: "other",    visits: 820,   pct: 2,  color: "#94a3b8", icon: "🌐" },
];
