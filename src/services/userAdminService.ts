/**
 * Admin user service — edición y trazabilidad de datos personales.
 *
 * Fuentes de datos:
 * - `tcgacademy_registered` → usuarios reales (shape `User` completo)
 * - `MOCK_USERS` → demo / seed (shape `AdminUser`, se sintetiza a `User`)
 * - `tcgacademy_user_overrides` → overlay del admin por encima de las dos anteriores
 *
 * Cambios hechos desde el admin:
 * 1. Se persisten como overlay en `tcgacademy_user_overrides`.
 * 2. Si el usuario está en `tcgacademy_registered`, también se replica ahí para
 *    que el propio usuario vea los datos actualizados al hacer login.
 * 3. Cada campo modificado deja una entrada en `tcgacademy_user_changelog`.
 *
 * IMPORTANTE — facturas:
 * Las facturas ya emitidas son inmutables: su `recipient` es un snapshot
 * capturado en `createInvoice()`. Modificar los datos del usuario NO cambia
 * facturas históricas (requisito fiscal: art. 8 RD 1619/2012 sólo permite
 * corrección mediante factura rectificativa).
 */

import type { User } from "@/types/user";
import { MOCK_USERS, type AdminUser } from "@/data/mockData";

const OVERRIDES_KEY = "tcgacademy_user_overrides";
const CHANGELOG_KEY = "tcgacademy_user_changelog";
const REGISTERED_KEY = "tcgacademy_registered";

export interface UserChangelogEntry {
  timestamp: string;              // ISO string
  /** Path dot-notation del campo cambiado: "phone", "addresses[0].calle", "billing.nif" */
  field: string;
  oldValue: string | null;
  newValue: string | null;
  /** Operador que hizo el cambio (admin). Por defecto "admin". */
  adminId?: string;
}

// ─── Helpers de storage ──────────────────────────────────────────────────────

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Sintetiza User a partir de AdminUser (mock users) ───────────────────────

