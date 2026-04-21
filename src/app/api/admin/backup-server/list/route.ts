/**
 * GET /api/admin/backup-server/list
 *
 * Lista los backups cifrados almacenados en S3 (o S3-compat). Cada entrada
 * incluye hash encadenado para detección de manipulación.
 */

import { NextResponse } from "next/server";
import { verifyBackupAdmin } from "@/lib/backup/adminAuth";
import { listBackups } from "@/lib/backup/backupJob";
import { isBackupS3Configured } from "@/lib/backup/s3Client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = verifyBackupAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 });
  }
  if (!isBackupS3Configured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      backups: [],
      message: "S3 no configurado — rellena BACKUP_S3_* en .env",
    });
  }
  const backups = await listBackups();
  return NextResponse.json({ ok: true, configured: true, backups });
}
