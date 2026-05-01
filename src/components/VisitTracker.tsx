"use client";

/**
 * VisitTracker — registra cada cambio de ruta del usuario autenticado.
 *
 * Por qué: el panel /admin/usuarios/[id] necesita datos REALES de actividad
 * (visitas/mes, páginas vistas, primera/última visita). Antes mostraba una
 * serie inventada con seed determinista — engañoso para el admin que toma
 * decisiones de negocio sobre esos números.
 *
 * Cómo:
 *   - usePathname() del App Router: dispara en cada SPA navigation.
 *   - POST /api/activity/visit con el path actual.
 *   - El servidor sanea, throttlea (5s/usuario), filtra /admin /api /assets
 *     y rate-limita por IP. Si no hay sesión, responde 204 vacío.
 *   - Best-effort: si falla la red, ignoramos. La analítica nunca debe
 *     romper UX.
 *
 * Montado una vez en Providers.tsx — no necesita auth context, el endpoint
 * decide a partir de la cookie httpOnly.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Paths que no enviamos al servidor — ahorra 1 request por navegación admin. */
const SKIP_PREFIXES = ["/admin", "/api", "/_next"];

export function VisitTracker() {
  const pathname = usePathname();
  // Evita enviar dos veces el mismo path consecutivo (StrictMode dev double-render
  // o re-render por cambio de query string que el App Router agrupa en pathname).
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return;
    }
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    // Fire-and-forget. El endpoint responde 204 sin body en cualquier caso.
    void fetch("/api/activity/visit", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      // keepalive: si el usuario navega rápido, el browser garantiza envío.
      keepalive: true,
    }).catch(() => {
      // Silenciosamente ignorado — analítica best-effort.
    });
  }, [pathname]);

  return null;
}
