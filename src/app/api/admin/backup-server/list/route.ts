/**
 * GET /api/admin/backup-server/list
 *
 * Lista los backups cifrados almacenados en el backend activo (Drive o
 * S3-compat). Cada entrada incluye hash encadenado para detección de
 * manipulación.
 */

import { NextResponse } from "next/server";
import { verifyBackupAdmin } from "@/lib/backup/adminAuth";
import { activeBackupBackend, listBackups } from "@/lib/backup/backupJob";
import { isBackupConfigured } from "@/lib/backup/storage";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await verifyBackupAdmin(req);
  if (!auth.ok) {
    const headers = auth.retryAfterSec
      ? { "Retry-After": String(auth.retryAfterSec) }
      : undefined;
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.retryAfterSec ? 429 : 401, headers },
    );
  }
  if (!isBackupConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      backend: "none",
      backups: [],
      message:
        "Almacenamiento no configurado — define GOOGLE_DRIVE_SA_KEY+GOOGLE_DRIVE_BACKUP_FOLDER_ID o BACKUP_S3_*",
    });
  }
  const backups = await listBackups();
  return NextResponse.json({
    ok: true,
    configured: true,
    backend: activeBackupBackend(),
    backups,
  });
}
