import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { SITE_CONFIG } from "@/config/siteConfig";
import { STORES } from "@/data/stores";

export interface AdminSettings {
  adminEmail: string;
  senderName: string;
  replyToEmail: string;
  storeEmails: Record<string, string>;
}

// Los defaults se derivan de la configuración central del sitio y del registro
// de tiendas — nunca se hardcodean direcciones de correo ni nombres aquí.
const DEFAULT_SETTINGS: AdminSettings = {
  adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL ?? SITE_CONFIG.email,
  senderName: SITE_CONFIG.name,
  replyToEmail: SITE_CONFIG.email,
  storeEmails: Object.fromEntries(
    Object.values(STORES).map((s) => [s.id, s.email]),
  ),
};

// GET /api/admin/settings — Get current admin settings
export async function GET() {
  // TODO: Verify admin auth
  // TODO: In server mode, fetch from getDb().getSettings()

  // Local mode: return defaults (client reads from localStorage directly)
  return NextResponse.json({
    ok: true,
    settings: DEFAULT_SETTINGS,
  });
}

// PUT /api/admin/settings — Update admin settings
export async function PUT(req: NextRequest) {
  try {
    // TODO: Verify admin auth
    const body = await req.json();
    const { adminEmail, senderName, replyToEmail, storeEmails } = body;

    const updated: AdminSettings = {
      adminEmail: adminEmail ?? DEFAULT_SETTINGS.adminEmail,
      senderName: senderName ?? DEFAULT_SETTINGS.senderName,
      replyToEmail: replyToEmail ?? DEFAULT_SETTINGS.replyToEmail,
      storeEmails: storeEmails ?? DEFAULT_SETTINGS.storeEmails,
    };

    // TODO: In server mode, persist via getDb().updateSettings(updated)

    return NextResponse.json({
      ok: true,
      settings: updated,
      message: "Ajustes actualizados.",
    });
  } catch {
    return NextResponse.json(
      { error: "Error al guardar ajustes" },
      { status: 500 },
    );
  }
}
