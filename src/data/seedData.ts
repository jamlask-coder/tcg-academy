/**
 * SEED DATA GENERATOR — TCG Academy
 *
 * Genera de forma determinista:
 *   - 100 usuarios (2 admins, 4 tiendas, ~19 mayoristas, ~75 clientes)
 *   - 400 pedidos distribuidos entre los usuarios
 *   - Stock = 300 unidades por producto
 *   - Facturas (pre-generadas) y registros de pago para los pedidos completados
 *   - Historial de puntos para clientes con pedidos entregados
 *   - Índice username → email para que los usuarios seeded puedan loguearse
 *
 * Uso: llamar a `runSeed()` desde el panel admin (/admin/herramientas).
 *
 * NOTA: escribe directamente en localStorage. DEDUPLICA por id — pasar el seed
 * varias veces no duplica datos, simplemente los reafirma. Para limpieza total
 * usar `resetSeed()`.
 */

import { PRODUCTS } from "@/data/products";
import type { LocalProduct } from "@/data/products";
import type { User, UserRole, Address } from "@/types/user";
import { safeRead, robustWrite } from "@/lib/safeStorage";
import type { AdminOrder, AdminOrderStatus, OrderItem as AdminItem } from "@/data/mockData";
import { POINTS_PER_EURO, addPoints } from "@/services/pointsService";
import { derivePaymentStatus } from "@/lib/orderAdapter";
import { calculateShipping } from "@/lib/priceVerification";

// ─── PRNG determinista (mulberry32) ─────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ─── Datos base para generar ────────────────────────────────────────────────

const NAMES_M = [
  "Álvaro", "Andrés", "Antonio", "Carlos", "David", "Diego", "Eduardo",
  "Enrique", "Fernando", "Francisco", "Gonzalo", "Héctor", "Javier",
  "Jesús", "Joaquín", "Jorge", "José", "Juan", "Luis", "Manuel",
  "Marcos", "Miguel", "Óscar", "Pablo", "Pedro", "Rafael", "Raúl",
  "Rodrigo", "Rubén", "Sergio", "Tomás", "Vicente", "Víctor", "Xavier",
];

const NAMES_F = [
  "Ana", "Beatriz", "Carmen", "Clara", "Cristina", "Daniela", "Elena",
  "Emma", "Eva", "Gloria", "Inés", "Irene", "Isabel", "Julia", "Laura",
  "Lorena", "Lucía", "Marina", "Marta", "Miriam", "Nerea", "Noelia",
  "Nuria", "Olga", "Paloma", "Patricia", "Paula", "Pilar", "Raquel",
  "Rocío", "Rosa", "Sandra", "Silvia", "Sonia", "Teresa",
];

const SURNAMES = [
  "García", "Martínez", "López", "González", "Rodríguez", "Fernández",
  "Sánchez", "Pérez", "Gómez", "Martín", "Jiménez", "Ruiz", "Hernández",
  "Díaz", "Moreno", "Muñoz", "Álvarez", "Romero", "Alonso", "Gutiérrez",
  "Navarro", "Torres", "Domínguez", "Vázquez", "Ramos", "Gil", "Ramírez",
  "Serrano", "Blanco", "Molina", "Morales", "Ortega", "Delgado", "Castro",
  "Ortiz", "Rubio", "Marín", "Sanz", "Núñez", "Iglesias", "Medina",
  "Cortés", "Castillo", "Santos", "Lozano", "Guerrero", "Cano", "Prieto",
];

