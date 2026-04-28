/**
 * GET /api/admin/settings  → lee la configuración real desde la BD.
 * PUT /api/admin/settings  → persiste cambios en la BD.
 *
 * Antes este endpoint devolvía DEFAULT_SETTINGS (variables de entorno) y el
 * PUT hacía echo sin escribir. El panel /admin/emails guardaba en localStorage,
 * por lo que el cambio NUNCA llegaba al servidor que envía las notificaciones
 * de pedidos. Ahora ambos extremos van contra la misma fila de `settings`
 * en Supabase (claves `notification_email`, `email_sender_name`, `reply_to_email`).
 *
 * Se aceptan ambos shapes (legacy `adminEmail` y nuevo `notificationEmail`)
 * porque el front las usa indistintamente.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SITE_CONFIG } from "@/config/siteConfig";
import { STORES } from "@/data/stores";
import { assertSameOrigin, requireAdmin } from "@/lib/apiAuth";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface AdminSettings {
  /** Email donde llegan las notificaciones del sistema (pedidos, incidencias). */
  notificationEmail: string;
  /** Nombre del remitente que aparece en los emails al cliente. */
  senderName: string;
  /** Reply-To en los emails al cliente. */
  replyToEmail: string;
  /** Por-tienda override (si una tienda quiere su propia dirección). */
  storeEmails: Record<string, string>;
}

const FALLBACK_NOTIFICATION_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL ?? SITE_CONFIG.email;

const DEFAULT_SETTINGS: AdminSettings = {
  notificationEmail: FALLBACK_NOTIFICATION_EMAIL,
  senderName: SITE_CONFIG.name,
  replyToEmail: SITE_CONFIG.email,
  storeEmails: Object.fromEntries(
    Object.values(STORES).map((s) => [s.id, s.email]),
  ),
};

async function readFromDb(): Promise<AdminSettings> {
  const db = getDb();
  const [notif, sender, replyTo, storeEmailsRaw] = await Promise.all([
    db.getSetting("notification_email"),
    db.getSetting("email_sender_name"),
    db.getSetting("reply_to_email"),
    db.getSetting("store_emails_json"),
  ]);
  let storeEmails = DEFAULT_SETTINGS.storeEmails;
  if (storeEmailsRaw) {
    try {
      const parsed = JSON.parse(storeEmailsRaw);
      if (parsed && typeof parsed === "object") {
        storeEmails = { ...DEFAULT_SETTINGS.storeEmails, ...parsed };
      }
    } catch {
      // Si el JSON está corrupto, ignoramos y dejamos los defaults.
    }
  }
  return {
    notificationEmail: notif ?? DEFAULT_SETTINGS.notificationEmail,
    senderName: sender ?? DEFAULT_SETTINGS.senderName,
    replyToEmail: replyTo ?? DEFAULT_SETTINGS.replyToEmail,
    storeEmails,
  };
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const settings = await readFromDb();
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    logger.error("GET failed", "admin-settings", { err: String(err) });
    // Si la BD falla devolvemos defaults — la pantalla queda usable.
    return NextResponse.json({ ok: true, settings: DEFAULT_SETTINGS });
  }
}

export async function PUT(req: NextRequest) {
  const sameOrigin = assertSameOrigin(req);
  if (sameOrigin) return sameOrigin;

  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await req.json();
    // Aceptamos legacy `adminEmail` + nuevo `notificationEmail`.
    const notificationEmail =
      typeof body?.notificationEmail === "string"
        ? body.notificationEmail
        : typeof body?.adminEmail === "string"
          ? body.adminEmail
          : null;
    const senderName =
      typeof body?.senderName === "string" ? body.senderName : null;
    const replyToEmail =
      typeof body?.replyToEmail === "string" ? body.replyToEmail : null;
    const storeEmails =
      body?.storeEmails && typeof body.storeEmails === "object"
        ? (body.storeEmails as Record<string, string>)
        : null;

    const db = getDb();
    const writes: Promise<void>[] = [];
    if (notificationEmail) {
      writes.push(db.updateSettings("notification_email", notificationEmail));
      // Mantenemos `admin_email` sincronizado para clientes legacy.
      writes.push(db.updateSettings("admin_email", notificationEmail));
    }
    if (senderName) {
      writes.push(db.updateSettings("email_sender_name", senderName));
    }
    if (replyToEmail) {
      writes.push(db.updateSettings("reply_to_email", replyToEmail));
    }
    if (storeEmails) {
      writes.push(
        db.updateSettings("store_emails_json", JSON.stringify(storeEmails)),
      );
    }
    await Promise.all(writes);

    const settings = await readFromDb();
    return NextResponse.json({
      ok: true,
      settings,
      message: "Ajustes actualizados.",
    });
  } catch (err) {
    logger.error("PUT failed", "admin-settings", { err: String(err) });
    return NextResponse.json(
      { error: "Error al guardar ajustes" },
      { status: 500 },
    );
  }
}
