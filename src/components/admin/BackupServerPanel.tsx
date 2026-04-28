"use client";

/**
 * Panel de backups producción (RGPD art. 32).
 *
 * Muestra los backups cifrados almacenados en el backend activo (Drive o
 * S3-compat), permite ejecutar uno manual, verificar integridad (hash
 * encadenado + SHA-256 por tabla) y restaurar.
 *
 * SOLO opera contra los endpoints /api/admin/backup-server/* — que requieren
 * `x-admin-token`. Si no hay token ni backend configurado, el panel muestra
 * modo degradado con instrucciones específicas para cada backend.
 */

import { useCallback, useEffect, useState } from "react";
import { HardDrive, PlayCircle, ShieldCheck, Undo2 } from "lucide-react";
import type { BackupListEntry, BackupVerifyResult } from "@/lib/backup/types";

interface Props {
  onToast: (msg: string) => void;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("tcgacademy_admin_token") ?? "";
}

type BackendKind = "drive" | "s3" | "none";

export function BackupServerPanel({ onToast }: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [backend, setBackend] = useState<BackendKind>("none");
  const [backups, setBackups] = useState<BackupListEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<Record<string, BackupVerifyResult | null>>({});
  const [token, setToken] = useState<string>(getAdminToken());

  const refresh = useCallback(async () => {
    if (!token) {
      setConfigured(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/backup-server/list", {
        headers: { "x-admin-token": token },
      });
      const json = (await res.json()) as {
        ok: boolean;
        configured?: boolean;
        backend?: BackendKind;
        backups?: BackupListEntry[];
      };
      setConfigured(Boolean(json.configured));
      setBackend(json.backend ?? "none");
      setBackups(json.backups ?? []);
    } catch {
      setConfigured(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runBackup = async () => {
    setBusy("run");
    try {
      const res = await fetch("/api/admin/backup-server/run", {
        method: "POST",
        headers: { "x-admin-token": token },
      });
      const json = (await res.json()) as { ok: boolean; manifest?: { id: string } };
      if (json.ok) {
        onToast(`Backup creado: ${json.manifest?.id ?? "OK"}`);
        await refresh();
      } else {
        onToast("Error al ejecutar backup");
      }
    } finally {
      setBusy(null);
    }
  };

  const runVerify = async (id: string) => {
    setBusy(`verify:${id}`);
    try {
      const res = await fetch("/api/admin/backup-server/verify", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json()) as BackupVerifyResult;
      setVerifying((prev) => ({ ...prev, [id]: json }));
      onToast(json.ok ? `Backup ${id} íntegro` : `Backup ${id} — ${json.message}`);
    } finally {
      setBusy(null);
    }
  };

  const runRestore = async (id: string) => {
    const confirmToken = prompt(
      "Introduce BACKUP_RESTORE_CONFIRM para autorizar. Esta acción SOBRESCRIBE datos actuales.",
    );
    if (!confirmToken) return;
    setBusy(`restore:${id}`);
    try {
      const res = await fetch("/api/admin/backup-server/restore", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ id, confirmToken, truncateFirst: false }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        restoredTables?: string[];
        totalRows?: number;
        error?: string;
      };
      onToast(
        json.ok
          ? `Restaurados ${json.totalRows ?? 0} filas en ${json.restoredTables?.length ?? 0} tablas`
          : `Restore falló: ${json.error}`,
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-gray-900">
          <HardDrive size={18} className="text-[#2563eb]" /> Backups producción (RGPD)
        </h2>
        <button
          onClick={runBackup}
          disabled={busy !== null || !configured || !token}
          className="flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
        >
          <PlayCircle size={14} /> {busy === "run" ? "Ejecutando..." : "Ejecutar ahora"}
        </button>
      </div>

      {!token && (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900">Falta token de admin</p>
          <p className="mt-1 text-amber-800">
            Guarda <code className="rounded bg-white px-1">localStorage.setItem(&quot;tcgacademy_admin_token&quot;, &quot;TU_TOKEN&quot;)</code>{" "}
            con el valor de <code>ADMIN_BACKUP_TOKEN</code> del servidor para operar este panel.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="password"
              placeholder="Pega el token y pulsa Guardar"
              onChange={(e) => setToken(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-amber-300 px-3 text-xs"
            />
            <button
              onClick={() => {
                localStorage.setItem("tcgacademy_admin_token", token);
                onToast("Token guardado");
                void refresh();
              }}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {configured === false && token && (
        <div className="mb-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          Almacenamiento off-site no configurado. Define en Vercel{" "}
          <code>GOOGLE_DRIVE_SA_KEY</code> + <code>GOOGLE_DRIVE_BACKUP_FOLDER_ID</code>{" "}
          (Drive, gratis), o bien <code>BACKUP_S3_*</code> (S3-compat). Y{" "}
          <code>BACKUP_ENCRYPTION_KEY</code> en cualquier caso. Después redeploy.
        </div>
      )}

      {configured && (
        <p className="mb-3 text-xs text-gray-500">
          Backend activo: <strong className="font-semibold text-gray-700">{backend === "drive" ? "Google Drive" : backend === "s3" ? "S3-compat" : "—"}</strong>
        </p>
      )}

      {backups.length === 0 && configured && (
        <p className="text-sm text-gray-500">
          Aún no hay backups almacenados. El cron diario (03:00 UTC) los generará
          automáticamente, o puedes disparar uno manual con &ldquo;Ejecutar ahora&rdquo;.
        </p>
      )}

      {backups.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2.5">ID</th>
                <th className="px-4 py-2.5">Inicio</th>
                <th className="px-4 py-2.5">Tablas</th>
                <th className="px-4 py-2.5">Filas</th>
                <th className="px-4 py-2.5">Tamaño</th>
                <th className="px-4 py-2.5">Chain hash</th>
                <th className="px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {backups.map((b) => {
                const verifyRes = verifying[b.id];
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-mono text-xs">{b.id}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(b.startedAt).toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{b.tableCount}</td>
                    <td className="px-4 py-3 tabular-nums">{b.totalRows.toLocaleString("es-ES")}</td>
                    <td className="px-4 py-3 tabular-nums">{formatBytes(b.totalBytes)}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-gray-500">
                      {b.chainSha256.slice(0, 12)}…
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => runVerify(b.id)}
                          disabled={busy !== null}
                          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ShieldCheck size={12} /> Verificar
                        </button>
                        <button
                          onClick={() => runRestore(b.id)}
                          disabled={busy !== null}
                          className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Undo2 size={12} /> Restaurar
                        </button>
                      </div>
                      {verifyRes && (
                        <p
                          className={`mt-1 text-[10px] font-semibold ${verifyRes.ok ? "text-green-600" : "text-red-600"}`}
                        >
                          {verifyRes.message}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
