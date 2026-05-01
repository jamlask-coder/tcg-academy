/**
 * GET /api/admin/users/[handle]
 *
 * Resuelve un usuario por handle (username) o por id directo. Usado en
 * `/admin/usuarios/[id]` y `/admin/notificaciones` para no leer
 * `tcgacademy_registered` desde localStorage del navegador admin.
 *
 * `handle` se prueba en este orden:
 *   1. username exacto (preferido)
 *   2. id exacto (UUID o id legacy)
 *   3. email exacto
 *
 * Sólo accesible para `role = "admin"`.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { getDb, type UserRecord } from "@/lib/db";
import { logger } from "@/lib/logger";
import { slugifyName } from "@/lib/userHandle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminAddressDetail {
  id: string;
  alias?: string;
  calle: string;
  numero?: string;
  piso?: string;
  cp: string;
  ciudad: string;
  provincia?: string;
  pais: string;
  telefono?: string;
  predeterminada: boolean;
}

interface AdminCompanyDetail {
  cif?: string;
  razonSocial?: string;
  direccionFiscal?: string;
  cpFiscal?: string;
  ciudadFiscal?: string;
  provinciaFiscal?: string;
  paisFiscal?: string;
  contactoNombre?: string;
  companyPhone?: string;
  billingEmail?: string;
}

interface AdminUserDetail {
  id: string;
  email: string;
  username?: string;
  name: string;
  lastName: string;
  phone?: string;
  role: UserRecord["role"];
  registeredAt: string;
  /** ISO completo de createdAt (no solo fecha). Útil para mostrar hora exacta. */
  registeredAtIso?: string;
  nif?: string;
  nifType?: UserRecord["nifType"];
  birthDate?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  referralCode?: string;
  referredBy?: string;
  /** Último heartbeat del cliente — el admin lo usa para el indicador online. */
  lastSeenAt?: string;
  /** Direcciones de envío (todas, no solo la primera). */
  addresses: AdminAddressDetail[];
  /** Datos B2B si role ∈ {mayorista,tienda} y existe profile. */
  company?: AdminCompanyDetail;
  /** Conteo de referidos directos (resuelto vía referredBy === user.referralCode). */
  referralsCount: number;
}

function toDetail(
  u: UserRecord,
  addresses: AdminAddressDetail[],
  company: AdminCompanyDetail | undefined,
  referralsCount: number,
): AdminUserDetail {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    name: u.name,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role,
    registeredAt: (u.createdAt ?? "").slice(0, 10),
    registeredAtIso: u.createdAt,
    nif: u.nif,
    nifType: u.nifType,
    birthDate: u.birthDate,
    emailVerified: u.emailVerified,
    emailVerifiedAt: u.emailVerifiedAt,
    referralCode: u.referralCode,
    referredBy: u.referredBy,
    lastSeenAt: u.lastSeenAt,
    addresses,
    company,
    referralsCount,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> },
) {
  const adminResult = await requireAdmin(req);
  if (adminResult instanceof NextResponse) return adminResult;

  const { handle } = await params;
  const decoded = decodeURIComponent(handle).trim();
  if (!decoded) {
    return NextResponse.json({ ok: false, error: "Handle vacío" }, { status: 400 });
  }

  try {
    const db = getDb();
    // 1. username
    let user = await db.getUserByUsername(decoded);
    // 2. id
    if (!user) user = await db.getUser(decoded);
    // 3. email (sólo si parece email — evita falsos positivos)
    if (!user && decoded.includes("@")) {
      user = await db.getUserByEmail(decoded);
    }
    // 4. slug derivado de name+lastName — cubre el caso de usuarios Google
    //    históricos sin `username` (bug pre-2026-05-01: el handle de la URL
    //    es slug(name lastName) pero la BD no lo tenía indexado). Listamos
    //    usuarios y matcheamos por slug — Y por prefijo de email (legacy:
    //    el listado antes inventaba el handle como email.split("@")[0], y
    //    siguen circulando enlaces con ese formato en bookmarks admin).
    if (!user) {
      const needle = decoded.toLowerCase();
      const all = await db.listAllUsers({ limit: 5000 });
      user =
        all.find((u) => {
          const full = [u.name, u.lastName].filter(Boolean).join(" ");
          if (full && slugifyName(full) === needle) return true;
          const emailPrefix = u.email.split("@")[0]?.toLowerCase();
          if (emailPrefix && emailPrefix === needle) return true;
          return false;
        }) ?? null;
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    // ── Datos relacionados que cuelgan del ID-Usuario ────────────────────────
    // Cargamos addresses + company profile en paralelo. Si la migración aún
    // no creó las tablas, los métodos devuelven [] / null y la UI renderiza
    // "Sin direcciones" en vez de romper.
    const [addressRows, companyRow] = await Promise.all([
      db.getAddresses(user.id).catch(() => []),
      db.getCompanyProfile(user.id).catch(() => null),
    ]);

    const addresses: AdminAddressDetail[] = addressRows.map((a) => ({
      id: a.id,
      alias: a.label,
      calle: a.street,
      // El AddressRecord no separa numero del street — ya viene concatenado.
      numero: undefined,
      piso: a.floor,
      cp: a.postalCode,
      ciudad: a.city,
      provincia: a.province,
      pais: a.country,
      telefono: a.phone,
      predeterminada: a.isDefault,
    }));

    const isB2B = user.role === "mayorista" || user.role === "tienda";
    let company: AdminCompanyDetail | undefined;
    if (isB2B && companyRow) {
      company = {
        cif: companyRow.cif,
        razonSocial: companyRow.legalName,
        direccionFiscal: companyRow.fiscalAddress,
        contactoNombre: companyRow.contactPerson,
        companyPhone: companyRow.companyPhone,
        billingEmail: companyRow.billingEmail,
      };
    } else if (isB2B && user.nif) {
      // Sin company_profile pero el usuario tiene NIF → para B2B sirve como CIF
      // a efectos de mostrar algo. La UI marca "datos fiscales incompletos".
      company = { cif: user.nif };
    }

    // Conteo de referidos directos: usuarios cuyo referredBy === user.referralCode.
    // listAllUsers es caro pero solo se llama desde admin y devuelve hasta 5000.
    let referralsCount = 0;
    if (user.referralCode) {
      try {
        const all = await db.listAllUsers({ limit: 5000 });
        referralsCount = all.filter((u) => u.referredBy === user.referralCode).length;
      } catch {
        referralsCount = 0;
      }
    }

    logger.info(`Admin user detail returned`, "api/admin/users/[handle]", {
      adminId: adminResult.id,
      targetId: user.id,
    });
    return NextResponse.json({
      ok: true,
      user: toDetail(user, addresses, company, referralsCount),
    });
  } catch (err) {
    logger.error("Failed to fetch admin user detail", "api/admin/users/[handle]", {
      adminId: adminResult.id,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: "Error al cargar usuario" },
      { status: 500 },
    );
  }
}
