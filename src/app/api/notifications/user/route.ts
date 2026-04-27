/**
 * /api/notifications/user — Notificaciones in-app por usuario.
 *
 * Distinto de `/api/notifications` (legacy) que dispara emails de pedido.
 * Esta ruta gestiona la "campana" del header.
 *
 * GET    ?userId=<id>         → lista
 * POST   { userId, type, title, message, link } → crea
 * PATCH  { id, isRead }       → marca leída
 * DELETE ?userId=<id>         → vacía las del usuario
 */

import { type NextRequest, NextResponse } from "next/server";
import { getDb, type NotificationRecord } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";

function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

export async function GET(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ notifications: [] });
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? auth.id;
  if (userId !== auth.id && auth.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const notifications = await getDb().getNotifications({ userId, scope: "user" });
    return NextResponse.json({ notifications });
  } catch (err) {
    logger.error("api/notifications/user GET failed", "api.notifications", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ ok: true, mode: "local" });
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as Partial<NotificationRecord>;
    if (!body.title || !body.message || !body.type) {
      return NextResponse.json({ error: "title, message, type requeridos" }, { status: 400 });
    }
    // Solo admin puede crear notificaciones para terceros; usuario normal solo para sí.
    const targetUserId = body.userId ?? auth.id;
    if (targetUserId !== auth.id && auth.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const notif = await getDb().createNotification({
      scope: body.scope ?? "user",
      userId: targetUserId,
      type: body.type,
      title: body.title,
      message: body.message,
      link: body.link,
    });
    return NextResponse.json({ notification: notif });
  } catch (err) {
    logger.error("api/notifications/user POST failed", "api.notifications", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ ok: true, mode: "local" });
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id, isRead } = (await req.json()) as { id?: string; isRead?: boolean };
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    if (isRead) await getDb().markNotificationRead(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("api/notifications/user PATCH failed", "api.notifications", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ ok: true, mode: "local" });
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? auth.id;
  if (userId !== auth.id && auth.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    await getDb().clearNotifications(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("api/notifications/user DELETE failed", "api.notifications", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}
