"use client";

/**
 * AppHydrator — pre-carga caches con datos del servidor en server mode.
 *
 * Vive dentro de <Providers> para garantizar que se monta una sola vez en el
 * árbol cliente. Si BACKEND_MODE=local, todas las hidrataciones son no-op.
 *
 * Hidrata:
 *  - catálogo (productos) — siempre, no requiere user
 *  - mensajes y notificaciones — solo si hay user en sesión, depende de
 *    AuthContext, por eso lee `tcgacademy_user` directamente (evita
 *    crear ciclo entre AuthProvider y este componente).
 *
 * No renderiza nada visible.
 */

import { useEffect } from "react";
import { hydrateProductCache } from "@/lib/productCache";
import { hydrateUserNotifications } from "@/services/notificationService";
import { hydrateMessagesForUser } from "@/services/messageService";

function readCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("tcgacademy_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string };
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

export function AppHydrator() {
  useEffect(() => {
    void hydrateProductCache().catch(() => {});

    const userId = readCurrentUserId();
    if (userId) {
      void hydrateUserNotifications(userId).catch(() => {});
      void hydrateMessagesForUser(userId).catch(() => {});
    }
  }, []);
  return null;
}
