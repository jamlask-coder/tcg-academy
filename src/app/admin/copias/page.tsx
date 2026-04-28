"use client";

/**
 * PANEL DE COPIAS DE SEGURIDAD
 *
 * Pantalla crítica para el admin. Permite:
 *  - Crear snapshots manuales de TODA la información del negocio.
 *  - Ver historial rotativo local (últimos 7).
 *  - Descargar un snapshot — cifrado (RGPD) o en claro (transferencia interna).
 *  - Importar un snapshot desde archivo y restaurarlo tras validar checksum.
 *  - Ver estado de integridad (¿cuánto hace del último backup?).
 *
 * Nunca se muestran datos personales en claro aquí — sólo metadatos y contadores.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Shield,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Database,
  FileDown,
  FileUp,
  RefreshCw,
} from "lucide-react";
import {
  createSnapshot,
  listSnapshots,
  saveSnapshot,
  loadSnapshot,
  deleteSnapshot,
  previewRestore,
  restoreSnapshot,
  parseSnapshotFile,
  getBackupStats,
  TRACKED_KEYS,
  type Snapshot,
  type SnapshotManifest,
  type RestorePreview,
  type BackupStats,
} from "@/services/backupService";
import {
  encryptString,
  decryptPayload,
  encryptedPayloadToBlob,
  parseEncryptedFile,
  suggestEncryptedFileName,
  evaluatePassphrase,
  EncryptionError,
  type EncryptedPayload,
} from "@/lib/encryption";
import { formatDateShort } from "@/lib/format";
import { clickableProps } from "@/lib/a11y";

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function formatRelativeHours(h: number | null): string {
  if (h === null) return "Nunca";
  if (h < 1) return `Hace ${Math.round(h * 60)} min`;
  if (h < 24) return `Hace ${Math.round(h)} h`;
  return `Hace ${Math.round(h / 24)} días`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Página ────────────────────────────────────────────────────────────────

export default function AdminCopiasPage() {
  const [manifests, setManifests] = useState<SnapshotManifest[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    kind: "ok" | "err" | "info";
    text: string;
  } | null>(null);

  // Diálogos
  const [noteForCreate, setNoteForCreate] = useState("");
  const [downloadTarget, setDownloadTarget] = useState<SnapshotManifest | null>(
    null,
  );
  const [downloadEncrypt, setDownloadEncrypt] = useState(true);
  const [downloadPass, setDownloadPass] = useState("");
  const [downloadHint, setDownloadHint] = useState("");

  const [restoreSource, setRestoreSource] = useState<{
    snapshot: Snapshot;
    preview: RestorePreview;
  } | null>(null);

  const [importPass, setImportPass] = useState("");
  const [importEncrypted, setImportEncrypted] = useState<EncryptedPayload | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Carga inicial ────────────────────────────────────────────────────────
  function refresh() {
    setManifests(listSnapshots());
    setStats(getBackupStats());
  }

  useEffect(() => {
    refresh();
  }, []);

  // ─── Auto-dismiss de mensaje ─────────────────────────────────────────────
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(t);
  }, [message]);

  // ─── Crear snapshot manual ────────────────────────────────────────────────
  async function handleCreate() {
    setBusy("create");
    try {
      const snap = await createSnapshot("manual", noteForCreate || undefined);
      const ok = saveSnapshot(snap);
      if (!ok) {
        setMessage({
          kind: "err",
          text: "No se pudo guardar localmente (cuota llena). Descarga el snapshot antes de crear otro.",
        });
      } else {
        setMessage({
          kind: "ok",
          text: `Snapshot creado: ${Object.keys(snap.data).length} claves, ${formatBytes(snap.size)}.`,
        });
      }
      setNoteForCreate("");
      refresh();
    } catch (e) {
      setMessage({
        kind: "err",
        text: `Error creando snapshot: ${e instanceof Error ? e.message : "?"}`,
      });
    } finally {
      setBusy(null);
    }
  }

  // ─── Descarga ────────────────────────────────────────────────────────────
  async function handleDownloadConfirm() {
    if (!downloadTarget) return;
    const full = loadSnapshot(downloadTarget.id);
    if (!full) {
      setMessage({ kind: "err", text: "No se encuentra el snapshot local" });
      setDownloadTarget(null);
      return;
    }
    setBusy("download");
    try {
      if (downloadEncrypt) {
        const strength = evaluatePassphrase(downloadPass);
        if (strength.score <= 1) {
          setMessage({
            kind: "err",
            text: `Frase de paso demasiado débil: ${strength.issues.join(", ")}`,
          });
          setBusy(null);
          return;
        }
        const payload = await encryptString(JSON.stringify(full), downloadPass, {
          purpose: "snapshot",
          hint: downloadHint || undefined,
        });
        const blob = encryptedPayloadToBlob(payload);
        triggerDownload(blob, suggestEncryptedFileName());
        setMessage({
          kind: "ok",
          text: "Descarga cifrada iniciada. GUARDA la frase de paso en otro sitio.",
        });
      } else {
        // Audit P0 F-02 — cifrado obligatorio. Una descarga JSON plana de
        // backup contiene NIFs, emails, direcciones, IBANs. Si llega a un
        // disco compartido / USB / mail = brecha RGPD masiva. Quitamos la
        // rama "sin cifrar"; el operador debe usar la rama cifrada.
        setMessage({
          kind: "err",
          text: "Política de seguridad: las copias deben descargarse cifradas (AES-GCM). Activa la opción 'Cifrado'.",
        });
        setBusy(null);
        return;
      }
      setDownloadTarget(null);
      setDownloadPass("");
      setDownloadHint("");
    } catch (e) {
      setMessage({
        kind: "err",
        text: `Error al descargar: ${e instanceof Error ? e.message : "?"}`,
      });
    } finally {
      setBusy(null);
    }
  }

  // ─── Eliminar ────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    const ok = window.confirm(
      "¿Eliminar este snapshot local? Esta acción no se puede deshacer (pero si aún no lo has descargado, perderás el punto de restauración).",
    );
    if (!ok) return;
    deleteSnapshot(id);
    refresh();
    setMessage({ kind: "info", text: "Snapshot eliminado." });
  }

  // ─── Restaurar desde local ───────────────────────────────────────────────
  async function handlePrepareRestore(id: string) {
    const full = loadSnapshot(id);
    if (!full) {
      setMessage({ kind: "err", text: "No se pudo cargar el snapshot" });
      return;
    }
    const preview = await previewRestore(full);
    setRestoreSource({ snapshot: full, preview });
  }

  async function handleRestoreConfirm() {
    if (!restoreSource) return;
    setBusy("restore");
    try {
      const result = await restoreSnapshot(restoreSource.snapshot);
      if (result.ok) {
        setMessage({
          kind: "ok",
          text: `Restauración completada. ${result.written.length} claves escritas, ${result.deleted.length} eliminadas. Pre-snapshot creado: ${result.preSnapshotId ?? "—"}`,
        });
      } else {
        setMessage({
          kind: "err",
          text: `Restauración con errores: ${result.errors.join("; ")}`,
        });
      }
      setRestoreSource(null);
      refresh();
    } finally {
      setBusy(null);
    }
  }

  // ─── Importar archivo ────────────────────────────────────────────────────
  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      // Detectar si es cifrado o claro
      const parsed = JSON.parse(text) as { algo?: unknown; data?: unknown };
      if (parsed && parsed.algo === "AES-GCM") {
        const payload = parseEncryptedFile(text);
        setImportEncrypted(payload);
        setMessage({
          kind: "info",
          text: "Archivo cifrado detectado. Introduce la frase de paso para descifrar.",
        });
      } else if (parsed && parsed.data) {
        const snap = parseSnapshotFile(text);
        const preview = await previewRestore(snap);
        setRestoreSource({ snapshot: snap, preview });
      } else {
        setMessage({ kind: "err", text: "Archivo con formato no reconocido" });
      }
    } catch (err) {
      setMessage({
        kind: "err",
        text: `No se pudo leer el archivo: ${err instanceof Error ? err.message : "?"}`,
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDecryptImport() {
    if (!importEncrypted) return;
    setBusy("import");
    try {
      const plain = await decryptPayload(importEncrypted, importPass);
      const snap = parseSnapshotFile(plain);
      const preview = await previewRestore(snap);
      setRestoreSource({ snapshot: snap, preview });
      setImportEncrypted(null);
      setImportPass("");
    } catch (err) {
      if (err instanceof EncryptionError) {
        setMessage({ kind: "err", text: err.message });
      } else {
        setMessage({
          kind: "err",
          text: err instanceof Error ? err.message : "Error al descifrar",
        });
      }
    } finally {
      setBusy(null);
    }
  }

  // ─── Stats derivadas ──────────────────────────────────────────────────────
  const healthColor = useMemo(() => {
    if (!stats || stats.hoursSinceLastBackup === null) return "text-red-600";
    if (stats.hoursSinceLastBackup < 24) return "text-green-600";
    if (stats.hoursSinceLastBackup < 72) return "text-amber-600";
    return "text-red-600";
  }, [stats]);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Snapshots locales (admin)
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Snapshot del estado del navegador admin (carrito anónimo, cachés UI,
            preferencias). Útil antes de imports masivos.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          aria-label="Actualizar"
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Aviso server-mode: el backup REAL ya no es esto */}
      {process.env.NEXT_PUBLIC_BACKEND_MODE === "server" && (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">
            En modo servidor los datos reales viven en Supabase, no en tu navegador.
          </p>
          <p className="mt-1 text-sm text-blue-800">
            Esta página solo respalda residuos del navegador admin. Para la copia
            de seguridad de verdad (cifrada, off-site, RGPD) usa{" "}
            <Link
              href="/admin/herramientas#backups"
              className="font-semibold underline hover:text-blue-700"
            >
              Herramientas → Backups producción
            </Link>
            .
          </p>
        </div>
      )}

      {/* Mensaje */}
      {message && (
        <div
          className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            message.kind === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : message.kind === "err"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          {message.kind === "ok" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : message.kind === "err" ? (
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          ) : (
            <Shield size={18} className="mt-0.5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* KPIs */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Database size={14} /> Snapshots locales
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {stats.localCount}
              <span className="ml-1 text-sm font-normal text-gray-400">/ 7</span>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock size={14} /> Último backup
            </div>
            <div className={`mt-1 text-2xl font-bold ${healthColor}`}>
              {formatRelativeHours(stats.hoursSinceLastBackup)}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Shield size={14} /> Claves rastreadas
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {stats.totalKeysTracked}
              <span className="ml-1 text-sm font-normal text-gray-400">
                ({stats.piiKeysTracked} con PII)
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileDown size={14} /> Tamaño total
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {formatBytes(stats.totalSize)}
            </div>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Plus size={18} className="text-[#2563eb]" />
            <h2 className="font-semibold text-gray-900">
              Crear snapshot manual
            </h2>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            Captura el estado actual de{" "}
            <strong>{TRACKED_KEYS.length} claves</strong>. Se guarda con rotación
            (máx. 7 locales) y queda disponible para descarga o restauración.
          </p>
          <label className="mb-2 block text-xs font-medium text-gray-700">
            Nota (opcional)
          </label>
          <input
            type="text"
            value={noteForCreate}
            onChange={(e) => setNoteForCreate(e.target.value.slice(0, 120))}
            placeholder="Ej.: antes de importar catálogo de primavera"
            className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            maxLength={120}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy === "create"}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {busy === "create" ? "Creando…" : "Crear snapshot ahora"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Upload size={18} className="text-[#16a34a]" />
            <h2 className="font-semibold text-gray-900">
              Importar / restaurar desde archivo
            </h2>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            Restaura desde un archivo <code>.json</code> (claro) o{" "}
            <code>.enc.json</code> (cifrado). Antes de escribir, se crea un{" "}
            <strong>pre-snapshot automático</strong> para poder volver atrás.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.enc,application/json,application/octet-stream"
            onChange={handleFileChosen}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <FileUp size={15} /> Elegir archivo
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="font-semibold text-gray-900">Historial local</h2>
          <span className="text-xs text-gray-500">
            Rotación: últimos 7. Los más antiguos se purgan automáticamente.
          </span>
        </div>
        {manifests.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            Aún no hay snapshots. Crea el primero arriba.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {manifests.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-400">
                      #{m.id.slice(0, 8)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        m.trigger === "manual"
                          ? "bg-blue-100 text-blue-700"
                          : m.trigger === "auto"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {m.trigger}
                    </span>
                    {m.piiKeyCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-red-600">
                        <Lock size={10} /> PII
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-900">
                    {formatDateShort(m.createdAt)}{" "}
                    <span className="text-xs font-normal text-gray-500">
                      · {m.keyCount} claves · {formatBytes(m.size)}
                    </span>
                  </div>
                  {m.note && (
                    <div className="mt-1 truncate text-xs text-gray-500">
                      {m.note}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDownloadTarget(m)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Download size={13} /> Descargar
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrepareRestore(m.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                  >
                    <RotateCcw size={13} /> Restaurar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    aria-label="Eliminar snapshot"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal descarga */}
      {downloadTarget && (
        <Modal onClose={() => setDownloadTarget(null)} title="Descargar snapshot">
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              <div>
                <strong>ID:</strong>{" "}
                <span className="font-mono">{downloadTarget.id.slice(0, 8)}</span>
              </div>
              <div>
                <strong>Fecha:</strong> {formatDateShort(downloadTarget.createdAt)}
              </div>
              <div>
                <strong>Claves:</strong> {downloadTarget.keyCount} ·{" "}
                <strong>Tamaño:</strong> {formatBytes(downloadTarget.size)}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDownloadEncrypt(true)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                  downloadEncrypt
                    ? "border-[#2563eb] bg-[#2563eb] text-white"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                <Lock size={12} className="mr-1 inline" />
                Cifrado (recomendado)
              </button>
              <button
                type="button"
                onClick={() => setDownloadEncrypt(false)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                  !downloadEncrypt
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                Sin cifrar
              </button>
            </div>

            {downloadEncrypt ? (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Frase de paso (≥ 12 caracteres, mayúsc., minúsc., dígito, símbolo)
                  </label>
                  <input
                    type="password"
                    value={downloadPass}
                    onChange={(e) => setDownloadPass(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    autoComplete="new-password"
                  />
                  {downloadPass && (
                    <PassStrengthBar pass={downloadPass} />
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Pista legible (opcional, no-PII)
                  </label>
                  <input
                    type="text"
                    value={downloadHint}
                    onChange={(e) => setDownloadHint(e.target.value.slice(0, 80))}
                    placeholder="Ej.: Frase bóveda 1Password #Backups"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    maxLength={80}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <strong>Atención:</strong> descargar sin cifrar expone NIFs,
                emails y direcciones. Sólo hazlo si el archivo va a una ubicación
                ya segura.
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setDownloadTarget(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDownloadConfirm}
                disabled={busy === "download"}
                className="flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                <Download size={14} />
                {busy === "download" ? "Preparando…" : "Descargar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal descifrado import */}
      {importEncrypted && (
        <Modal
          onClose={() => {
            setImportEncrypted(null);
            setImportPass("");
          }}
          title="Descifrar archivo de backup"
        >
          <div className="space-y-4">
            {importEncrypted.meta?.hint && (
              <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                <strong>Pista:</strong> {importEncrypted.meta.hint}
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Frase de paso
              </label>
              <input
                type="password"
                value={importPass}
                onChange={(e) => setImportPass(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                autoComplete="current-password"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setImportEncrypted(null);
                  setImportPass("");
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDecryptImport}
                disabled={busy === "import" || !importPass}
                className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                {busy === "import" ? "Descifrando…" : "Descifrar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal restauración */}
      {restoreSource && (
        <Modal
          onClose={() => setRestoreSource(null)}
          title="Previsualizar restauración"
        >
          <div className="space-y-3 text-sm">
            <div
              className={`rounded-lg p-3 text-xs ${
                restoreSource.preview.valid
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {restoreSource.preview.valid ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <AlertTriangle size={14} />
                )}
                {restoreSource.preview.valid
                  ? "Snapshot válido. Checksum OK."
                  : "Problemas detectados"}
              </div>
              {restoreSource.preview.errors.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {restoreSource.preview.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Metric
                label="Escribir"
                value={restoreSource.preview.keysToWrite.length}
                color="text-green-700"
              />
              <Metric
                label="Eliminar"
                value={restoreSource.preview.keysToDelete.length}
                color="text-amber-700"
              />
              <Metric
                label="Desconocidas"
                value={restoreSource.preview.unknownKeys.length}
                color="text-gray-700"
              />
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>Aviso:</strong> la restauración sobrescribe el estado
              actual. Se creará un pre-snapshot automático para poder revertir.
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setRestoreSource(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRestoreConfirm}
                disabled={busy === "restore" || !restoreSource.preview.valid}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                <RotateCcw size={14} />
                {busy === "restore" ? "Restaurando…" : "Restaurar ahora"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Subcomponentes ────────────────────────────────────────────────────────

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function PassStrengthBar({ pass }: { pass: string }) {
  const s = evaluatePassphrase(pass);
  const pct = Math.round((s.score / 4) * 100);
  const color =
    s.score <= 1
      ? "bg-red-500"
      : s.score === 2
        ? "bg-amber-500"
        : s.score === 3
          ? "bg-blue-500"
          : "bg-green-500";
  return (
    <div className="mt-2">
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {s.issues.length > 0 && (
        <ul className="mt-1 text-[10px] text-gray-500">
          {s.issues.slice(0, 3).map((i) => (
            <li key={i}>· {i}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      {...clickableProps(onClose)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        {...clickableProps((e) => e?.stopPropagation())}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