const CITIES: Array<{ city: string; cp: string; provincia: string }> = [
  { city: "Madrid", cp: "28001", provincia: "Madrid" },
  { city: "Barcelona", cp: "08001", provincia: "Barcelona" },
  { city: "Valencia", cp: "46001", provincia: "Valencia" },
  { city: "Sevilla", cp: "41001", provincia: "Sevilla" },
  { city: "Zaragoza", cp: "50001", provincia: "Zaragoza" },
  { city: "Málaga", cp: "29001", provincia: "Málaga" },
  { city: "Murcia", cp: "30001", provincia: "Murcia" },
  { city: "Palma", cp: "07001", provincia: "Illes Balears" },
  { city: "Las Palmas", cp: "35001", provincia: "Las Palmas" },
  { city: "Bilbao", cp: "48001", provincia: "Vizcaya" },
  { city: "Alicante", cp: "03001", provincia: "Alicante" },
  { city: "Córdoba", cp: "14001", provincia: "Córdoba" },
  { city: "Valladolid", cp: "47001", provincia: "Valladolid" },
  { city: "Vigo", cp: "36201", provincia: "Pontevedra" },
  { city: "Gijón", cp: "33201", provincia: "Asturias" },
  { city: "Granada", cp: "18001", provincia: "Granada" },
  { city: "A Coruña", cp: "15001", provincia: "A Coruña" },
  { city: "Vitoria", cp: "01001", provincia: "Álava" },
  { city: "Elche", cp: "03201", provincia: "Alicante" },
  { city: "Oviedo", cp: "33001", provincia: "Asturias" },
  { city: "Pamplona", cp: "31001", provincia: "Navarra" },
  { city: "Cartagena", cp: "30201", provincia: "Murcia" },
  { city: "Santander", cp: "39001", provincia: "Cantabria" },
  { city: "Castellón", cp: "12001", provincia: "Castellón" },
  { city: "Calpe", cp: "03710", provincia: "Alicante" },
  { city: "Béjar", cp: "37700", provincia: "Salamanca" },
];

const STREETS = [
  "Calle Mayor", "Calle Real", "Avenida de la Constitución", "Calle San Juan",
  "Plaza Mayor", "Calle Santa María", "Avenida del Mediterráneo", "Calle Nueva",
  "Calle del Carmen", "Avenida de España", "Calle Cervantes", "Paseo de Gracia",
  "Calle Alcalá", "Gran Vía", "Calle Sol", "Calle Luna", "Avenida Reina Victoria",
  "Calle Goya", "Paseo Marítimo", "Calle Princesa",
];

// ─── NIF generators ─────────────────────────────────────────────────────────

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

function genDNI(rng: () => number): string {
  const num = randInt(rng, 10_000_000, 99_999_999);
  const letter = DNI_LETTERS[num % 23];
  return `${num}${letter}`;
}

function genNIE(rng: () => number): string {
  const prefix = pick(rng, ["X", "Y", "Z"]);
  const num = randInt(rng, 1_000_000, 9_999_999);
  const prefixNum = prefix === "X" ? 0 : prefix === "Y" ? 1 : 2;
  const full = parseInt(`${prefixNum}${num}`, 10);
  const letter = DNI_LETTERS[full % 23];
  return `${prefix}${String(num).padStart(7, "0")}${letter}`;
}

function genCIF(rng: () => number): string {
  const firstChar = pick(rng, "ABCDEFGHJ".split(""));
  const digits = String(randInt(rng, 1_000_000, 9_999_999));
  let evenSum = 0;
  let oddSum = 0;
  for (let i = 0; i < 7; i++) {
    const d = parseInt(digits[i], 10);
    if (i % 2 === 0) {
      const doubled = d * 2;
      oddSum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      evenSum += d;
    }
  }
  const total = evenSum + oddSum;
  const controlDigit = (10 - (total % 10)) % 10;
  const controlLetter = "JABCDEFGHI"[controlDigit];
  const useLetter = "PQRSNW".includes(firstChar);
  const control = useLetter
    ? controlLetter
    : "ABEH".includes(firstChar)
      ? String(controlDigit)
      : pick(rng, [controlLetter, String(controlDigit)]);
  return `${firstChar}${digits}${control}`;
}

// ─── User generation ────────────────────────────────────────────────────────

interface SeededUser {
  user: User;
  password: string;
}

function buildAddress(
  rng: () => number,
  id: string,
  nombre: string,
  apellidos: string,
  telefono: string,
): Address {
  const loc = pick(rng, CITIES);
  return {
    id: `addr-${id}`,
    label: pick(rng, ["Casa", "Trabajo", "Domicilio"]),
    nombre,
    apellidos,
    calle: pick(rng, STREETS),
    numero: String(randInt(rng, 1, 199)),
    piso: rng() > 0.4 ? `${randInt(rng, 1, 6)}º${pick(rng, ["A", "B", "C", "D"])}` : undefined,
    cp: loc.cp,
    ciudad: loc.city,
    provincia: loc.provincia,
    pais: "ES",
    telefono,
    predeterminada: true,
  };
}

