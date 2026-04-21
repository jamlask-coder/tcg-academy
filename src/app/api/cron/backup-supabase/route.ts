/**
 * POST /api/cron/backup-supabase
 *
 * Cron diario (recomendado 03:00 UTC — antes del refresco del 04:00 UTC que
 * ya tenemos para snapshots de precio). Ejecuta un backup completo + prune
 * de backups antiguos según BACKUP_RETENTION_DAYS.
 *
 * Protegido con header `x-cron-secret: <CRON_SECRET>` — mismo secret que el
 * resto de crons del sistema para simplificar la config de Vercel/Netlify.
 *
 * En Vercel añadir en vercel.json:
 *   { "crons": [{ "path": "/api/cron/backup-supabase", "schedule": "0 3 * * *" }] }
 */

import { NextResponse } from "next/server";
import { runBackup } from "@/lib/backup/backupJob";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await runBackup();
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    id: result.manifest?.id,
    totalRows: result.manifest?.totalRows,
    totalBytes: result.manifest?.totalBytes,
    durationMs: result.durationMs,
    chainSha256: result.manifest?.chainSha256,
  });
}
