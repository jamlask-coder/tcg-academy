/**
 * Servicio de notificaciones dinámicas por usuario.
 * Almacena notificaciones personales (distintas de las mock globales) en
 * tcgacademy_notif_dynamic keyed por userId.
 *
 * NOTE (backend): reemplazar con POST /api/notifications y GET /api/notifications/:userId
 */

import type { Notification } from "@/data/mockData";

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
      id: `dyn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      read: false,
    };
    all[userId] = [newNotif, ...(all[userId] ?? [])];
    localStorage.setItem(DYNAMIC_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("tcga:notification:new"));
  } catch {
    /* ignore quota */
  }
}