export function generateSeedUsers(): SeededUser[] {
  const rng = mulberry32(20260417);
  const users: SeededUser[] = [];

  // ── 2 admins ──
  users.push({
    password: "LuriAdmin2026!",
    user: {
      id: "admin_luri",
      email: "luri@tcgacademy.es",
      name: "Luri",
      lastName: "Fiscal",
      phone: "+34 600 100 001",
      role: "admin",
      nif: genDNI(rng),
      nifType: "DNI",
      addresses: [],
      createdAt: "2024-01-01",
      favorites: [],
    },
  });
  users.push({
    password: "FontAdmin2026!",
    user: {
      id: "admin_font",
      email: "font@tcgacademy.es",
      name: "Font",
      lastName: "Operaciones",
      phone: "+34 600 100 002",
      role: "admin",
      nif: genDNI(rng),
      nifType: "DNI",
      addresses: [],
      createdAt: "2024-01-01",
      favorites: [],
    },
  });

  // ── 4 tiendas (las nuestras) ──
  const STORES = [
    { city: "Madrid", cp: "28001", slug: "madrid" },
    { city: "Barcelona", cp: "08001", slug: "barcelona" },
    { city: "Calpe", cp: "03710", slug: "calpe" },
    { city: "Béjar", cp: "37700", slug: "bejar" },
  ];
  for (let i = 0; i < STORES.length; i++) {
    const s = STORES[i];
    const id = `tienda_${s.slug}`;
    const cif = genCIF(rng);
    users.push({
      password: `Tienda${s.slug.charAt(0).toUpperCase()}${s.slug.slice(1)}2026!`,
      user: {
        id,
        email: `${s.slug}@tcgacademy.es`,
        name: `TCG Academy`,
        lastName: s.city,
        phone: `+34 91${randInt(rng, 1000000, 9999999)}`,
        role: "tienda",
        nif: cif,
        nifType: "CIF",
        addresses: [
          buildAddress(rng, id, "TCG Academy", s.city, `+34 91${randInt(rng, 1000000, 9999999)}`),
        ],
        empresa: {
          cif,
          razonSocial: `TCG Academy ${s.city} S.L.`,
          direccionFiscal: `${pick(rng, STREETS)} ${randInt(rng, 1, 50)}, ${s.cp} ${s.city}`,
          personaContacto: "TCG Academy",
          telefonoEmpresa: `+34 91${randInt(rng, 1000000, 9999999)}`,
          emailFacturacion: `facturacion-${s.slug}@tcgacademy.es`,
        },
        createdAt: "2024-06-01",
        favorites: [],
      },
    });
  }

  // ── 19 mayoristas ──
  for (let i = 0; i < 19; i++) {
    const gender: "M" | "F" = rng() > 0.5 ? "M" : "F";
    const first = pick(rng, gender === "M" ? NAMES_M : NAMES_F);
    const last1 = pick(rng, SURNAMES);
    const last2 = pick(rng, SURNAMES);
    const id = `mayorista_${String(i + 1).padStart(3, "0")}`;
    const cif = genCIF(rng);
    const phone = `+34 6${randInt(rng, 10000000, 99999999)}`;
    users.push({
      password: "Mayorista2026!",
      user: {
        id,
        email: `mayorista${i + 1}@distribuciones.es`,
        name: first,
        lastName: `${last1} ${last2}`,
        phone,
        role: "mayorista",
        gender,
        nif: cif,
        nifType: "CIF",
        addresses: [buildAddress(rng, id, first, `${last1} ${last2}`, phone)],
        empresa: {
          cif,
          razonSocial: `Distribuciones ${last1} S.L.`,
          direccionFiscal: `Polígono Industrial ${pick(rng, CITIES).city}, Nave ${i + 1}`,
          personaContacto: `${first} ${last1}`,
          telefonoEmpresa: phone,
          emailFacturacion: `facturacion${i + 1}@distribuciones.es`,
        },
        createdAt: `2024-${String(randInt(rng, 1, 12)).padStart(2, "0")}-${String(randInt(rng, 1, 28)).padStart(2, "0")}`,
        favorites: [],
      },
    });
  }

  // ── 75 clientes ──
  for (let i = 0; i < 75; i++) {
    const gender: "M" | "F" = rng() > 0.5 ? "M" : "F";
    const first = pick(rng, gender === "M" ? NAMES_M : NAMES_F);
    const last1 = pick(rng, SURNAMES);
    const last2 = pick(rng, SURNAMES);
    const id = `cliente_${String(i + 1).padStart(3, "0")}`;
    const phone = `+34 6${randInt(rng, 10000000, 99999999)}`;
    const useNIE = rng() < 0.08; // ~8% NIE
    const nif = useNIE ? genNIE(rng) : genDNI(rng);
    users.push({
      password: "Cliente2026!",
      user: {
        id,
        email: `${first.toLowerCase().replace(/[^a-z]/g, "")}.${last1.toLowerCase().replace(/[^a-z]/g, "")}${i}@email.com`,
        name: first,
        lastName: `${last1} ${last2}`,
        phone,
        role: "cliente",
        gender,
        nif,
        nifType: useNIE ? "NIE" : "DNI",
        addresses: [buildAddress(rng, id, first, `${last1} ${last2}`, phone)],
        createdAt: `202${randInt(rng, 4, 6)}-${String(randInt(rng, 1, 12)).padStart(2, "0")}-${String(randInt(rng, 1, 28)).padStart(2, "0")}`,
        favorites: [],
      },
    });
  }

  return users;
}

