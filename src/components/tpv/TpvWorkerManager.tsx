"use client";
/**
 * TpvWorkerManager — Panel CRUD de trabajadores TPV de una tienda.
 *
 * Quién lo ve: el owner (usuario `role === "tienda"` cuya `tpvStoreSlug`
 * coincide con la tienda en cuestión) Y los admin / super-usuarios. Los
 * workers logueados NO ven este panel — pueden vender pero no gestionar.
 *
 * El componente se renderiza como un modal full-screen — el padre controla
 * apertura/cierre. CRUD es 100% local (localStorage) vía
 * `tpvWorkerService`. Persistencia server es responsabilidad futura.
 */

import { useEffect, useState } from "react";
import {
  X,
  Plus,
  UserPlus,
  KeyRound,
  Power,
  PowerOff,
  AlertTriangle,
} from "lucide-react";
import {
  listWorkersByOwner,
  createWorker,
  setWorkerActive,
  resetWorkerPassword,
} from "@/services/tpvWorkerService";
import { DataHub } from "@/lib/dataHub";
import { TPV_STORES, type TpvStoreSlug } from "@/config/tpvStores";
import type { TpvWorker } from "@/types/tpvWorker";

interface Props {
  storeSlug: TpvStoreSlug;
  /**
   * userId que figura como `ownerUserId` de los workers gestionados desde
   * este panel. Típicamente la cuenta `tienda` asignada a la tienda.
   * Cuando un admin abre el panel debe pasar AQUÍ el id de la cuenta
   * "tienda" cuyos workers quiere gestionar — no su propio id de admin.
   */
  ownerUserId: string;
  onClose: () => void;
}

export function TpvWorkerManager({ storeSlug, ownerUserId, onClose }: Props) {
  const store = TPV_STORES[storeSlug];
  const [workers, setWorkers] = useState<TpvWorker[]>(() =>
    listWorkersByOwner(ownerUserId),
  );
  const [showCreate, setShowCreate] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  useEffect(() => {
    const reload = () => setWorkers(listWorkersByOwner(ownerUserId));
    return DataHub.on("tpv_workers", reload);
  }, [ownerUserId]);

  return (
    <div className="fixed inset-0 z-[450] flex items-center justify-center bg-slate-950/95 p-4">
      <div className="flex w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">
              Trabajadores · {store.name}
            </h2>
            <p className="text-xs text-gray-500">
              Da de alta vendedores que podrán operar el TPV de esta tienda
              con su nick y contraseña.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {workers.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
              <UserPlus size={32} className="mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-bold text-gray-700">
                Aún no has dado de alta a ningún trabajador.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Crea cuentas con nick y contraseña — cada venta que hagan
                quedará registrada con su nombre.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {workers.map((w) => (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${w.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}
                    >
                      {w.active ? <Power size={15} /> : <PowerOff size={15} />}
                    </span>
                    <div>
                      <div className="font-bold text-gray-900">
                        {w.nickname}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-gray-400">
                        {w.active ? "Activo" : "Inactivo"} ·{" "}
                        {w.lastLoginAt
                          ? `Último acceso ${new Date(w.lastLoginAt).toLocaleString()}`
                          : "Sin accesos"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setResettingId(w.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                    >
                      <KeyRound size={12} />
                      Reset password
                    </button>
                    {w.active ? (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `¿Dar de baja a ${w.nickname}? No podrá entrar al TPV hasta que lo reactives.`,
                            )
                          ) {
                            setWorkerActive(w.id, false);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <PowerOff size={12} />
                        Dar de baja
                      </button>
                    ) : (
                      <button
                        onClick={() => setWorkerActive(w.id, true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800 transition hover:bg-green-100"
                      >
                        <Power size={12} />
                        Reactivar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Cerrar
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-500"
          >
            <Plus size={14} />
            Nuevo trabajador
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateWorkerDialog
          storeSlug={storeSlug}
          ownerUserId={ownerUserId}
          onClose={() => setShowCreate(false)}
        />
      )}

      {resettingId && (
        <ResetPasswordDialog
          workerId={resettingId}
          workerNick={workers.find((w) => w.id === resettingId)?.nickname ?? ""}
          onClose={() => setResettingId(null)}
        />
      )}
    </div>
  );
}

// ─── Diálogos secundarios ────────────────────────────────────────────────────

function CreateWorkerDialog({
  storeSlug,
  ownerUserId,
  onClose,
}: {
  storeSlug: TpvStoreSlug;
  ownerUserId: string;
  onClose: () => void;
}) {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const result = await createWorker({
        ownerUserId,
        storeSlug,
        nickname,
        password,
      });
      if (!result.ok) {
        setError(result.error ?? "No se pudo crear el trabajador.");
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[460] flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-1 text-lg font-black text-gray-900">
          Nuevo trabajador
        </h3>
        <p className="mb-4 text-xs text-gray-500">
          Solo letras, números, punto, guión y barra-baja. Mínimo 2 caracteres.
        </p>

        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
          Nick
        </label>
        <input
          autoFocus
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={busy}
          className="mt-1 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500"
          placeholder="ej: pepe"
        />

        <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-gray-600">
          Contraseña
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          className="mt-1 w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500"
          placeholder="mínimo 4 caracteres"
        />

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={12} />
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy || !nickname || !password}
            className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Creando…" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordDialog({
  workerId,
  workerNick,
  onClose,
}: {
  workerId: string;
  workerNick: string;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const result = await resetWorkerPassword(workerId, password);
      if (!result.ok) {
        setError(result.error ?? "No se pudo restablecer.");
        return;
      }
      setDone(true);
      setTimeout(onClose, 1200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[460] flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-1 text-lg font-black text-gray-900">
          Nueva contraseña
        </h3>
        <p className="mb-4 text-xs text-gray-500">
          Para <strong>{workerNick}</strong>. Mínimo 4 caracteres.
        </p>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy || done}
          className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500"
          placeholder="••••••"
        />

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={12} />
            {error}
          </div>
        )}

        {done && (
          <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
            Contraseña actualizada.
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy || done || !password}
            className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Restablecer"}
          </button>
        </div>
      </div>
    </div>
  );
}
