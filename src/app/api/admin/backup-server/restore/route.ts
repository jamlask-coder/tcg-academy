/**
 * POST /api/admin/backup-server/restore
 * Body: { id, tables?, confirmToken, truncateFirst? }
 *
 * Restaura un backup a la base de datos actual. Requiere confirmToken
 * coincidente con BACKUP_RESTORE_CONFIRM para evitar restores accidentales.
 *
 * ATENCIÓN: si `truncateFirst: true` se TRUNCAN las tablas antes de insertar
 * (usa la función SQL `exec_sql`, que debe existir en la base de datos).
 */

import { NextResponse } from "next/server";
import { verifyBackupAdmin } from "@/lib/backup/adminAuth";
import { restoreBackup } from "@/lib/backup/backupJob";
import { isBackupS3Configured } from "@/lib/backup/s3Client";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RestoreBody {
  id?: string;
  tables?: string[];
  confirmToken?: string;
  truncateFirst?: boolean;
}

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

  const body = (await req.json().catch(() => null)) as RestoreBody | null;
  if (!body?.id) {
    return NextResponse.json({ ok: false, error: "falta_id" }, { status: 400 });
  }
  const requiredConfirm = process.env.BACKUP_RESTORE_CONFIRM;
  if (!requiredConfirm) {
    return NextResponse.json(
      {
        ok: false,
        error: "BACKUP_RESTORE_CONFIRM no configurado — añádelo al .env para habilitar restore",
      },
      { status: 501 },
    );
  }
  if (body.confirmToken !== requiredConfirm) {
    return NextResponse.json(
      { ok: false, error: "confirmToken inválido" },
      { status: 403 },
    );
  }

  try {
    const result = await restoreBackup(body.id, body.tables, {
      truncateFirst: body.truncateFirst === true,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
