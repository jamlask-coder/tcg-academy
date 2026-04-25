/**
 * Servicio de asociaciones mutuas.
 * Gestiona invitaciones, aceptaciones, rechazos y el cooldown de 60 días.
 *
 * Flujo:
 *   A invita a B (por código o username) → sendInvitation
 *   B acepta → acceptInvitation → createMutualAssociation (en pointsService)
 *   A o B elimina → removeAssociation → removeMutualAssociation + cooldown
 *
 * NOTE (backend): reemplazar localStorage con API endpoints:
 *   POST /api/associations/invite
 *   PATCH /api/associations/invites/:id/accept|decline
 *   DELETE /api/associations/:partnerId
 */

import {
  createMutualAssociation,
  removeMutualAssociation,
  getAssociations,
  ensureReferralCode,
  getReferrerUserId,
  MAX_ASSOCIATIONS,
} from "./pointsService";
import { openInvitationEmail } from "./emailService";
import { pushUserNotification } from "./notificationService";
import type { User } from "@/types/user";
import { DataHub } from "@/lib/dataHub";

// ─── Constants ────────────────────────────────────────────────────────────────

export const ASSOC_CHANGE_COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000; // 60 días

// ─── Storage keys ─────────────────────────────────────────────────────────────

const INVITES_KEY    = "tcgacademy_assoc_invites";
const COOLDOWN_KEY   = "tcgacademy_assoc_cooldown";
const REGISTERED_KEY = "tcgacademy_registered";
const USERNAMES_KEY  = "tcgacademy_usernames"; // username (lowercase) → email

// ─── Types ────────────────────────────────────────────────────────────────────

export type InviteStatus = "pending" | "accepted" | "declined";

export interface AssocInvitation {
  id: string;
  fromUserId: string;
  toUserId: string;
  referralCode: string; // código del que invita (fromUser)
  sentAt: number;
  status: InviteStatus;
  respondedAt?: number;
}

export interface UserDisplayInfo {
  name: string;
  initials: string;
  username?: string;
}

export interface ChangeAllowance {
  ok: boolean;
  nextAt: number | null; // ms timestamp cuando se puede volver a cambiar
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function loadInvites(): AssocInvitation[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(INVITES_KEY) ?? "[]") as AssocInvitation[];
  } catch {
    return [];
  }
}

function saveInvites(invites: AssocInvitation[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INVITES_KEY, JSON.stringify(invites));
  } catch {
    /* ignore quota */
  }
}