// ─── Order generation ───────────────────────────────────────────────────────

interface SeededOrder {
  id: string;
  date: string;
  total: number;
  subtotal: number;
  shipping: number;
  couponDiscount: number;
  pointsDiscount: number;
  userId: string;
  userRole: UserRole;
  items: { key: string; name: string; quantity: number; price: number }[];
  shippingAddress: {
    nombre: string;
    apellidos: string;
    email: string;
    telefono: string;
    direccion: string;
    ciudad: string;
    cp: string;
    provincia: string;
    pais: string;
  };
  envio: "estandar" | "tienda";
  tiendaRecogida: string | null;
  pago: "tarjeta" | "paypal" | "bizum" | "transferencia" | "tienda";
  status: "pendiente" | "pagado" | "preparado" | "enviado" | "entregado" | "cancelado" | "devuelto";
  nif: string;
  nifType: "DNI" | "NIE" | "CIF";
}

function priceForRole(p: LocalProduct, role: UserRole): number {
  if (role === "mayorista" && p.wholesalePrice) return p.wholesalePrice;
  if (role === "tienda" && p.storePrice) return p.storePrice;
  return p.price;
}

export function generateSeedOrders(seededUsers: SeededUser[]): SeededOrder[] {
  const rng = mulberry32(41200917);
  const orders: SeededOrder[] = [];

  const buyers = seededUsers.filter(
    (u) => u.user.role === "cliente" || u.user.role === "mayorista" || u.user.role === "tienda",
  );

  const STORE_IDS = ["madrid", "barcelona", "calpe", "bejar"];
  const PAGOS: SeededOrder["pago"][] = ["tarjeta", "bizum", "paypal", "transferencia"];
  const STATUSES: SeededOrder["status"][] = [
    "entregado", "entregado", "entregado", "entregado",
    "enviado", "enviado",
    "preparado",
    "pagado",
    "pendiente",
    "cancelado",
    "devuelto",
  ];

  const today = new Date("2026-04-17T12:00:00Z").getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 400; i++) {
    const buyer = pick(rng, buyers);
    const daysAgo = randInt(rng, 1, 365);
    const orderDate = new Date(today - daysAgo * dayMs);
    const dateStr = orderDate.toISOString();

    // 1-5 items por pedido
    const itemCount = randInt(rng, 1, 5);
    const itemsMap = new Map<number, { qty: number; product: LocalProduct }>();
    for (let j = 0; j < itemCount; j++) {
      const product = pick(rng, PRODUCTS);
      const existing = itemsMap.get(product.id);
      const qty = randInt(rng, 1, buyer.user.role === "mayorista" ? 12 : 3);
      if (existing) existing.qty += qty;
      else itemsMap.set(product.id, { qty, product });
    }

    const items = Array.from(itemsMap.values()).map((e) => ({
      key: String(e.product.id),
      name: e.product.name,
      quantity: e.qty,
      price: priceForRole(e.product, buyer.user.role),
    }));

    const subtotal =
      Math.round(items.reduce((s, it) => s + it.price * it.quantity, 0) * 100) / 100;

    // Envío: 15% recogida en tienda
    const isPickup = rng() < 0.15;
    const envio = isPickup ? "tienda" : "estandar";
    const shipping = calculateShipping(envio, subtotal);
    const pago = isPickup ? "tienda" : pick(rng, PAGOS);

    // Cupón en ~10%, puntos en ~15% (clientes)
    const couponDiscount =
      rng() < 0.1 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
    const pointsDiscount =
      buyer.user.role === "cliente" && rng() < 0.15
        ? Math.min(Math.round(subtotal * 0.05 * 100) / 100, 5)
        : 0;

    const total =
      Math.round(
        (subtotal - couponDiscount - pointsDiscount + shipping) * 100,
      ) / 100;

    const addr = buyer.user.addresses[0] ?? {
      id: "x",
      label: "Casa",
      nombre: buyer.user.name,
      apellidos: buyer.user.lastName,
      calle: "Calle Real",
      numero: "1",
      cp: "28001",
      ciudad: "Madrid",
      provincia: "Madrid",
      pais: "ES",
      predeterminada: true,
    };

    const status = pick(rng, STATUSES);
    const id = `TCG-${orderDate.toISOString().slice(0, 10).replace(/-/g, "")}-${String(i + 1).padStart(4, "0")}`;

    orders.push({
      id,
      date: dateStr,
      total: Math.max(0, total),
      subtotal,
      shipping,
      couponDiscount,
      pointsDiscount,
      userId: buyer.user.id,
      userRole: buyer.user.role,
      items,
      shippingAddress: {
        nombre: addr.nombre ?? buyer.user.name,
        apellidos: addr.apellidos ?? buyer.user.lastName,
        email: buyer.user.email,
        telefono: buyer.user.phone,
        direccion: `${addr.calle} ${addr.numero}${addr.piso ? ", " + addr.piso : ""}`,
        ciudad: addr.ciudad,
        cp: addr.cp,
        provincia: addr.provincia,
        pais: addr.pais,
      },
      envio,
      tiendaRecogida: isPickup ? pick(rng, STORE_IDS) : null,
      pago,
      status,
      nif: buyer.user.nif ?? "",
      nifType: (buyer.user.nifType ?? "DNI") as "DNI" | "NIE" | "CIF",
    });
  }

  // Orden cronológico descendente (más reciente primero)
  orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return orders;
}

