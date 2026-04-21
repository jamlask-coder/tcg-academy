/**
 * POST /api/admin/backup-server/verify
 * Body: { id: string }
 *
 * Descarga el manifest + cada tabla cifrada, descifra y compara SHA-256 con el
 * registrado en el manifest. También verifica el hash encadenado (chainSha256).
 *
 * Un "ok: false" → posible manipulación o corrupción.
 */

import { NextResponse } from "next/server";
import { verifyBackupAdmin } from "@/lib/backup/adminAuth";
import { verifyBackup } from "@/lib/backup/backupJob";
import { isBackupS3Configured } from "@/lib/backup/s3Client";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = verifyBackupAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 });
  }
  if (!isBackupS3Configured()) {
    return NextResponse.json(
      { ok: false, error: "s3_not_configured" },
      { status: 501 },
    );
  }
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ ok: false, error: "falta_id" }, { status: 400 });
  }
  const result = await verifyBackup(body.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