function loadCooldowns(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(COOLDOWN_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function saveCooldowns(data: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function dispatch(): void {
  DataHub.emit("assoc");
}

// ─── User lookup ──────────────────────────────────────────────────────────────

/**
 * Devuelve el rol de un usuario por su ID, o null si no se encuentra.
 * Los grupos de puntos son **exclusivos de clientes**: mayoristas, tiendas y
 * admins no pueden formar grupos ni ser invitados a uno.
 */
function getUserRoleById(userId: string): User["role"] | null {
  if (typeof window === "undefined") return null;
  // Demo users (hardcoded IDs)
  const DEMO_ROLES: Record<string, User["role"]> = {
    "demo-cliente": "cliente",
    "demo-mayorista": "mayorista",
    "demo-tienda": "tienda",
    "demo-admin": "admin",
    "admin-luri": "admin",
    "admin-font": "admin",
  };
  if (DEMO_ROLES[userId]) return DEMO_ROLES[userId];
  // Registered users
  try {
    const registered = JSON.parse(
      localStorage.getItem(REGISTERED_KEY) ?? "{}",
    ) as Record<string, { password: string; user: User }>;
    for (const entry of Object.values(registered)) {
      if (entry.user.id === userId) return entry.user.role;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Información de display (nombre, iniciales) para un userId */
export function getUserDisplayInfo(userId: string): UserDisplayInfo {
  if (typeof window === "undefined") return { name: "Usuario", initials: "?" };
  try {
    const registered = JSON.parse(
      localStorage.getItem(REGISTERED_KEY) ?? "{}",
    ) as Record<string, { password: string; user: User }>;
    for (const entry of Object.values(registered)) {
      if (entry.user.id === userId) {
        const u = entry.user;
        return {
          name: `${u.name} ${u.lastName.charAt(0)}.`,
          initials: (u.name[0] + u.lastName[0]).toUpperCase(),
          username: u.username,
        };
      }
    }
  } catch {
    /* ignore */
  }
  // Fallback para usuarios demo
  const DEMO_DISPLAY: Record<string, UserDisplayInfo> = {
    "demo-cliente":   { name: "Maria G.",  initials: "MG" },
    "demo-mayorista": { name: "Carlos L.", initials: "CL" },
    "demo-tienda":    { name: "Ana M.",    initials: "AM" },
    "demo-admin":     { name: "Admin T.",  initials: "AT" },
  };
  return DEMO_DISPLAY[userId] ?? { name: "Usuario", initials: "?" };
}

/**
 * Busca un usuario por email o nombre de usuario (con o sin @).
 * También acepta códigos de referido internamente (compatibilidad).
 * Devuelve el userId o null si no se encuentra / es el propio usuario.
 */
export function findUserByQuery(query: string, currentUserId: string): string | null {
  if (typeof window === "undefined") return null;
  const q = query.trim();
  if (!q) return null;

  // Solo devolvemos usuarios con rol "cliente": los grupos son exclusivos entre clientes.
  const onlyIfClient = (userId: string | null): string | null => {
    if (!userId) return null;
    return getUserRoleById(userId) === "cliente" ? userId : null;
  };

  // 1. Por email (contiene @ en posición > 0)
  if (q.includes("@") && q.indexOf("@") > 0) {
    try {
      const registered = JSON.parse(
        localStorage.getItem(REGISTERED_KEY) ?? "{}",
      ) as Record<string, { password: string; user: User }>;
      const entry = registered[q.toLowerCase()];
      if (entry && entry.user.id !== currentUserId) {
        return onlyIfClient(entry.user.id);
      }
    } catch {
      /* ignore */
    }
  }

  // 2. Por nombre de usuario (quitar @ inicial si lo usan como prefijo)
  const username = q.startsWith("@") ? q.slice(1) : q;
  if (username) {
    try {
      const usernameIndex = JSON.parse(
        localStorage.getItem(USERNAMES_KEY) ?? "{}",
      ) as Record<string, string>;
      const email = usernameIndex[username.toLowerCase()];
      if (email) {
        const registered = JSON.parse(
          localStorage.getItem(REGISTERED_KEY) ?? "{}",
        ) as Record<string, { password: string; user: User }>;
        const entry = registered[email];
        if (entry && entry.user.id !== currentUserId) {
          return onlyIfClient(entry.user.id);
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 3. Fallback: código de referido (compatibilidad interna)
  const byCode = getReferrerUserId(q);
  if (byCode && byCode !== currentUserId) return onlyIfClient(byCode);

  return null;
}

// ─── Invitations ──────────────────────────────────────────────────────────────

/**
 * Envía una invitación de asociación a otro usuario (por código o username).
 * Validaciones: no auto-invitación, no ya asociado, slots disponibles, no duplicada.
 */
export function sendInvitation(
  fromUserId: string,
  query: string,
): { ok: boolean; error?: string } {
  // Los grupos son exclusivos de cuentas "cliente" — bloquear a mayoristas/tiendas/admin
  const fromRole = getUserRoleById(fromUserId);
  if (fromRole !== "cliente") {
    return {
      ok: false,
      error: "Los grupos de puntos son solo para cuentas de cliente",
    };
  }

  const toUserId = findUserByQuery(query, fromUserId);
  if (!toUserId) return { ok: false, error: "Usuario o código no encontrado" };
  if (toUserId === fromUserId) return { ok: false, error: "No puedes invitarte a ti mismo" };

  // findUserByQuery ya filtra por rol cliente, pero re-comprobamos por seguridad
  if (getUserRoleById(toUserId) !== "cliente") {
    return { ok: false, error: "Solo puedes invitar a cuentas de cliente" };
  }

  const myAssocs = getAssociations(fromUserId);
  if (myAssocs.some((a) => a.referrerId === toUserId))
    return { ok: false, error: "Ya estáis asociados" };
  if (myAssocs.length >= MAX_ASSOCIATIONS)
    return { ok: false, error: `Has alcanzado el máximo de ${MAX_ASSOCIATIONS} asociaciones` };

  const theirAssocs = getAssociations(toUserId);
  if (theirAssocs.some((a) => a.referrerId === fromUserId))
    return { ok: false, error: "Ya estáis asociados" };
  if (theirAssocs.length >= MAX_ASSOCIATIONS)
    return { ok: false, error: "El otro usuario ya tiene el máximo de asociaciones" };

  const invites = loadInvites();

  const alreadySent = invites.find(
    (inv) =>
      inv.fromUserId === fromUserId &&
      inv.toUserId === toUserId &&
      inv.status === "pending",
  );
  if (alreadySent) return { ok: false, error: "Ya enviaste una invitación a este usuario" };

  const theyAlreadyInvitedMe = invites.find(
    (inv) =>
      inv.fromUserId === toUserId &&
      inv.toUserId === fromUserId &&
      inv.status === "pending",
  );
  if (theyAlreadyInvitedMe)
    return {
      ok: false,
      error: "Este usuario ya te ha enviado una invitación — acéptala en la sección de invitaciones pendientes",
    };

  const myCode = ensureReferralCode(fromUserId);
  const invite: AssocInvitation = {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fromUserId,
    toUserId,
    referralCode: myCode,
    sentAt: Date.now(),
    status: "pending",
  };
  saveInvites([...invites, invite]);
  dispatch();

  // Open email preview in a new tab (demo). In production: replace with
  // an API call to Resend / EmailJS / SendGrid.
  openInvitationEmail(toUserId, fromUserId);

  return { ok: true };
}

/** Acepta una invitación pendiente */
export function acceptInvitation(
  inviteId: string,
  userId: string,
): { ok: boolean; error?: string } {
  // Los grupos son exclusivos de clientes
  if (getUserRoleById(userId) !== "cliente") {
    return {
      ok: false,
      error: "Los grupos de puntos son solo para cuentas de cliente",
    };
  }

  const invites = loadInvites();
  const idx = invites.findIndex(
    (i) => i.id === inviteId && i.toUserId === userId && i.status === "pending",
  );
  if (idx === -1) return { ok: false, error: "Invitación no encontrada o ya respondida" };

  const invite = invites[idx];
  // Re-comprobar el rol del que invitó (por si cambió de rol tras enviar la invitación)
  if (getUserRoleById(invite.fromUserId) !== "cliente") {
    return {
      ok: false,
      error: "La cuenta que envió la invitación ya no es de cliente",
    };
  }

  // Re-validar slots
  const myAssocs = getAssociations(userId);
  if (myAssocs.some((a) => a.referrerId === invite.fromUserId))
    return { ok: false, error: "Ya estáis asociados" };
  if (myAssocs.length >= MAX_ASSOCIATIONS)
    return { ok: false, error: `Has alcanzado el máximo de ${MAX_ASSOCIATIONS} asociaciones` };

  const theirAssocs = getAssociations(invite.fromUserId);
  if (theirAssocs.length >= MAX_ASSOCIATIONS)
    return { ok: false, error: "El otro usuario ya ha completado su grupo" };

  createMutualAssociation(invite.fromUserId, userId, invite.referralCode);
  invites[idx] = { ...invite, status: "accepted", respondedAt: Date.now() };
  saveInvites(invites);
  dispatch();

  // Notify the inviter that their invitation was accepted
  const acceptorInfo = getUserDisplayInfo(userId);
  pushUserNotification(invite.fromUserId, {
    type: "asociacion",
    title: "¡Ya formáis parte del mismo grupo!",
    message: `${acceptorInfo.name} ha aceptado tu invitación. A partir de ahora todos los miembros del grupo ganaréis puntos mutuamente.`,
    date: new Date().toISOString(),
    link: "/cuenta/grupo",
  });

  return { ok: true };
}

/** Rechaza una invitación pendiente */
export function declineInvitation(
  inviteId: string,
  userId: string,
): { ok: boolean; error?: string } {
  const invites = loadInvites();
  const idx = invites.findIndex(
    (i) => i.id === inviteId && i.toUserId === userId && i.status === "pending",
  );
  if (idx === -1) return { ok: false, error: "Invitación no encontrada o ya respondida" };
  invites[idx] = { ...invites[idx], status: "declined", respondedAt: Date.now() };
  saveInvites(invites);
  dispatch();
  return { ok: true };
}

/** Invitaciones pendientes recibidas por un usuario */
export function getPendingInvitationsFor(userId: string): AssocInvitation[] {
  return loadInvites().filter(
    (i) => i.toUserId === userId && i.status === "pending",
  );
}

/** Todas las invitaciones enviadas por un usuario */
export function getSentInvitationsFrom(userId: string): AssocInvitation[] {
  return loadInvites()
    .filter((i) => i.fromUserId === userId)
    .sort((a, b) => b.sentAt - a.sentAt)
    .slice(0, 10); // últimas 10
}

/** Número de invitaciones pendientes para badge */
export function countPendingInvitationsFor(userId: string): number {
  return getPendingInvitationsFor(userId).length;
}

// ─── Cooldown + removal ───────────────────────────────────────────────────────

/** ¿Puede el usuario cambiar (eliminar) una asociación ahora? */
export function canChangeAssociation(userId: string): ChangeAllowance {
  const cooldowns = loadCooldowns();
  const lastChange = cooldowns[userId];
  if (!lastChange) return { ok: true, nextAt: null };
  const nextAt = lastChange + ASSOC_CHANGE_COOLDOWN_MS;
  if (Date.now() >= nextAt) return { ok: true, nextAt: null };
  return { ok: false, nextAt };
}

/**
 * Elimina una asociación (ambas direcciones) y registra el cooldown
 * para el usuario que inicia la eliminación.
 */
export function removeAssociation(
  userId: string,
  partnerId: string,
): { ok: boolean; error?: string } {
  const check = canChangeAssociation(userId);
  if (!check.ok) {
    const days = Math.ceil(
      ((check.nextAt ?? 0) - Date.now()) / (24 * 60 * 60 * 1000),
    );
    return {
      ok: false,
      error: `Debes esperar ${days} día${days !== 1 ? "s" : ""} más antes de cambiar una asociación`,
    };
  }
  removeMutualAssociation(userId, partnerId);
  const cooldowns = loadCooldowns();
  cooldowns[userId] = Date.now();
  saveCooldowns(cooldowns);
  dispatch();
  return { ok: true };
}