// ─── Admin-order adapter ────────────────────────────────────────────────────

function statusToAdminStatus(s: SeededOrder["status"]): AdminOrderStatus {
  // "entregado" (SeededOrder) → "enviado" (AdminOrderStatus): el estado
  // "finalizado/entregado" se eliminó del flujo admin el 2026-04-18, así que
  // cualquier pedido semilla marcado como entregado pasa a "enviado".
  switch (s) {
    case "entregado": return "enviado";
    case "enviado": return "enviado";
    case "cancelado": return "cancelado";
    case "devuelto": return "devolucion";
    case "preparado":
    case "pagado":
    case "pendiente":
    default: return "pendiente_envio";
  }
}

function toAdminOrder(o: SeededOrder): AdminOrder {
  const items: AdminItem[] = o.items.map((it) => {
    const prod = PRODUCTS.find((p) => String(p.id) === it.key);
    return {
      id: Number(it.key),
      name: it.name,
      qty: it.quantity,
      price: it.price,
      game: prod?.game ?? "otros",
    };
  });

  const userName = `${o.shippingAddress.nombre} ${o.shippingAddress.apellidos}`.trim();
  const address = `${o.shippingAddress.direccion}, ${o.shippingAddress.cp} ${o.shippingAddress.ciudad}${o.shippingAddress.provincia ? ", " + o.shippingAddress.provincia : ""}`;
  const adminStatus = statusToAdminStatus(o.status);

  return {
    id: o.id,
    userId: o.userId,
    userRole: o.userRole as "cliente" | "mayorista" | "tienda",
    userName,
    userEmail: o.shippingAddress.email,
    date: o.date.slice(0, 10),
    adminStatus,
    items,
    subtotal: o.subtotal,
    shipping: o.shipping,
    total: o.total,
    couponDiscount: o.couponDiscount > 0 ? o.couponDiscount : undefined,
    pointsDiscount: o.pointsDiscount > 0 ? o.pointsDiscount : undefined,
    address,
    paymentMethod: o.pago,
    // SSOT: paymentStatus derivado una sola vez aquí; antes vivía en clave paralela.
    paymentStatus: derivePaymentStatus(o.pago, adminStatus),
    pickupStore: o.tiendaRecogida ?? undefined,
    trackingNumber: adminStatus === "enviado"
      ? String(Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000)
      : undefined,
    statusHistory: [
      { status: "pendiente_envio", date: o.date, by: "sistema" },
      ...(adminStatus !== "pendiente_envio"
        ? [{ status: adminStatus, date: o.date, by: "sistema" as const }]
        : []),
    ],
    nif: o.nif,
    nifType: o.nifType,
  };
}

