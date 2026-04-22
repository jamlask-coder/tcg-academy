/**
 * Servicio de notificaciones dinámicas por usuario.
 * Almacena notificaciones personales (distintas de las mock globales) en
 * tcgacademy_notif_dynamic keyed por userId.
 *
 * NOTE (backend): reemplazar con POST /api/notifications y GET /api/notifications/:userId
 */

import type { Notification } from "@/data/mockData";
import { DataHub } from "@/lib/dataHub";

const DYNAMIC_KEY = "tcgacademy_notif_dynamic";

export function loadUserNotifications(userId: string): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(
      localStorage.getItem(DYNAMIC_KEY) ?? "{}",
    ) as Record<string, Notification[]>;
    return all[userId] ?? [];
  } catch {
    return [];
  }
}

export function pushUserNotification(
  userId: string,
  notif: Omit<Notification, "id" | "read">,
): void {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(
      localStorage.getItem(DYNAMIC_KEY) ?? "{}",
    ) as Record<string, Notification[]>;
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
    localStorage.setItem(DYNAMIC_KEY, JSON.stringify(all));
    // Canonical event (DataHub fires `tcga:notifications:updated`). Keeps the
    // legacy `tcga:notification:new` dispatch for back-compat until every
    // subscriber migrates.
    DataHub.emit("notifications");
    window.dispatchEvent(new Event("tcga:notification:new"));
  } catch {
    /* ignore quota */
  }
}
