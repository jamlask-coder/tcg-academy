"use client";
/**
 * TpvSellerGate — Modal de identificación del vendedor.
 *
 * Aparece como overlay cuando se entra al TPV de una tienda y bloquea la UI
 * hasta que el operador seleccione "vendedor activo". Dos opciones:
 *
 *   1. **El propio usuario auth** (admin / tienda / super-user). Sin
 *      password adicional — ya está autenticado en la web.
 *   2. **Un trabajador (TpvWorker)** dado de alta por la tienda. Requiere
 *      nick + password — verificación con bcryptjs en cliente contra el
 *      hash guardado en localStorage.
 *
 * El seller activo se persiste en sessionStorage (un seller por pestaña).
 * Se inyecta como `operatorId` + `operatorName` en cada venta.
 */

import { useEffect, useMemo, useState } from "react";
import { Store, User as UserIcon, Lock, AlertTriangle } from "lucide-react";
import {
  listActiveWorkersByStore,
  verifyWorkerLogin,
} from "@/services/tpvWorkerService";
import { setActiveSeller } from "@/lib/tpvSeller";
import { DataHub } from "@/lib/dataHub";
import { TPV_STORES, type TpvStoreSlug } from "@/config/tpvStores";
import type { TpvActiveSeller, TpvWorker } from "@/types/tpvWorker";

interface AuthUserLike {
  id: string;
  name?: string;
  lastName?: string;
  email: string;
}

interface Props {
  storeSlug: TpvStoreSlug;
  authUser: AuthUserLike;
  /** Etiqueta que se mostrará al operador para la opción "owner" — típicamente "Tienda". */
  ownerLabel?: string;
  onSelected: (seller: TpvActiveSeller) => void;
}

function buildOwnerLabel(u: AuthUserLike, fallback?: string): string {
  if (fallback) return fallback;
  const full = `${u.name ?? ""} ${u.lastName ?? ""}`.trim();
  return full || u.email;
}

export function TpvSellerGate({
  storeSlug,
  authUser,
  ownerLabel,
  onSelected,
}: Props) {
  const store = TPV_STORES[storeSlug];

  const [workers, setWorkers] = useState<TpvWorker[]>(() =>
    listActiveWorkersByStore(storeSlug),
  );
  const [picked, setPicked] = useState<TpvWorker | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reaccionar a cambios externos (alta/baja desde el manager).
  useEffect(() => {
    const reload = () => setWorkers(listActiveWorkersByStore(storeSlug));
    return DataHub.on("tpv_workers", reload);
  }, [storeSlug]);

  const computedOwnerLabel = useMemo(
    () => buildOwnerLabel(authUser, ownerLabel),
    [authUser, ownerLabel],
  );

  function chooseOwner() {
    const seller: TpvActiveSeller = {
      kind: "owner",
      id: authUser.id,
      label: computedOwnerLabel,
      storeSlug,
      selectedAt: new Date().toISOString(),
    };
    setActiveSeller(seller);
    onSelected(seller);
  }

  async function confirmWorker() {
    if (!picked) return;
    setError(null);
    setBusy(true);
    try {
      const verified = await verifyWorkerLogin(picked.id, password);
      if (!verified) {
        setError("Nick o contraseña incorrectos.");
        return;
      }
      const seller: TpvActiveSeller = {
        kind: "worker",
        id: verified.id,
        label: verified.nickname,
        storeSlug,
        selectedAt: new Date().toISOString(),
      };
      setActiveSeller(seller);
      onSelected(seller);
    } finally {
      setBusy(false);
    }
  }

  function cancelWorkerPick() {
    setPicked(null);
    setPassword("");
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/95 p-6">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Store size={13} />
            TPV {store.name}
          </div>
          <h1 className="text-2xl font-black">¿Quién está vendiendo?</h1>
          <p className="mt-1 text-sm text-slate-400">
            Identifícate antes de empezar — cada venta se registra con el
            nombre del vendedor.
          </p>
        </div>

        {picked ? (
          // ── Sub-pantalla: pedir password del worker ─────────────────────
          <div className="mx-auto max-w-sm">
            <div className="mb-4 flex items-center justify-center gap-3 rounded-xl bg-slate-800 px-4 py-3">
              <UserIcon size={18} className="text-green-400" />
              <span className="font-bold">{picked.nickname}</span>
            </div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Contraseña
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border-2 border-slate-700 bg-slate-800 px-3">
              <Lock size={16} className="text-slate-500" />
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmWorker();
                }}
                disabled={busy}
                className="w-full bg-transparent py-3 text-base text-white outline-none placeholder:text-slate-500"
                placeholder="••••••"
              />
            </div>
            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-950 px-3 py-2 text-xs text-red-300">
                <AlertTriangle size={13} />
                {error}
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <button
                onClick={cancelWorkerPick}
                disabled={busy}
                className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                onClick={confirmWorker}
                disabled={busy || password.length === 0}
                className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-black text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Comprobando…" : "Entrar"}
              </button>
            </div>
          </div>
        ) : (
          // ── Pantalla principal: lista de opciones ───────────────────────
          <div className="space-y-2">
            <button
              onClick={chooseOwner}
              className="flex w-full items-center justify-between rounded-2xl border-2 border-blue-500/40 bg-blue-950/40 px-5 py-4 text-left transition hover:border-blue-400 hover:bg-blue-900/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                  <Store size={18} className="text-blue-300" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-300">
                    Tienda
                  </div>
                  <div className="font-bold">{computedOwnerLabel}</div>
                </div>
              </div>
              <span className="text-xs text-slate-400">Entrar →</span>
            </button>

            {workers.length === 0 ? (
              <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-500">
                Aún no hay trabajadores dados de alta para esta tienda. Si eres
                el responsable, puedes crearlos desde el menú &ldquo;Trabajadores&rdquo;
                del TPV una vez dentro.
              </p>
            ) : (
              <>
                <div className="mt-4 mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Trabajadores
                </div>
                {workers.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      setPicked(w);
                      setPassword("");
                      setError(null);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border-2 border-slate-700 bg-slate-800 px-5 py-3 text-left transition hover:border-green-500/60 hover:bg-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20">
                        <UserIcon size={15} className="text-green-300" />
                      </div>
                      <span className="font-bold">{w.nickname}</span>
                    </div>
                    <span className="text-xs text-slate-400">Login →</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