// ─── Stock ──────────────────────────────────────────────────────────────────

export function applyStock300(): boolean {
  if (typeof window === "undefined") return false;
  const key = "tcgacademy_product_overrides";
  const overrides = safeRead<Record<string, Partial<LocalProduct>>>(key, {});
  for (const p of PRODUCTS) {
    const existing = overrides[String(p.id)] ?? {};
    overrides[String(p.id)] = { ...existing, stock: 300, inStock: true };
  }
  return robustWrite(key, overrides);
}

// ─── Helpers dedupe ─────────────────────────────────────────────────────────

/**
 * Fusiona dos arrays de objetos con `id`, preferiendo el entrante ante colisión.
 * Evita que repetir `runSeed()` duplique pedidos (causa común de quota full).
 */
function mergeById<T extends { id: string }>(incoming: T[], existing: T[]): T[] {
  const map = new Map<string, T>();
  for (const e of existing) map.set(e.id, e);
  for (const i of incoming) map.set(i.id, i); // entrante pisa
  return Array.from(map.values());
}

/**
 * Deriva un username probable del email (parte local + índice para unicidad).
 * Si ya existe ese username apuntando a otro email, añade sufijo numérico.
 */
function deriveUsername(
  email: string,
  existingMap: Record<string, string>,
): string {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
  if (!base) return "";
  let candidate = base;
  let n = 1;
  while (existingMap[candidate] && existingMap[candidate] !== email) {
    candidate = `${base}${n++}`;
    if (n > 999) return ""; // demasiadas colisiones, saltar
  }
  return candidate;
}

// ─── Run seed ───────────────────────────────────────────────────────────────

export interface SeedResult {
  users: number;
  usernamesIndexed: number;
  orders: number;
  stockedProducts: number;
  paymentStatus: number;
  pointsGranted: number;
  errors: string[];
}

