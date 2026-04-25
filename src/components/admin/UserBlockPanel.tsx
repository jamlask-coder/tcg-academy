"use client";
// Panel admin para bloquear / desbloquear un usuario.
//
// Un usuario bloqueado NO puede finalizar pedidos: la pasarela
// /finalizar-compra detecta `user.blocked === true` y redirige al carrito
// con un mensaje genérico. El bloqueo NO afecta a:
//   - login / lectura de cuenta
//   - histórico de pedidos / facturas (inmutables)
//   - navegación pública
//
// Solo admins acceden a este panel (vive dentro de /admin/usuarios/[id]).

import { useEffect, useState } from "react";
import { Ban, Check, AlertTriangle, ShieldOff } from "lucide-react";
import {
  blockUser,
  unblockUser,
  loadFullUser,
} from "@/services/userAdminService";
import { useAuth } from "@/context/AuthContext";
import { DataHub } from "@/lib/dataHub";

interface Props {
  userId: string;
}

export function UserBlockPanel({ userId }: Props) {
  const { user: adminUser } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [blockedAt, setBlockedAt] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [savedTick, setSavedTick] = useState(0);

  function reload() {
    const u = loadFullUser(userId);
    if (!u) return;
    setBlocked(!!u.blocked);
    setReason(u.blockedReason ?? "");
    setBlockedAt(u.blockedAt ?? null);
  }

  useEffect(() => {
    reload();
    return DataHub.on("users", reload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function handleBlock() {
    if (!draftReason.trim()) return;
    blockUser(userId, draftReason.trim(), adminUser?.id ?? "admin");
    setDraftReason("");
    setConfirming(false);
    setSavedTick((t) => t + 1);
  }

  function handleUnblock() {
    unblockUser(userId, adminUser?.id ?? "admin");
    setSavedTick((t) => t + 1);
  }

  // Solo admins manipulan
  if (adminUser?.role !== "admin") return null;

  return (
    <div
      className={`rounded-2xl border-2 p-5 transition ${
        blocked
          ? "border-red-200 bg-red-50/40"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="mb-4 flex items-center gap-2">
        {blocked ? (
          <Ban size={15} className="text-red-600" />
        ) : (
          <ShieldOff size={15} className="text-gray-500" />
        )}
        <h3 className="font-bold text-gray-900">
          {blocked ? "Cuenta bloqueada" : "Estado de cuenta"}
        </h3>
        {savedTick > 0 && (
          <span
            key={savedTick}
            className="ml-auto flex items-center gap-1 text-xs font-semibold text-green-600"
          >
            <Check size={12} /> Aplicado
          </span>
        )}
      </div>

      {blocked ? (
        <>
          <div className="mb-4 rounded-xl border border-red-200 bg-white p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-red-500 font-bold">
              Motivo
            </p>
            <p className="mt-1 text-gray-800">{reason || "—"}</p>
            {blockedAt && (
              <p className="mt-2 text-[11px] text-gray-400">
                Bloqueado el {new Date(blockedAt).toLocaleString("es-ES")}
              </p>
            )}
          </div>

          <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              El usuario no puede finalizar pedidos. Verá el mensaje
              &ldquo;No se ha podido completar tu pedido. Contacta con
              nosotros&rdquo; al intentar pagar.
            </span>
          </p>

          <button
            onClick={handleUnblock}
            className="w-full rounded-xl border border-green-200 bg-green-50 py-2.5 text-sm font-bold text-green-700 transition hover:bg-green-100"
          >
            Desbloquear usuario
          </button>
        </>
      ) : confirming ? (
        <>
          <p className="mb-2 text-sm text-gray-600">
            Motivo del bloqueo (visible solo para admins):
          </p>
          <textarea
            value={draftReason}
            onChange={(e) => setDraftReason(e.target.value)}
            rows={3}
            placeholder="Ej: Disputa pendiente, sospecha de fraude, devoluciones reiteradas…"
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            autoFocus
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setConfirming(false);
                setDraftReason("");
              }}
              className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleBlock}
              disabled={!draftReason.trim()}
              className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirmar bloqueo
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600">
            La cuenta está activa. El usuario puede comprar con normalidad.
          </p>
          <button
            onClick={() => setConfirming(true)}
            className="w-full rounded-xl border border-red-200 bg-white py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
          >
            Bloquear usuario
          </button>
          <p className="mt-2 text-[11px] text-gray-400">
            Bloquear impide finalizar pedidos pero no cierra la sesión ni borra
            datos. La acción queda registrada en el changelog.
          </p>
        </>
      )}
    </div>
  );
}