function adminUserToUser(a: AdminUser): User {
  return {
    id: a.id,
    email: a.email,
    name: a.name,
    lastName: a.lastName,
    phone: a.phone ?? "",
    role: a.role,
    addresses: [],
    createdAt: a.registeredAt ? `${a.registeredAt}T00:00:00.000Z` : new Date().toISOString(),
    favorites: [],
    birthDate: a.birthDate,
    ...(a.cif
      ? {
          nif: a.cif,
          nifType: /^[A-HJ-NP-SUVW]/i.test(a.cif) ? ("CIF" as const) : ("DNI" as const),
        }
      : {}),
  };
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Carga el User completo con overrides aplicados.
 * Devuelve null si el userId no existe en ninguna fuente.
 */
export function loadFullUser(userId: string): User | null {
  // 1. Usuarios registrados
  const registered = readJSON<Record<string, { password: string; user: User }>>(
    REGISTERED_KEY,
    {},
  );
  const regEntry = Object.values(registered).find((e) => e.user.id === userId);
  let base: User | null = regEntry ? regEntry.user : null;

  // 2. MOCK_USERS si no estaba en registered
  if (!base) {
    const mock = MOCK_USERS.find((u) => u.id === userId);
    if (mock) base = adminUserToUser(mock);
  }

  if (!base) return null;

  // 3. Aplicar overlay
  const overrides = readJSON<Record<string, Partial<User>>>(OVERRIDES_KEY, {});
  const patch = overrides[userId];
  if (!patch) return base;

  return mergeUserPatch(base, patch);
}

/**
 * Merge profundo controlado: campos escalares se reemplazan; arrays y objetos
 * anidados (addresses, billing, empresa) se reemplazan íntegros si están en el
 * patch. No hacemos merge recursivo de direcciones para evitar ambigüedad con
 * índices.
 */
function mergeUserPatch(base: User, patch: Partial<User>): User {
  return {
    ...base,
    ...patch,
    addresses: patch.addresses ?? base.addresses,
    billing: patch.billing ?? base.billing,
    empresa: patch.empresa ?? base.empresa,
  };
}

/**
 * Calcula el diff campo-a-campo entre dos Users. Usado para el changelog.
 */
export function diffUsers(prev: User, next: User): UserChangelogEntry[] {
  const entries: UserChangelogEntry[] = [];
  const now = new Date().toISOString();
  const SCALAR_FIELDS: (keyof User)[] = [
    "email", "username", "name", "lastName", "phone", "gender", "role",
    "nif", "nifType", "birthDate", "referralCode", "referredBy",
  ];
  for (const field of SCALAR_FIELDS) {
    const a = prev[field];
    const b = next[field];
    if (serialize(a) !== serialize(b)) {
      entries.push({
        timestamp: now,
        field: String(field),
        oldValue: toStr(a),
        newValue: toStr(b),
      });
    }
  }
  // Billing
  const bPrev = prev.billing ?? {};
  const bNext = next.billing ?? {};
  const billingKeys = ["nif", "razonSocial", "calle", "cp", "ciudad", "provincia", "pais"] as const;
  for (const k of billingKeys) {
    if ((bPrev as Record<string, unknown>)[k] !== (bNext as Record<string, unknown>)[k]) {
      entries.push({
        timestamp: now,
        field: `billing.${k}`,
        oldValue: toStr((bPrev as Record<string, unknown>)[k]),
        newValue: toStr((bNext as Record<string, unknown>)[k]),
      });
    }
  }
  // Addresses — comparamos JSON serializado por índice
  const aPrev = prev.addresses ?? [];
  const aNext = next.addresses ?? [];
  const maxAddr = Math.max(aPrev.length, aNext.length);
  for (let i = 0; i < maxAddr; i++) {
    const pa = aPrev[i];
    const na = aNext[i];
    if (serialize(pa) !== serialize(na)) {
      entries.push({
        timestamp: now,
        field: `addresses[${i}]`,
        oldValue: pa ? serialize(pa) : null,
        newValue: na ? serialize(na) : null,
      });
    }
  }
  return entries;
}

function serialize(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
function toStr(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

/**
 * Guarda los cambios del admin sobre un usuario.
 * - Persiste overlay completo (merge con overlay existente).
 * - Si el usuario está en `tcgacademy_registered`, actualiza también ahí.
 * - Registra el diff campo-a-campo en el changelog.
 * - Devuelve las entradas del changelog generadas (para feedback UI).
 */
export function saveUserData(
  userId: string,
  nextUser: User,
  adminId = "admin",
): UserChangelogEntry[] {
  const prev = loadFullUser(userId);
  if (!prev) throw new Error(`Usuario ${userId} no encontrado`);

  const changes = diffUsers(prev, nextUser).map((c) => ({ ...c, adminId }));
  if (changes.length === 0) return [];

  // 1. Overrides overlay
  const overrides = readJSON<Record<string, Partial<User>>>(OVERRIDES_KEY, {});
  overrides[userId] = {
    ...(overrides[userId] ?? {}),
    email: nextUser.email,
    username: nextUser.username,
    name: nextUser.name,
    lastName: nextUser.lastName,
    phone: nextUser.phone,
    gender: nextUser.gender,
    role: nextUser.role,
    nif: nextUser.nif,
    nifType: nextUser.nifType,
    birthDate: nextUser.birthDate,
    addresses: nextUser.addresses,
    billing: nextUser.billing,
    empresa: nextUser.empresa,
  };
  writeJSON(OVERRIDES_KEY, overrides);

  // 2. Replicar a tcgacademy_registered si existe
  const registered = readJSON<Record<string, { password: string; user: User }>>(
    REGISTERED_KEY,
    {},
  );
  let registeredKey: string | null = null;
  for (const [k, v] of Object.entries(registered)) {
    if (v.user.id === userId) {
      registeredKey = k;
      break;
    }
  }
  if (registeredKey) {
    registered[registeredKey] = {
      ...registered[registeredKey],
      user: { ...registered[registeredKey].user, ...nextUser },
    };
    writeJSON(REGISTERED_KEY, registered);
  }

  // 3. Changelog
  const log = readJSON<Record<string, UserChangelogEntry[]>>(CHANGELOG_KEY, {});
  log[userId] = [...(log[userId] ?? []), ...changes];
  writeJSON(CHANGELOG_KEY, log);

  return changes;
}

/**
 * Devuelve el historial de cambios (más reciente primero).
 */
export function loadUserChangelog(userId: string): UserChangelogEntry[] {
  const log = readJSON<Record<string, UserChangelogEntry[]>>(CHANGELOG_KEY, {});
  const entries = log[userId] ?? [];
  return [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/**
 * Etiqueta humana para un campo del changelog.
 */
export function formatFieldLabel(field: string): string {
  const MAP: Record<string, string> = {
    email: "Email",
    username: "Username",
    name: "Nombre",
    lastName: "Apellidos",
    phone: "Teléfono",
    gender: "Género",
    role: "Rol",
    nif: "NIF / NIE / CIF",
    nifType: "Tipo de identificador",
    birthDate: "Fecha de nacimiento",
    referralCode: "Código de referido",
    referredBy: "Referido por",
    "billing.nif": "Facturación · NIF",
    "billing.razonSocial": "Facturación · Razón social",
    "billing.calle": "Facturación · Calle",
    "billing.cp": "Facturación · C.P.",
    "billing.ciudad": "Facturación · Ciudad",
    "billing.provincia": "Facturación · Provincia",
    "billing.pais": "Facturación · País",
  };
  if (MAP[field]) return MAP[field];
  const addrMatch = field.match(/^addresses\[(\d+)\]$/);
  if (addrMatch) return `Dirección #${Number(addrMatch[1]) + 1}`;
  return field;
}
