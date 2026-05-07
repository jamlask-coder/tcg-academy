"use client";

/**
 * PANEL DE COPIAS DE SEGURIDAD (servidor)
 *
 * Lista, ejecuta y verifica los backups que el cron diario sube a R2 (o Drive)
 * encadenados con manifest SHA-256. Llama a `/api/admin/backup-server/*`.
 *
 * - El token admin nunca se almacena: se pide al operador y se manda por
 *   cabecera `x-admin-token` solo durante la sesión.
 * - Restaurar requiere también `BACKUP_RESTORE_CONFIRM` (env var) — la API
 *   rechaza si no coincide. Es un seguro intencional contra restauraciones
 *   accidentales que destruirían datos en producción.
 * - Solo lectura por defecto: el botón "Restaurar" muestra un modal con dos
 *   confirmaciones explícitas + texto del confirmToken.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Database,
} from "lucide-react";
import { formatDateShort } from "@/lib/format";
import { clickableProps } from "@/lib/a11y";

// ─── Tipos ────────────────────────────────────────────────────────────────

interface BackupListEntry {
  id: string;
  startedAt: string;
  finishedAt: string;
  totalRows: number;
  totalBytes: number;
  tableCount: number;
  chainSha256: string;
  objectKey: string;
}

interface ListResponse {
  ok: boolean;
  configured: boolean;
  backend: "drive" | "s3" | "none";
  backups: BackupListEntry[];
  message?: string;
  error?: string;
}

interface VerifyResult {
  id: string;
  ok: boolean;
  checkedTables: number;
  manifestHashOk: boolean;
  chainHashOk: boolean;
  tableHashMismatches: string[];
  message: string;
}

interface RunResult {
  ok: boolean;
  manifest?: {
    id: string;
    totalRows: number;
    totalBytes: number;
    chainSha256: string;
  };
  durationMs?: number;
  error?: string;
}

type Banner = { kind: "ok" | "err" | "info"; text: string } | null;

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function formatRelativeHours(h: number | null): string {
  if (h === null) return "Nunca";
  if (h < 1) return `Hace ${Math.round(h * 60)} min`;
  if (h < 24) return `Hace ${Math.round(h)} h`;
  return `Hace ${Math.round(h / 24)} días`;
}

// ─── Página ───────────────────────────────────────────────────────────────

export default function AdminCopiasPage() {
  const [token, setToken] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);

  const [data, setData] = useState<ListResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);

  const [verifying, setVerifying] = useState<Record<string, VerifyResult>>({});
  const [restoreTarget, setRestoreTarget] = useState<BackupListEntry | null>(
    null,
  );
  const [restoreConfirmToken, setRestoreConfirmToken] = useState("");
  const [restoreTruncate, setRestoreTruncate] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setBusy("list");
    try {
      const res = await fetch("/api/admin/backup-server/list", {
        headers: { "x-admin-token": token },
      });
      const json = (await res.json()) as ListResponse;
      setData(json);
      if (!json.ok && json.error) {
        setBanner({ kind: "err", text: json.error });
      }
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Error de red",
      });
    } finally {
      setBusy(null);
    }
  }, [token]);

  useEffect(() => {
    if (tokenSaved) refresh();
  }, [tokenSaved, refresh]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 8000);
    return () => clearTimeout(t);
  }, [banner]);

  // ─── Acciones ───────────────────────────────────────────────────────────

  async function handleRunNow() {
    setBusy("run");
    setBanner({ kind: "info", text: "Lanzando backup… (puede tardar varios minutos)" });
    try {
      const res = await fetch("/api/admin/backup-server/run", {
        method: "POST",
        headers: { "x-admin-token": token },
      });
      const json = (await res.json()) as RunResult;
      if (json.ok && json.manifest) {
        setBanner({
          kind: "ok",
          text: `Backup #${json.manifest.id} OK · ${json.manifest.totalRows} filas · ${formatBytes(json.manifest.totalBytes)} · ${(json.durationMs ?? 0) / 1000 | 0}s`,
        });
        await refresh();
      } else {
        setBanner({ kind: "err", text: json.error ?? "Fallo en el backup" });
      }
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Error de red",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleVerify(id: string) {
    setBusy(`verify:${id}`);
    try {
      const res = await fetch("/api/admin/backup-server/verify", {
        method: "POST",
        headers: { "x-admin-token": token, "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json()) as VerifyResult;
      setVerifying((v) => ({ ...v, [id]: json }));
      setBanner({
        kind: json.ok ? "ok" : "err",
        text: `Verificación #${id}: ${json.message}`,
      });
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Error de red",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleRestoreConfirm() {
    if (!restoreTarget) return;
    if (!restoreConfirmToken) {
      setBanner({ kind: "err", text: "Falta el confirmToken" });
      return;
    }
    setBusy("restore");
    try {
      const res = await fetch("/api/admin/backup-server/restore", {
        method: "POST",
        headers: { "x-admin-token": token, "content-type": "application/json" },
        body: JSON.stringify({
          id: restoreTarget.id,
          confirmToken: restoreConfirmToken,
          truncateFirst: restoreTruncate,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        restoredTables?: string[];
        totalRows?: number;
        error?: string;
      };
      if (json.ok) {
        setBanner({
          kind: "ok",
          text: `Restauración OK · ${json.restoredTables?.length ?? 0} tablas · ${json.totalRows ?? 0} filas`,
        });
        setRestoreTarget(null);
        setRestoreConfirmToken("");
        setRestoreTruncate(false);
      } else {
        setBanner({ kind: "err", text: json.error ?? "Fallo en la restauración" });
      }
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Error de red",
      });
    } finally {
      setBusy(null);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  const lastBackupHours =
    data?.backups[0]?.finishedAt ? hoursSince(data.backups[0].finishedAt) : null;
  const healthColor =
    lastBackupHours === null
      ? "text-red-600"
      : lastBackupHours < 26
        ? "text-green-600"
        : lastBackupHours < 50
          ? "text-amber-600"
          : "text-red-600";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Copias de seguridad (producción)
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Backups cifrados (AES-256-GCM) del Supabase, encadenados con SHA-256.
            Cron diario a las 03:00 UTC.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={!tokenSaved || busy === "list"}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          aria-label="Actualizar"
        >
          <RefreshCw size={14} className={busy === "list" ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Token admin — sesión */}
      {!tokenSaved && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <Shield size={16} /> Introduce el token de admin
          </div>
          <p className="mb-3 text-xs text-amber-800">
            Coincide con la variable de entorno{" "}
            <code className="rounded bg-amber-100 px-1">ADMIN_BACKUP_TOKEN</code>.
            Solo se mantiene en memoria mientras dure esta pestaña — al recargar
            hay que volver a introducirlo.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ADMIN_BACKUP_TOKEN"
              autoComplete="off"
              className="flex-1 rounded-lg border border-amber-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => token && setTokenSaved(true)}
              disabled={!token}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Validar
            </button>
          </div>
        </div>
      )}

      {/* Banner */}
      {banner && (
        <div
          className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            banner.kind === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : banner.kind === "err"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          {banner.kind === "ok" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : banner.kind === "err" ? (
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          ) : (
            <Shield size={18} className="mt-0.5 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {tokenSaved && data && (
        <>
          {/* Estado backend */}
          {!data.configured ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-900">
                <AlertTriangle size={16} /> Almacenamiento NO configurado
              </div>
              <p className="text-xs text-red-800">
                {data.message ??
                  "Define BACKUP_S3_* (R2/B2/AWS) o GOOGLE_DRIVE_* en las variables de entorno."}
              </p>
            </div>
          ) : (
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={<Database size={14} />}
                label="Backend activo"
                value={data.backend === "s3" ? "S3 / R2" : data.backend === "drive" ? "Drive" : "—"}
                valueClass="text-gray-900"
              />
              <KpiCard
                icon={<Clock size={14} />}
                label="Último backup"
                value={formatRelativeHours(lastBackupHours)}
                valueClass={healthColor}
              />
              <KpiCard
                icon={<ShieldCheck size={14} />}
                label="Backups guardados"
                value={String(data.backups.length)}
                valueClass="text-gray-900"
              />
              <KpiCard
                icon={<Shield size={14} />}
                label="Tamaño último"
                value={data.backups[0] ? formatBytes(data.backups[0].totalBytes) : "—"}
                valueClass="text-gray-900"
              />
            </div>
          )}

          {/* Acciones */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <PlayCircle size={18} className="text-[#2563eb]" />
              <h2 className="font-semibold text-gray-900">Ejecutar backup ahora</h2>
            </div>
            <p className="mb-3 text-xs text-gray-500">
              Dispara un backup ad-hoc adicional al diario. Útil antes de un
              despliegue, una migración o un import masivo. El resultado es
              idéntico al del cron.
            </p>
            <button
              type="button"
              onClick={handleRunNow}
              disabled={!data.configured || busy !== null}
              className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              <PlayCircle size={15} />
              {busy === "run" ? "Ejecutando…" : "Lanzar backup ahora"}
            </button>
          </div>

          {/* Lista */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h2 className="font-semibold text-gray-900">Backups guardados</h2>
              <span className="text-xs text-gray-500">
                Retention según BACKUP_RETENTION_DAYS (default 90 días)
              </span>
            </div>
            {data.backups.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-500">
                Aún no hay backups en {data.backend}. Lanza el primero arriba o
                espera al cron de las 03:00 UTC.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.backups.map((b) => {
                  const v = verifying[b.id];
                  return (
                    <div
                      key={b.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">
                            #{b.id}
                          </span>
                          {v && (
                            <span
                              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                v.ok
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {v.ok ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                              {v.ok ? "Verificado" : "FALLO"}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm font-medium text-gray-900">
                          {formatDateShort(b.finishedAt)}{" "}
                          <span className="text-xs font-normal text-gray-500">
                            · {b.tableCount} tablas · {b.totalRows.toLocaleString("es-ES")} filas ·{" "}
                            {formatBytes(b.totalBytes)}
                          </span>
                        </div>
                        <div className="mt-1 truncate font-mono text-[10px] text-gray-400">
                          chain {b.chainSha256.slice(0, 16)}…
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerify(b.id)}
                          disabled={busy !== null}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ShieldCheck size={13} />
                          {busy === `verify:${b.id}` ? "Verificando…" : "Verificar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRestoreTarget(b)}
                          disabled={busy !== null}
                          className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                        >
                          <RotateCcw size={13} /> Restaurar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal restauración */}
      {restoreTarget && (
        <div
          {...clickableProps(() => setRestoreTarget(null))}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div
            {...clickableProps((e) => e?.stopPropagation())}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Restaurar backup</h3>
              <button
                type="button"
                onClick={() => setRestoreTarget(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <strong>ATENCIÓN:</strong> esta operación sobrescribe datos en
                producción (Supabase). No hay UNDO. Si activas{" "}
                <code>truncateFirst</code> se BORRAN las tablas antes de
                insertar.
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                <div>
                  <strong>Backup:</strong>{" "}
                  <span className="font-mono">{restoreTarget.id}</span>
                </div>
                <div>
                  <strong>Fecha:</strong>{" "}
                  {formatDateShort(restoreTarget.finishedAt)}
                </div>
                <div>
                  <strong>Filas:</strong>{" "}
                  {restoreTarget.totalRows.toLocaleString("es-ES")} en{" "}
                  {restoreTarget.tableCount} tablas
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  confirmToken (variable{" "}
                  <code className="rounded bg-gray-100 px-1">
                    BACKUP_RESTORE_CONFIRM
                  </code>
                  )
                </label>
                <input
                  type="password"
                  value={restoreConfirmToken}
                  onChange={(e) => setRestoreConfirmToken(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  autoComplete="off"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={restoreTruncate}
                  onChange={(e) => setRestoreTruncate(e.target.checked)}
                />
                Truncar tablas antes de restaurar (más limpio pero destructivo)
              </label>
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setRestoreTarget(null)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRestoreConfirm}
                  disabled={busy === "restore" || !restoreConfirmToken}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  <RotateCcw size={14} />
                  {busy === "restore" ? "Restaurando…" : "Restaurar ahora"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {icon} {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}
