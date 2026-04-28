/**
 * GET /api/admin/email-templates
 *   → devuelve overrides de plantillas custom guardados en BD
 *     (settings.email_custom_templates_json).
 * PUT /api/admin/email-templates
 *   → persiste el JSON completo de overrides.
 *
 * Antes los overrides solo vivían en localStorage del browser del admin,
 * por lo que los envíos disparados por el server (cron / webhook / API)
 * usaban siempre la plantilla por defecto, ignorando las customizaciones.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, requireAdmin } from "@/lib/apiAuth";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

const SETTINGS_KEY = "email_custom_templates_json";

type OverrideShape = Record<string, { subject: string; html: string }>;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const db = getDb();
    const raw = await db.getSetting(SETTINGS_KEY);
    let overrides: OverrideShape = {};
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") overrides = parsed;
      } catch {
        // JSON corrupto: devolvemos {} para que el front no rompa.
      }
    }
    return NextResponse.json({ ok: true, overrides });
  } catch (err) {
    logger.error("GET email-templates failed", "admin-email-templates", { err: String(err) });
    return NextResponse.json({ ok: true, overrides: {} });
  }
}

export async function PUT(req: NextRequest) {
  const sameOrigin = assertSameOrigin(req);
  if (sameOrigin) return sameOrigin;

  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await req.json();
    const overrides =
      body && typeof body === "object" && body.overrides && typeof body.overrides === "object"
        ? (body.overrides as OverrideShape)
        : null;

    if (!overrides) {
      return NextResponse.json({ error: "Body inválido — falta `overrides`" }, { status: 400 });
    }

    // Validación liviana: cada entry debe tener subject + html string.
    for (const [id, value] of Object.entries(overrides)) {
      if (
        typeof value !== "object" ||
        value === null ||
        typeof (value as { subject?: unknown }).subject !== "string" ||
        typeof (value as { html?: unknown }).html !== "string"
      ) {
        return NextResponse.json(
          { error: `Override "${id}" inválido` },
          { status: 400 },
        );
      }
    }

    const db = getDb();
    await db.updateSettings(SETTINGS_KEY, JSON.stringify(overrides));
    return NextResponse.json({ ok: true, overrides });
  } catch (err) {
    logger.error("PUT email-templates failed", "admin-email-templates", { err: String(err) });
    return NextResponse.json({ error: "Error al guardar plantillas" }, { status: 500 });
  }
}
