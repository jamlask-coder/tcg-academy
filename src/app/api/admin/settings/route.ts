import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SITE_CONFIG } from "@/config/siteConfig";
import { STORES } from "@/data/stores";
import { requireAdmin } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";

export interface AdminSettings {
  adminEmail: string;
  senderName: string;
  replyToEmail: string;
  storeEmails: Record<string, string>;
}

const DEFAULT_SETTINGS: AdminSettings = {
  adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL ?? SITE_CONFIG.email,
  senderName: SITE_CONFIG.name,
  replyToEmail: SITE_CONFIG.email,
  storeEmails: Object.fromEntries(
    Object.values(STORES).map((s) => [s.id, s.email]),
  ),
};

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  return NextResponse.json({
    ok: true,
    settings: DEFAULT_SETTINGS,
  });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await req.json();
    const { adminEmail, senderName, replyToEmail, storeEmails } = body ?? {};

    const updated: AdminSettings = {
      adminEmail: typeof adminEmail === "string" ? adminEmail : DEFAULT_SETTINGS.adminEmail,
      senderName: typeof senderName === "string" ? senderName : DEFAULT_SETTINGS.senderName,
      replyToEmail: typeof replyToEmail === "string" ? replyToEmail : DEFAULT_SETTINGS.replyToEmail,
      storeEmails: storeEmails && typeof storeEmails === "object" ? storeEmails : DEFAULT_SETTINGS.storeEmails,
    };

    return NextResponse.json({
      ok: true,
      settings: updated,
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
