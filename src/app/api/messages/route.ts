/**
 * /api/messages — CRUD de mensajes cliente ↔ admin.
 *
 * GET  ?userId=<id>         → lista de mensajes donde `userId` es from o to
 * POST { fromUserId, toUserId, subject, body, ... } → crea mensaje
 * PATCH { id, isRead }      → marca como leído / actualiza
 *
 * En modo local, devuelve [] / no-op (la UI ya gestiona localStorage).
 */

import { type NextRequest, NextResponse } from "next/server";
import { getDb, type MessageRecord } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";

function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

export async function GET(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ messages: [] });
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? auth.id;

  // Solo admin puede listar mensajes de otro usuario.
  if (userId !== auth.id && auth.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const messages = await getDb().getMessages(userId);
    return NextResponse.json({ messages });
  } catch (err) {
    logger.error("api/messages GET failed", "api.messages", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ ok: true, mode: "local" });
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as Partial<MessageRecord>;
    if (!body.subject || !body.body) {
      return NextResponse.json({ error: "subject y body requeridos" }, { status: 400 });
    }
    // Nunca confiar en fromUserId del cliente — usar auth.id.
    // Solo admin puede emitir broadcasts (is_broadcast / broadcast_id).
    const isAdmin = auth.role === "admin";
    const msg = await getDb().sendMessage({
      fromUserId: auth.id,
      toUserId: body.toUserId ?? "admin",
      orderId: body.orderId,
      subject: body.subject,
      body: body.body,
      parentId: body.parentId,
      isBroadcast: isAdmin ? Boolean(body.isBroadcast) : false,
      broadcastId: isAdmin ? body.broadcastId : undefined,
    });
    return NextResponse.json({ message: msg });
  } catch (err) {
    logger.error("api/messages POST failed", "api.messages", { err: String(err) });
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
    if (isRead) await getDb().markMessageRead(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("api/messages PATCH failed", "api.messages", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}
