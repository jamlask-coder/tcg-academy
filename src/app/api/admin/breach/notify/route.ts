/**
 * POST /api/admin/breach/notify
 * Body: { incident: BreachIncident, notifyAepd: boolean, notifyDpo: boolean }
 *
 * Dispara emails a AEPD y/o DPO usando el adapter de email real (Resend en
 * server mode, local-log en dev). El registro del incidente vive en el cliente;
 * este endpoint solo se encarga del envío porque Resend exige credenciales
 * servidor.
 */

import { NextResponse } from "next/server";
import { verifyBackupAdmin } from "@/lib/backup/adminAuth";
import { getEmailService } from "@/lib/email";
import type { BreachIncident } from "@/lib/backup/types";
import {
  renderBreachEmailHtml,
  getBreachEmailSubject,
} from "@/services/breachNotificationService";

export const runtime = "nodejs";

interface NotifyBody {
  incident?: BreachIncident;
  notifyAepd?: boolean;
  notifyDpo?: boolean;
}

export async function POST(req: Request) {
  const auth = verifyBackupAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as NotifyBody | null;
  if (!body?.incident?.id) {
    return NextResponse.json({ ok: false, error: "falta_incident" }, { status: 400 });
  }

  const email = getEmailService();
  const subject = getBreachEmailSubject(body.incident);
  const html = renderBreachEmailHtml(body.incident);
  const sentTo: string[] = [];

  if (body.notifyAepd) {
    const aepd = process.env.AEPD_NOTIFICATION_EMAIL ?? "brecha@aepd.es";
    await email.sendEmail(aepd, subject, html);
    sentTo.push(aepd);
  }
  if (body.notifyDpo && body.incident.dpoEmail) {
    await email.sendEmail(body.incident.dpoEmail, subject, html);
    sentTo.push(body.incident.dpoEmail);
  }
  return NextResponse.json({ ok: true, sentTo });
}
