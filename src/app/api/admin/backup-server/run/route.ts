/**
 * POST /api/admin/backup-server/run
 *
 * Ejecuta un backup ad-hoc (además del cron diario). Útil antes de un despliegue
 * arriesgado o una migración. El resultado es idéntico al del cron.
 */

import { NextResponse } from "next/server";
import { verifyBackupAdmin } from "@/lib/backup/adminAuth";
import { runBackup } from "@/lib/backup/backupJob";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = verifyBackupAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 });
  }
  const result = await runBackup();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
