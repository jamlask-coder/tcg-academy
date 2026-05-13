/**
 * tpvWorkerService — CRUD de trabajadores TPV asignados a una tienda.
 *
 * Reglas:
 *   - Storage: localStorage `tcgacademy_tpv_workers` (array global; los
 *     consumidores filtran por `ownerUserId`).
 *   - Nickname: normalizado `.trim().toLowerCase()`, único por owner.
 *   - Password: bcryptjs (rounds=10) — más bajo que las cuentas web porque
 *     el TPV ya está protegido en múltiples capas (proxy, layout, IP) y los
 *     workers tienen ámbito estrictamente operativo.
 *   - Bajas: lógicas (`active = false`). Nunca se borran físicamente para no
 *     romper la trazabilidad de ventas históricas que apuntan a su id.
 *
 * Evento DataHub: `tcga:tpv_workers:updated`.
 */

import bcrypt from "bcryptjs";
import { DataHub } from "@/lib/dataHub";
import type { TpvStoreSlug } from "@/config/tpvStores";
import type { TpvWorker } from "@/types/tpvWorker";

// ─── Constantes ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "tcgacademy_tpv_workers";
/** Coste bcrypt — ver doc-comment del módulo para la justificación de 10. */
const WORKER_BCRYPT_ROUNDS = 10;

const NICK_MIN = 2;
const NICK_MAX = 24;
const PWD_MIN = 4;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeNick(nick: string): string {
  return nick.trim().toLowerCase();
}

function readAll(): TpvWorker[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TpvWorker[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(workers: TpvWorker[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workers));
  DataHub.emit("tpv_workers");
}

function validateNickname(nick: string): string | null {
  const n = normalizeNick(nick);
  if (n.length < NICK_MIN) return `Nick demasiado corto (mínimo ${NICK_MIN}).`;
  if (n.length > NICK_MAX) return `Nick demasiado largo (máximo ${NICK_MAX}).`;
  if (!/^[a-z0-9._-]+$/.test(n)) {
    return "Solo letras minúsculas, números y . _ - permitidos.";
  }
  return null;
}

function validatePassword(pwd: string): string | null {
  if (pwd.length < PWD_MIN) return `Contraseña demasiado corta (mínimo ${PWD_MIN}).`;
  return null;
}

// ─── Read ────────────────────────────────────────────────────────────────────

/** Lista todos los workers (incluye inactivos). Útil para el panel admin. */
export function listAllWorkers(): TpvWorker[] {
  return readAll();
}

/** Workers de un owner concreto — útiles para el panel "Mis trabajadores". */
export function listWorkersByOwner(ownerUserId: string): TpvWorker[] {
  return readAll().filter((w) => w.ownerUserId === ownerUserId);
}

/**
 * Workers ACTIVOS asignados a una tienda — los que aparecen en el selector
 * de vendedor del TPV. Incluye workers de cualquier owner que esté asignado
 * a ese slug (varios owners pueden compartir una misma tienda si el admin
 * lo configura así — aunque en la práctica suele ser 1:1).
 */
export function listActiveWorkersByStore(slug: TpvStoreSlug): TpvWorker[] {
  return readAll().filter((w) => w.storeSlug === slug && w.active);
}

export function getWorkerById(id: string): TpvWorker | null {
  return readAll().find((w) => w.id === id) ?? null;
}

// ─── Write ───────────────────────────────────────────────────────────────────

export interface CreateWorkerInput {
  ownerUserId: string;
  storeSlug: TpvStoreSlug;
  nickname: string;
  password: string;
}

export interface CreateWorkerResult {
  ok: boolean;
  worker?: TpvWorker;
  error?: string;
}

/**
 * Crea un nuevo worker. Falla si:
 *   - el nickname ya existe ACTIVO para ese owner (case-insensitive).
 *   - el nickname o password no cumplen las reglas mínimas.
 *
 * Si existe un worker con el mismo nick pero `active=false`, también falla —
 * reactivarlo es una acción explícita (el admin lo verá en el listado).
 */
export async function createWorker(
  input: CreateWorkerInput,
): Promise<CreateWorkerResult> {
  const nickError = validateNickname(input.nickname);
  if (nickError) return { ok: false, error: nickError };
  const pwdError = validatePassword(input.password);
  if (pwdError) return { ok: false, error: pwdError };

  const cleanNick = normalizeNick(input.nickname);
  const all = readAll();
  const dup = all.find(
    (w) => w.ownerUserId === input.ownerUserId && w.nickname === cleanNick,
  );
  if (dup) {
    return {
      ok: false,
      error: dup.active
        ? "Ya existe un trabajador con ese nick."
        : "Existe un trabajador inactivo con ese nick. Reactívalo en el listado.",
    };
  }

  const passwordHash = await bcrypt.hash(input.password, WORKER_BCRYPT_ROUNDS);
  const worker: TpvWorker = {
    id: crypto.randomUUID(),
    ownerUserId: input.ownerUserId,
    storeSlug: input.storeSlug,
    nickname: cleanNick,
    passwordHash,
    active: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  writeAll([...all, worker]);
  return { ok: true, worker };
}

/**
 * Cambia el estado activo del worker (alta/baja lógica). NO borra el registro
 * porque ventas históricas referencian su `id`.
 */
export function setWorkerActive(workerId: string, active: boolean): boolean {
  const all = readAll();
  const idx = all.findIndex((w) => w.id === workerId);
  if (idx < 0) return false;
  const next = [...all];
  next[idx] = { ...next[idx], active, updatedAt: nowIso() };
  writeAll(next);
  return true;
}

/**
 * Resetea la contraseña del worker. La nueva password se valida con la misma
 * regla que en alta. Devuelve `false` si no existe o la password es inválida.
 */
export async function resetWorkerPassword(
  workerId: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const pwdError = validatePassword(newPassword);
  if (pwdError) return { ok: false, error: pwdError };
  const all = readAll();
  const idx = all.findIndex((w) => w.id === workerId);
  if (idx < 0) return { ok: false, error: "Trabajador no encontrado." };
  const passwordHash = await bcrypt.hash(newPassword, WORKER_BCRYPT_ROUNDS);
  const next = [...all];
  next[idx] = { ...next[idx], passwordHash, updatedAt: nowIso() };
  writeAll(next);
  return { ok: true };
}

/**
 * Verifica password contra un worker. Devuelve el worker actualizado si OK
 * (con `lastLoginAt` refrescado), o null si no.
 *
 * Importante: el worker debe estar `active=true`. Una baja lógica bloquea
 * el login aunque la password sea correcta.
 */
export async function verifyWorkerLogin(
  workerId: string,
  password: string,
): Promise<TpvWorker | null> {
  const worker = getWorkerById(workerId);
  if (!worker || !worker.active) return null;
  const ok = await bcrypt.compare(password, worker.passwordHash);
  if (!ok) return null;
  const all = readAll();
  const idx = all.findIndex((w) => w.id === workerId);
  if (idx < 0) return null;
  const next = [...all];
  next[idx] = { ...next[idx], lastLoginAt: nowIso() };
  writeAll(next);
  return next[idx];
}