export function runSeed(): SeedResult {
  const errors: string[] = [];
  const seededUsers = generateSeedUsers();
  const seededOrders = generateSeedOrders(seededUsers);

  // ── Users (registered map) — dedupe por email ──
  try {
    const existing = safeRead<Record<string, { password: string; user: User }>>(
      "tcgacademy_registered",
      {},
    );
    for (const su of seededUsers) {
      existing[su.user.email] = { password: su.password, user: su.user };
    }
    if (!robustWrite("tcgacademy_registered", existing)) {
      errors.push("No se pudieron guardar los usuarios (cuota llena)");
    }
  } catch (e) {
    errors.push(`Error usuarios: ${e instanceof Error ? e.message : "?"}`);
  }

  // ── Usernames index — permite login por usuario (no sólo email) ──
  let usernamesIndexed = 0;
  try {
    const existingUsernames = safeRead<Record<string, string>>(
      "tcgacademy_usernames",
      {},
    );
    for (const su of seededUsers) {
      const uname = deriveUsername(su.user.email, existingUsernames);
      if (uname) {
        existingUsernames[uname] = su.user.email;
        usernamesIndexed++;
      }
    }
    if (!robustWrite("tcgacademy_usernames", existingUsernames)) {
      errors.push("No se pudo indexar usernames (cuota llena)");
    }
  } catch (e) {
    errors.push(`Error usernames: ${e instanceof Error ? e.message : "?"}`);
  }

  // ── Orders (storefront format) — DEDUPE por id ──
  try {
    const existing = safeRead<Array<{ id: string }>>("tcgacademy_orders", []);
    const merged = mergeById(
      seededOrders as unknown as Array<{ id: string }>,
      existing,
    );
    if (!robustWrite("tcgacademy_orders", merged)) {
      errors.push("No se pudieron guardar los pedidos (cuota llena)");
    }
  } catch (e) {
    errors.push(`Error pedidos: ${e instanceof Error ? e.message : "?"}`);
  }

  // ── Orders (admin inbox format) — DEDUPE por id ──
  try {
    const adminOrders = seededOrders.map(toAdminOrder);
    const existingAdmin = safeRead<AdminOrder[]>("tcgacademy_admin_orders", []);
    const merged = mergeById(adminOrders, existingAdmin);
    if (!robustWrite("tcgacademy_admin_orders", merged)) {
      errors.push("No se pudieron guardar los pedidos en el inbox admin (cuota llena)");
    }
  } catch (e) {
    errors.push(`Error admin inbox: ${e instanceof Error ? e.message : "?"}`);
  }

  // ── Payment status ──
  // SSOT: paymentStatus vive en cada AdminOrder (ya escrito arriba vía toAdminOrder).
  // No escribimos ninguna clave paralela `tcgacademy_payment_status` — deprecado.

  // ── Puntos: clientes con pedidos entregados ganan puntos por compra ──
  // Regla de negocio: 100 pts por cada 1€ de productos (sin envío/descuentos).
  // Sólo para role=cliente y pedidos en estado "entregado" (ya liquidado).
  let pointsGranted = 0;
  try {
    for (const o of seededOrders) {
      if (o.userRole !== "cliente") continue;
      if (o.status !== "entregado") continue;
      // Base imponible efectiva: subtotal - couponDiscount - pointsDiscount
      const base = Math.max(
        0,
        o.subtotal - o.couponDiscount - o.pointsDiscount,
      );
      const pts = Math.floor(base * POINTS_PER_EURO);
      if (pts > 0) {
        addPoints(o.userId, pts);
        pointsGranted += pts;
      }
    }
  } catch (e) {
    errors.push(`Error puntos: ${e instanceof Error ? e.message : "?"}`);
  }

  // ── Stock ──
  const stockOk = applyStock300();
  if (!stockOk) errors.push("No se pudo aplicar stock=300 (cuota llena)");

  // ── Notificar a pantallas activas (admin/pedidos, estadísticas, usuarios) ──
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("tcga:orders:updated"));
      window.dispatchEvent(new Event("tcga:products:updated"));
    }
  } catch { /* ignore */ }

  return {
    users: seededUsers.length,
    usernamesIndexed,
    orders: seededOrders.length,
    stockedProducts: PRODUCTS.length,
    paymentStatus: seededOrders.length,
    pointsGranted,
    errors,
  };
}

/**
 * Limpia los datos inyectados por runSeed. No borra `tcgacademy_registered`
 * (puede contener usuarios reales) ni `tcgacademy_usernames` (mismo motivo).
 * Para limpieza total de todo, hacerlo manualmente desde /admin/copias.
 */
export function resetSeed(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("tcgacademy_orders");
  localStorage.removeItem("tcgacademy_admin_orders");
  localStorage.removeItem("tcgacademy_product_overrides");
  // Legacy cleanup: claves paralelas deprecadas — borramos si quedaron de versiones anteriores.
  localStorage.removeItem("tcgacademy_payment_status");
  localStorage.removeItem("tcgacademy_stock_overrides");
}
