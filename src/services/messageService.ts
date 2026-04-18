/**
 * messageService — SSOT para mensajes cliente ↔ admin.
 *
 * Antes de este servicio: el código vivía disperso en /cuenta/mensajes,
 * /admin/mensajes, /admin/pedidos/[id] y admin/notificaciones con lecturas
 * directas a localStorage["tcgacademy_messages"] y MOCK_MESSAGES.
 *
 * Ahora: todas las lecturas y escrituras pasan por aquí, con evento canónico
 * `tcga:messages:updated` dispatched tras cada mutación.
 */

import { MOCK_MESSAGES, MSG_STORAGE_KEY, type AppMessage } from "@/data/mockData";
import { DataHub } from "@/lib/dataHub";

export type { AppMessage };

const MAX_MESSAGES = 2000;

/**
 * Lee TODOS los mensajes persistidos. Si no hay ninguno en localStorage,
 * devuelve MOCK_MESSAGES para que la UI no aparezca vacía en modo demo
 * (no se sembra automáticamente — es fallback de solo-lectura).
 */
export function loadMessages(): AppMessage[] {
  if (typeof window === "undefined") return MOCK_MESSAGES.slice();
  try {
    const raw = localStorage.getItem(MSG_STORAGE_KEY);
    if (!raw) return MOCK_MESSAGES.slice();
    return JSON.parse(raw) as AppMessage[];
  } catch {
    return MOCK_MESSAGES.slice();
  }
}

/**
 * Persiste el array completo. Normalmente se usa a través de `sendMessage`
 * o `markAsRead`; exportado por si un flujo especial lo necesita.
 */
export function saveMessages(messages: AppMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = messages.slice(0, MAX_MESSAGES);
    localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify(trimmed));
    DataHub.emit("messages");
  } catch { /* non-fatal */ }
}

/** Devuelve mensajes en los que `userId` aparece como remitente o destinatario. */
export function getMessagesForUser(userId: string): AppMessage[] {
  return loadMessages().filter(
    (m) => m.fromUserId === userId || m.toUserId === userId,
  );
}

/** Devuelve mensajes relacionados con un pedido concreto. */
export function getMessagesForOrder(orderId: string): AppMessage[] {
  return loadMessages().filter((m) => m.orderId === orderId);
}

/** Cuenta mensajes no leídos recibidos por `userId` (o por admin si userId === "admin"). */
export function getUnreadCount(userId: string): number {
  return loadMessages().filter((m) => m.toUserId === userId && !m.read).length;
}

/**
 * Crea y persiste un nuevo mensaje. Asigna id único y timestamp.
 * Devuelve el mensaje creado.
 */
export function sendMessage(
  input: Omit<AppMessage, "id" | "date" | "read"> & Partial<Pick<AppMessage, "id" | "date" | "read">>,
): AppMessage {
  const msg: AppMessage = {
    id: input.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: input.date ?? new Date().toISOString(),
    read: input.read ?? false,
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    fromName: input.fromName,
    toName: input.toName,
    subject: input.subject,
    body: input.body,
    orderId: input.orderId,
    parentId: input.parentId,
    isBroadcast: input.isBroadcast,
    broadcastId: input.broadcastId,
  };
  const all = loadMessages();
  saveMessages([msg, ...all]);
  return msg;
}

/** Marca un mensaje como leído. */
export function markAsRead(messageId: string): void {
  const all = loadMessages();
  const idx = all.findIndex((m) => m.id === messageId);
  if (idx < 0 || all[idx].read) return;
  all[idx] = { ...all[idx], read: true };
  saveMessages(all);
}

/** Marca todos los mensajes dirigidos a `userId` como leídos. */
export function markAllAsRead(userId: string): number {
  const all = loadMessages();
  let changed = 0;
  for (let i = 0; i < all.length; i++) {
    if (all[i].toUserId === userId && !all[i].read) {
      all[i] = { ...all[i], read: true };
      changed++;
    }
  }
  if (changed > 0) saveMessages(all);
  return changed;
}

/** Borra un mensaje (uso admin / RGPD). */
export function deleteMessage(messageId: string): boolean {
  const all = loadMessages();
  const next = all.filter((m) => m.id !== messageId);
  if (next.length === all.length) return false;
  saveMessages(next);
  return true;
}
