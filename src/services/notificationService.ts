/**
 * Servicio de notificaciones dinámicas por usuario.
 *
 * Doble modo:
 * - **local**: persistencia única en `tcgacademy_notif_dynamic` keyed por
 *   userId. Funciona offline, pero no se sincroniza entre dispositivos.
 * - **server**: el LS sigue siendo cache para preservar el API sync que
 *   consumen ~10 componentes; las escrituras se replican a `/api/notifications/user`
 *   (fire-and-forget) y un hidratador de boot (`AppHydrator`) las pre-carga.
 */

import type { Notification } from "@/data/mockData";
import { DataHub } from "@/lib/dataHub";

const DYNAMIC_KEY = "tcgacademy_notif_dynamic";

function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

function readAll(): Record<string, Notification[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DYNAMIC_KEY) ?? "{}") as Record<
      string,
      Notification[]
    >;
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, Notification[]>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DYNAMIC_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota */
  }
}

export function loadUserNotifications(userId: string): Notification[] {
  return readAll()[userId] ?? [];
}

/**
 * Hidrata desde el servidor (server mode). Idempotente: substituye lo
 * que haya en LS para `userId`. Llamada típicamente por `AppHydrator`.
 */
export async function hydrateUserNotifications(userId: string): Promise<void> {
  if (!isServerMode() || typeof window === "undefined") return;
  try {
    const res = await fetch(`/api/notifications/user?userId=${encodeURIComponent(userId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const json = (await res.json()) as { notifications?: Array<Record<string, unknown>> };
    const list: Notification[] = (json.notifications ?? []).map((n) => ({
      id: String(n.id ?? ""),
      type: String(n.type ?? "sistema") as Notification["type"],
      title: String(n.title ?? ""),
      message: String(n.message ?? ""),
      link: typeof n.link === "string" ? n.link : undefined,
      read: Boolean(n.isRead ?? false),
      date: String(n.createdAt ?? new Date().toISOString()),
    }));
    const all = readAll();
    all[userId] = list;
    writeAll(all);
    DataHub.emit("notifications");
  } catch {
    /* network/transient — el LS sigue siendo válido como cache */
  }
}

export function pushUserNotification(
  userId: string,
  notif: Omit<Notification, "id" | "read">,
): void {
  if (typeof window === "undefined") return;
  const all = readAll();
  const newNotif: Notification = {
    ...notif,
    // `crypto.randomUUID()` es atómico y criptográficamente único; elimina la
    // ventana de colisión de `Date.now()+Math.random()` (≈60M combos por ms)
    // que se abría si se disparaban varias notificaciones al mismo usuario
    // en el mismo tick (p.ej. tras un bulk mail masivo).
    id: `dyn-${crypto.randomUUID()}`,
    read: false,
  };
  all[userId] = [newNotif, ...(all[userId] ?? [])];
  writeAll(all);
  // Canonical event (DataHub fires `tcga:notifications:updated`). Keeps the
  // legacy `tcga:notification:new` dispatch for back-compat until every
  // subscriber migrates.
  DataHub.emit("notifications");
  window.dispatchEvent(new Event("tcga:notification:new"));

  // Server mode: replica al backend (fire-and-forget; LS ya muestra el cambio).
  if (isServerMode()) {
    void fetch("/api/notifications/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        type: newNotif.type,
        title: newNotif.title,
        message: newNotif.message,
        link: newNotif.link,
      }),
    }).catch(() => {
      /* offline / transient — la notif sigue en LS */
    });
  }
}

/** Marca una notificación como leída (optimista + replica). */
export function markUserNotificationRead(userId: string, notifId: string): void {
  if (typeof window === "undefined") return;
  const all = readAll();
  const list = all[userId] ?? [];
  const idx = list.findIndex((n) => n.id === notifId);
  if (idx < 0 || list[idx].read) return;
  list[idx] = { ...list[idx], read: true };
  all[userId] = list;
  writeAll(all);
  DataHub.emit("notifications");

  if (isServerMode() && !notifId.startsWith("dyn-")) {
    void fetch("/api/notifications/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notifId, isRead: true }),
    }).catch(() => {});
  }
}
