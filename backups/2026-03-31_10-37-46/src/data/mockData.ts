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
        name: "Naruto Mythos: Konoha Shido Booster Box (24 sobres)",
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
        description: "Naruto Mythos: Konoha Shido Booster Box",
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
    startsAt: "2025-01-01",
    endsAt: "2025-12-31",
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
    startsAt: "2025-01-01",
    endsAt: "2025-06-30",
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
    startsAt: "2025-02-01",
    endsAt: "2025-03-31",
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

export const POINTS_REDEMPTION_TABLE = [
  { points: 100, euros: 1.0 },
  { points: 250, euros: 2.75 },
  { points: 500, euros: 6.0 },
  { points: 1000, euros: 13.0 },
  { points: 2000, euros: 28.0 },
];

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | "pedido"
  | "envio"
  | "cupon"
  | "puntos"
  | "oferta"
  | "devolucion"
  | "sistema";

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
    email: "admin@tcgacademy.com",
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
  | "pagado" // just paid, not yet processed
  | "pendiente_envio" // being prepared
  | "enviado" // shipped with tracking
  | "finalizado" // delivered
  | "incidencia"; // incident open

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
  trackingNumber?: string;
  address: string;
  paymentMethod: string;
  pickupStore?: string; // nombre tienda si es recogida en tienda
  incident?: OrderIncident;
  adminNotes?: string;
  statusHistory: StatusEntry[];
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
    adminStatus: "finalizado",
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
      { status: "pagado", date: _DT("2026-03-01", "10:15"), by: "sistema" },
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
        status: "finalizado",
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
    adminStatus: "finalizado",
    trackingNumber: "7824561221",
    items: [
      {
        id: 10002,
        name: "Naruto Mythos: Konoha Shido Booster Box (24 sobres)",
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
      { status: "pagado", date: _DT("2026-03-05", "09:00"), by: "sistema" },
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
        status: "finalizado",
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
    adminStatus: "finalizado",
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
      { status: "pagado", date: _DT("2026-03-08", "15:40"), by: "sistema" },
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
        status: "finalizado",
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
      { status: "pagado", date: _DT("2026-03-10", "10:00"), by: "sistema" },
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
      { status: "pagado", date: _DT("2026-03-12", "08:00"), by: "sistema" },
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
      { status: "pagado", date: _DT("2026-03-18", "09:30"), by: "sistema" },
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
      { status: "pagado", date: _DT("2026-03-20", "16:20"), by: "sistema" },
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
        name: "Naruto Mythos: Konoha Shido Booster Box (24 sobres)",
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
      { status: "pagado", date: _DT("2026-03-22", "08:00"), by: "sistema" },
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
      { status: "pagado", date: _DT("2026-03-25", "10:00"), by: "sistema" },
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
      { status: "pagado", date: _DT("2026-03-26", "09:15"), by: "sistema" },
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
      { status: "pagado", date: _DT("2026-03-27", "11:00"), by: "sistema" },
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
    adminStatus: "pagado",
    items: [
      {
        id: 10002,
        name: "Naruto Mythos: Konoha Shido Booster Box (24 sobres)",
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
      { status: "pagado", date: _DT("2026-03-25", "08:30"), by: "sistema" },
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
    adminStatus: "pagado",
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
      { status: "pagado", date: _DT("2026-03-27", "19:12"), by: "sistema" },
    ],
  },
  // ── FAC-2026-00014 · cliente · pagado (hoy, 2º pedido de Laura) ──────────
  {
    id: "TCG-20260328-014",
    userId: "demo_cliente",
    userRole: "cliente",
    userName: "Laura Sánchez García",
    userEmail: "cliente@test.com",
    date: "2026-03-28",
    adminStatus: "pagado",
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
      { status: "pagado", date: _DT("2026-03-28", "10:05"), by: "sistema" },
    ],
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
    body: "Hola Laura,\n\nTu pedido TCG-20260327-013 ha sido registrado correctamente y ya lo estamos preparando.\n\nTe notificaremos por aquí en cuanto sea enviado con el número de seguimiento GLS.\n\nMuchas gracias por tu confianza,\nEquipo TCG Academy",
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
