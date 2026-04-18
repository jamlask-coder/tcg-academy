"use client";

/**
 * FiscalDataGuard — Capa de seguridad legal.
 *
 * Si el usuario está logueado pero no tiene NIF válido, redirige forzosamente
 * a `/cuenta/completar-datos` cuando intenta acceder a rutas que disparan
 * una factura (checkout / confirmación de pedido).
 *
 * Esto garantiza Art. 6.1.d RD 1619/2012: ninguna factura sale sin NIF.
 *
 * Diseño: lista de rutas PROTEGIDAS (opt-in) en vez de lista de exentas. Así
 * el usuario puede navegar el catálogo, ver productos, consultar su cuenta
 * y rellenar su NIF sin que el guard le redirija en bucle desde `/`.
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isValidNIF } from "@/lib/validations/nif";

/** Rutas que requieren NIF válido para entrar (disparan factura o pedido). */
const PROTECTED_PATHS = ["/finalizar-compra", "/checkout"];

export function FiscalDataGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;
    const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
    if (!isProtected) return;
    if (!isValidNIF(user.nif)) {
      router.replace(
        `/cuenta/completar-datos?return=${encodeURIComponent(pathname)}`,
      );
    }
  }, [user, pathname, router]);

  return <>{children}</>;
}
