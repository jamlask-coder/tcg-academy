/**
 * Autenticación mínima compartida para rutas /api/admin/backup-server/*.
 *
 * Reutiliza ADMIN_BACKUP_TOKEN que ya usa /api/admin/backup. Cuando tengamos
 * sesiones admin reales (JWT por Supabase Auth), sustituir por esa validación.
 */

export interface AdminAuthResult {
  ok: boolean;
  reason?: string;
}

export function verifyBackupAdmin(req: Request): AdminAuthResult {
  const required = process.env.ADMIN_BACKUP_TOKEN;
  if (!required) return { ok: false, reason: "ADMIN_BACKUP_TOKEN no configurado" };
  const provided = req.headers.get("x-admin-token");
  if (!provided) return { ok: false, reason: "Falta cabecera x-admin-token" };
  if (provided !== required) return { ok: false, reason: "Token no válido" };
  return { ok: true };
}
