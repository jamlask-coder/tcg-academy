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

import type { User, UserRole } from "@/types/user";
import { MOCK_USERS, type AdminUser } from "@/data/mockData";
import { validateSpanishNIF } from "@/lib/validations/nif";

const OVERRIDES_KEY = "tcgacademy_user_overrides";
const CHANGELOG_KEY = "tcgacademy_user_changelog";
const REGISTERED_KEY = "tcgacademy_registered";
const ACTIVATION_TOKENS_KEY = "tcgacademy_activation_tokens";
// Índices compartidos con AuthContext (SSOT: "1 username = 1 email", "1 NIF = 1 email").
const USERNAMES_KEY = "tcgacademy_usernames";
const NIFS_KEY = "tcgacademy_nifs";

/** Dispara el evento canónico de la entidad `users` para refrescar consumidores. */
function emitUsersUpdated(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("tcga:users:updated"));
  } catch {
    /* non-fatal */
  }
}

function normalizeNif(nif: string): string {
  return nif.toUpperCase().replace(/[\s-]/g, "").trim();
}

function normalizeUsername(u: string): string {
  return u.toLowerCase().trim();
}

/**
 * TTL del token de activación (14 días) para invitaciones por factura manual.
 */
export const ACTIVATION_TOKEN_TTL_DAYS = 14;

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

  // Defense-in-depth: si el NIF/CIF cambió a un valor no vacío, validar.
  // Bloqueamos tanto en nif principal como en billing.nif. No validamos si
  // no cambió (un registro legacy con NIF inválido no debe impedir editar
  // otros campos — el admin lo corregirá cuando toque el NIF).
  const nifChanged = (prev.nif ?? "") !== (nextUser.nif ?? "");
  if (nifChanged && nextUser.nif && nextUser.nif.trim()) {
    const v = validateSpanishNIF(nextUser.nif);
    if (!v.valid) {
      throw new Error(
        `NIF/NIE/CIF no válido: ${v.error ?? "formato incorrecto"}`,
      );
    }
  }
  const prevBillingNif = prev.billing?.nif ?? "";
  const nextBillingNif = nextUser.billing?.nif ?? "";
  if (prevBillingNif !== nextBillingNif && nextBillingNif.trim()) {
    const v = validateSpanishNIF(nextBillingNif);
    if (!v.valid) {
      throw new Error(
        `NIF facturación no válido: ${v.error ?? "formato incorrecto"}`,
      );
    }
  }

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

  emitUsersUpdated();
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

// ─── Búsqueda y creación desde factura manual ────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Construye la lista unificada de usuarios consultables (registered + mock)
 * con overrides aplicados. Deduplica por `id` dando prioridad a registered.
 */
function listAllUsers(): User[] {
  const registered = readJSON<Record<string, { password: string; user: User }>>(
    REGISTERED_KEY,
    {},
  );
  const overrides = readJSON<Record<string, Partial<User>>>(OVERRIDES_KEY, {});
  const seen = new Set<string>();
  const out: User[] = [];
  for (const entry of Object.values(registered)) {
    if (seen.has(entry.user.id)) continue;
    seen.add(entry.user.id);
    const patch = overrides[entry.user.id];
    out.push(patch ? mergeUserPatch(entry.user, patch) : entry.user);
  }
  for (const mock of MOCK_USERS) {
    if (seen.has(mock.id)) continue;
    seen.add(mock.id);
    const base = adminUserToUser(mock);
    const patch = overrides[mock.id];
    out.push(patch ? mergeUserPatch(base, patch) : base);
  }
  return out;
}

/**
 * Busca un usuario por email exacto (case-insensitive).
 * Devuelve null si no existe.
 */
export function findUserByEmail(email: string): User | null {
  const needle = normalize(email);
  if (!needle) return null;
  return listAllUsers().find((u) => normalize(u.email) === needle) ?? null;
}

export interface UserSearchResult {
  id: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  nif?: string;
  role: UserRole;
}

