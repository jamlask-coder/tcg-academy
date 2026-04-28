/**
 * messageService — SSOT para mensajes cliente ↔ admin.
 *
 * Modo dual:
 * - **local**: SSOT en `localStorage[MSG_STORAGE_KEY]` con fallback a
 *   `MOCK_MESSAGES` para que la UI demo aparezca poblada.
 * - **server**: el LS sigue siendo cache (preserva el API sync que consumen
 *   /cuenta/mensajes, /admin/mensajes, /admin/pedidos/[id], etc.). Las
 *   escrituras se replican a `/api/messages` y `hydrateMessagesForUser`
 *   refresca la cache al boot.
 *
 * Todas las mutaciones disparan `tcga:messages:updated` (DataHub).
 */

import { MOCK_MESSAGES, MSG_STORAGE_KEY, type AppMessage } from "@/data/mockData";
import { DataHub } from "@/lib/dataHub";

export type { AppMessage };

const MAX_MESSAGES = 2000;

function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

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
 * Hidrata desde el servidor en server mode. Trae los mensajes en los que
 * `userId` participa y los mergea con el cache LS (preserva los que vienen
 * de MOCK_MESSAGES en modo demo).
 */
export async function hydrateMessagesForUser(userId: string): Promise<void> {
  if (!isServerMode() || typeof window === "undefined") return;
  try {
    const res = await fetch(`/api/messages?userId=${encodeURIComponent(userId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const json = (await res.json()) as { messages?: Array<Record<string, unknown>> };
    const fromServer: AppMessage[] = (json.messages ?? []).map((m) => ({
      id: String(m.id ?? ""),
      fromUserId: String(m.fromUserId ?? ""),
      toUserId: String(m.toUserId ?? ""),
      fromName: String(m.fromName ?? ""),
      toName: String(m.toName ?? ""),
      subject: String(m.subject ?? ""),
      body: String(m.body ?? ""),
      date: String(m.createdAt ?? new Date().toISOString()),
      read: Boolean(m.isRead ?? false),
      orderId: typeof m.orderId === "string" ? m.orderId : undefined,
      parentId: typeof m.parentId === "string" ? m.parentId : undefined,
      isBroadcast: typeof m.isBroadcast === "boolean" ? m.isBroadcast : undefined,
      broadcastId: typeof m.broadcastId === "string" ? m.broadcastId : undefined,
    }));
    // Merge: server mensajes ganan sobre LS por id; preservamos los que LS
    // tiene pero server no (broadcast local, mocks).
    const existing = loadMessages();
    const byId = new Map<string, AppMessage>();
    for (const m of existing) byId.set(m.id, m);
    for (const m of fromServer) byId.set(m.id, m);
    const merged = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
    saveMessages(merged);
  } catch {
    /* offline — cache LS sigue siendo válido */
  }
}

/**
 * Crea y persiste un nuevo mensaje. Asigna id único y timestamp.
 * Devuelve el mensaje creado.
 */
export function sendMessage(
  input: Omit<AppMessage, "id" | "date" | "read"> & Partial<Pick<AppMessage, "id" | "date" | "read">>,
): AppMessage {
  const msg: AppMessage = {
    // UUID criptográfico: elimina la ventana de colisión si 2 mensajes se
    // envían en el mismo milisegundo con misma random seed (p.ej. broadcast
    // masivo a todos los clientes).
    id: input.id ?? `msg-${crypto.randomUUID()}`,
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

  // Server mode: replica al backend (fire-and-forget). El LS ya tiene el msg.
  // La metadata broadcast (`isBroadcast`, `broadcastId`) viaja al servidor
  // tras la migración `messages_broadcast.sql`: el destinatario ve el icono
  // de megáfono en cualquier dispositivo. Solo admin puede emitirla
  // (la API rechaza estos campos si auth.role !== "admin").
  if (isServerMode()) {
    void fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toUserId: msg.toUserId,
        subject: msg.subject,
        body: msg.body,
        orderId: msg.orderId,
        parentId: msg.parentId,
        isBroadcast: msg.isBroadcast,
        broadcastId: msg.broadcastId,
      }),
    }).catch(() => {});
  }
  return msg;
}

/** Marca un mensaje como leído. */
export function markAsRead(messageId: string): void {
  const all = loadMessages();
  const idx = all.findIndex((m) => m.id === messageId);
  if (idx < 0 || all[idx].read) return;
  all[idx] = { ...all[idx], read: true };
  saveMessages(all);

  if (isServerMode() && !messageId.startsWith("msg-") /* no-op for client-only ids */) {
    void fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: messageId, isRead: true }),
    }).catch(() => {});
  }
}

/** Marca todos los mensajes dirigidos a `userId` como leídos. */
export function markAllAsRead(userId: string): number {
  const all = loadMessages();
  let changed = 0;
  const toReplicate: string[] = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i].toUserId === userId && !all[i].read) {
      all[i] = { ...all[i], read: true };
      changed++;
      toReplicate.push(all[i].id);
    }
  }
  if (changed > 0) saveMessages(all);
  if (isServerMode()) {
    for (const id of toReplicate) {
      if (id.startsWith("msg-")) continue;
      void fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead: true }),
      }).catch(() => {});
    }
  }
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
