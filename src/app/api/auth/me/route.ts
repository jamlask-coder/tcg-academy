/**
 * GET /api/auth/me
 *
 * Hidrata la sesión del usuario actual desde la cookie JWT (`tcga_session`).
 *
 *   - 200 `{ ok: true, user }`   → sesión válida.
 *   - 200 `{ ok: false }`        → no hay sesión (visitante anónimo). NO es
 *                                   un error: el endpoint reporta estado.
 *                                   Devolverlo como 401 ensucia la consola
 *                                   del navegador en cada visita anónima
 *                                   (Refused to load… 401) y rompe los
 *                                   tests de "no console errors".
 *   - 401 `{ ok: false, error }` → cookie presente pero el usuario que
 *                                   referencia ya no existe en BD: forzamos
 *                                   logout en el cliente.
 *   - 500                         → error interno hidratando.
 *
 * Lo usa `AuthContext` al montar la app en server mode, en lugar de leer el
 * usuario desde localStorage. La cookie httpOnly es la fuente de verdad —
 * localStorage queda solo como caché optimista para que el header se pinte
 * sin esperar al fetch.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isServerMode = () =>
  (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

export async function GET(req: NextRequest) {
  // En modo local, no hay sesión server-side — devolvemos 204 para que el
  // cliente sepa que debe leer localStorage (rama legacy del AuthContext).
  if (!isServerMode()) {
    return new NextResponse(null, { status: 204 });
  }

  const session = await getSessionFromRequest(req);
  if (!session?.sub) {
    // Sin sesión = estado válido para un visitante anónimo. Devolvemos 200
    // con `ok:false` para que el navegador no registre un error en consola
    // (el AuthContext sólo mira `res.ok && data.ok`, su comportamiento no
    // cambia: si `ok:false` no setea user).
    return NextResponse.json({ ok: false });
  }

  try {
    const db = getDb();
    const user = await db.getUser(session.sub);
    if (!user) {
      // Cookie válida pero el usuario fue eliminado. Forzamos logout.
      return NextResponse.json({ ok: false, error: "user-not-found" }, { status: 401 });
    }

    // Cargar entidades 1-a-N del usuario en paralelo. Si alguna falla, log y
    // devolver array/null por defecto — no debe tirar abajo la hidratación.
    const [addresses, company, favorites] = await Promise.all([
      db.getAddresses(user.id).catch((err) => {
        logger.error("getAddresses failed", "/api/auth/me", { err: String(err) });
        return [];
      }),
      db.getCompanyProfile(user.id).catch((err) => {
        logger.error("getCompanyProfile failed", "/api/auth/me", { err: String(err) });
        return null;
      }),
      db.getFavorites(user.id).catch((err) => {
        logger.error("getFavorites failed", "/api/auth/me", { err: String(err) });
        return [];
      }),
    ]);

    // Mapear AddressRecord (BD) → Address (cliente).
    const mappedAddresses = addresses.map((a) => ({
      id: a.id,
      label: a.label,
      // Schema BD guarda "calle número" en `street` concatenado.
      // Para no romper el formulario, separamos en último token numérico.
      calle: a.street.replace(/\s+\S+$/, "").trim() || a.street,
      numero: (a.street.match(/\s+(\S+)$/)?.[1] ?? ""),
      piso: a.floor ?? "",
      cp: a.postalCode,
      ciudad: a.city,
      provincia: a.province,
      pais: a.country,
      telefono: a.phone ?? "",
      predeterminada: a.isDefault,
      // Recipient (nombre destinatario) → split en nombre/apellidos best-effort.
      nombre: a.recipient.split(" ")[0] ?? "",
      apellidos: a.recipient.split(" ").slice(1).join(" "),
    }));

    // Mapear CompanyProfileRecord → empresa del cliente.
    const mappedEmpresa = company
      ? {
          cif: company.cif,
          razonSocial: company.legalName,
          direccionFiscal: company.fiscalAddress,
          personaContacto: company.contactPerson,
          telefonoEmpresa: company.companyPhone ?? "",
          emailFacturacion: company.billingEmail ?? "",
        }
      : undefined;

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        nif: user.nif,
        nifType: user.nifType,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        birthDate: user.birthDate,
        createdAt: user.createdAt,
        addresses: mappedAddresses,
        empresa: mappedEmpresa,
        favorites: favorites.map((f) => f.productId),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al hidratar sesión";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