/**
 * Busca usuarios por coincidencia parcial en nombre, apellidos, email o NIF.
 * Devuelve como máximo `limit` resultados (default 8).
 */
export function searchUsersByQuery(q: string, limit = 8): UserSearchResult[] {
  const needle = normalize(q);
  if (!needle || needle.length < 2) return [];
  const all = listAllUsers();
  const matches: UserSearchResult[] = [];
  for (const u of all) {
    const hay = [
      u.name,
      u.lastName,
      u.email,
      u.nif ?? "",
      `${u.name} ${u.lastName}`,
    ]
      .map(normalize)
      .join(" | ");
    if (hay.includes(needle)) {
      matches.push({
        id: u.id,
        name: u.name,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone ?? "",
        nif: u.nif,
        role: u.role,
      });
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

// ─── Creación de usuario desde factura manual ────────────────────────────────

export interface CreateUserFromInvoiceInput {
  name: string;
  lastName: string;
  email: string;
  phone: string;
  nif?: string;
  nifType?: "DNI" | "NIE" | "CIF";
  address?: {
    calle: string;
    cp: string;
    ciudad: string;
    provincia: string;
    pais: string;
    countryCode?: string;
  };
  isB2B?: boolean;
  razonSocial?: string;
}

/**
 * Crea un User a partir de los datos introducidos en una factura manual.
 * El usuario queda sin contraseña ni username — ambos se rellenan al activar
 * la cuenta desde el email de invitación. La cuenta se guarda en
 * `tcgacademy_registered` con password vacío (bloquea login hasta activación).
 */
export function createUserFromInvoice(input: CreateUserFromInvoiceInput): User {
  const existing = findUserByEmail(input.email);
  if (existing) {
    throw new Error(`Ya existe un usuario con el email ${input.email}`);
  }
  // Política "1 NIF = 1 usuario": si el NIF ya está indexado, abortamos antes
  // de persistir nada. Mantiene coherencia con el registro público
  // (AuthContext.register) y evita duplicados fiscales en el libro VeriFactu.
  const nifIndex = readJSON<Record<string, string>>(NIFS_KEY, {});
  const normalizedNif = input.nif ? normalizeNif(input.nif) : "";
  if (normalizedNif && nifIndex[normalizedNif]) {
    throw new Error(
      `Ya existe un usuario con el NIF ${normalizedNif} (${nifIndex[normalizedNif]})`,
    );
  }
  const id = `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const role: UserRole = input.isB2B ? "mayorista" : "cliente";
  const now = new Date().toISOString();
  const user: User = {
    id,
    email: input.email.trim(),
    name: input.name.trim(),
    lastName: input.lastName.trim(),
    phone: input.phone.trim(),
    role,
    addresses: input.address
      ? [
          {
            id: `addr_${Date.now().toString(36)}`,
            label: "Principal",
            calle: input.address.calle,
            numero: "",
            cp: input.address.cp,
            ciudad: input.address.ciudad,
            provincia: input.address.provincia,
            pais: input.address.pais,
            predeterminada: true,
          },
        ]
      : [],
    ...(input.nif ? { nif: input.nif, nifType: input.nifType ?? "DNI" } : {}),
    ...(input.isB2B && input.razonSocial
      ? {
          billing: {
            nif: input.nif ?? "",
            razonSocial: input.razonSocial,
            calle: input.address?.calle ?? "",
            cp: input.address?.cp ?? "",
            ciudad: input.address?.ciudad ?? "",
            provincia: input.address?.provincia ?? "",
            pais: input.address?.pais ?? "España",
          },
        }
      : {}),
    createdAt: now,
    favorites: [],
    emailVerified: false,
  };
  const registered = readJSON<Record<string, { password: string; user: User }>>(
    REGISTERED_KEY,
    {},
  );
  registered[input.email.trim().toLowerCase()] = { password: "", user };
  writeJSON(REGISTERED_KEY, registered);
  // Indexa NIF (si lo hubo) para que colisiones posteriores se detecten.
  // Username se indexará al completar la activación.
  if (normalizedNif) {
    nifIndex[normalizedNif] = user.email.toLowerCase();
    writeJSON(NIFS_KEY, nifIndex);
  }
  emitUsersUpdated();
  return user;
}

// ─── Tokens de activación de cuenta ──────────────────────────────────────────

export interface ActivationTokenRecord {
  email: string;
  userId: string;
  createdAt: string;  // ISO
  expiresAt: string;  // ISO
  sourceInvoiceNumber?: string;
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Emite un token de activación (14 días TTL) para un usuario creado desde
 * factura manual. El token se guarda en `tcgacademy_activation_tokens` y se
 * envía al usuario por email.
 */
export function generateActivationToken(
  userId: string,
  email: string,
  sourceInvoiceNumber?: string,
): string {
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + ACTIVATION_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const store = readJSON<Record<string, ActivationTokenRecord>>(ACTIVATION_TOKENS_KEY, {});
  store[token] = {
    email: email.trim().toLowerCase(),
    userId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    ...(sourceInvoiceNumber ? { sourceInvoiceNumber } : {}),
  };
  writeJSON(ACTIVATION_TOKENS_KEY, store);
  return token;
}

/**
 * Valida un token sin consumirlo — usado al cargar la página de activación.
 * Devuelve el registro si el token es válido y no está expirado.
 */
export function peekActivationToken(token: string): ActivationTokenRecord | null {
  const store = readJSON<Record<string, ActivationTokenRecord>>(ACTIVATION_TOKENS_KEY, {});
  const rec = store[token];
  if (!rec) return null;
  if (new Date(rec.expiresAt).getTime() < Date.now()) return null;
  return rec;
}

/**
 * Consume el token (lo elimina). Devuelve el registro si era válido, o null.
 * Llamar tras completar con éxito el formulario de activación.
 */
export function consumeActivationToken(token: string): ActivationTokenRecord | null {
  const store = readJSON<Record<string, ActivationTokenRecord>>(ACTIVATION_TOKENS_KEY, {});
  const rec = store[token];
  if (!rec) return null;
  delete store[token];
  writeJSON(ACTIVATION_TOKENS_KEY, store);
  if (new Date(rec.expiresAt).getTime() < Date.now()) return null;
  return rec;
}

/**
 * Completa la activación: establece password, username, birthDate y teléfono
 * (si no estaba) en el registro de usuario. Marca emailVerified=true.
 */
export function completeActivation(
  userId: string,
  data: { password: string; username: string; birthDate: string; phone?: string },
): User {
  const registered = readJSON<Record<string, { password: string; user: User }>>(
    REGISTERED_KEY,
    {},
  );
  let key: string | null = null;
  for (const [k, v] of Object.entries(registered)) {
    if (v.user.id === userId) {
      key = k;
      break;
    }
  }
  if (!key) throw new Error(`Usuario ${userId} no encontrado`);
  const entry = registered[key];
  const updated: User = {
    ...entry.user,
    username: data.username,
    birthDate: data.birthDate,
    phone: data.phone ?? entry.user.phone,
    emailVerified: true,
    emailVerifiedAt: new Date().toISOString(),
  };
  registered[key] = { password: data.password, user: updated };
  writeJSON(REGISTERED_KEY, registered);
  // Indexa el username elegido en la activación. La activación ya valida
  // unicidad en el cliente, pero reforzamos aquí para que nunca queden
  // usuarios fuera del índice SSOT (`tcgacademy_usernames`).
  const usernameIndex = readJSON<Record<string, string>>(USERNAMES_KEY, {});
  usernameIndex[normalizeUsername(data.username)] = entry.user.email.toLowerCase();
  writeJSON(USERNAMES_KEY, usernameIndex);
  emitUsersUpdated();
  return updated;
}
