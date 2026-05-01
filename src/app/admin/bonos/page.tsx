"use client";
import { useState } from "react";
import { Star, Settings, TrendingUp, Plus, AlertTriangle } from "lucide-react";
import type { AdminUser } from "@/data/mockData";
import {
  POINTS_PER_EURO,
  POINTS_PER_EURO_REDEMPTION,
  POINTS_REDEMPTION_TABLE,
} from "@/services/pointsService";

const TOP_USERS: AdminUser[] = [];
const ALL_USERS: AdminUser[] = [];

export default function AdminBonosPage() {
  const [pointsPerEuro, setPointsPerEuro] = useState(POINTS_PER_EURO);
  const [redeemTable, setRedeemTable] = useState(POINTS_REDEMPTION_TABLE);
  const [addPointsUser, setAddPointsUser] = useState("");
  const [addPointsAmount, setAddPointsAmount] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveRatio = () => {
    const confirmMsg =
      `⚠️ ATENCIÓN — CAMBIO DE RATIO DE PUNTOS\n\n` +
      `Vas a modificar el ratio de ganancia de puntos a ${pointsPerEuro} pts/€.\n\n` +
      `Esto afecta al BALANCE ECONÓMICO GLOBAL del programa.\n` +
      `Referencia actual: ${POINTS_PER_EURO} pts ganados / €1 · canje ${POINTS_PER_EURO_REDEMPTION.toLocaleString("es-ES")} pts = €1.\n\n` +
      `¿Confirmas el cambio?`;
    if (window.confirm(confirmMsg)) {
      showToast("Configuración guardada");
    }
  };

  const handleSaveTable = () => {
    const confirmMsg =
      `⚠️ ATENCIÓN — CAMBIO DE TABLA DE CANJE\n\n` +
      `Vas a modificar los tramos de canje de puntos.\n\n` +
      `Esto afecta al VALOR que los clientes obtienen por sus puntos.\n` +
      `¿Confirmas el cambio?`;
    if (window.confirm(confirmMsg)) {
      showToast("Tabla de canje actualizada");
    }
  };

  return (
    <div>
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-medium text-white shadow-xl">
          ✓ {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Star size={22} className="text-amber-500" /> Gestión de bonos y
          puntos
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configura el programa de fidelidad y gestiona los puntos de los
          clientes
        </p>
      </div>

      {/* ⚠️ Advertencia crítica sobre cambios de configuración */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4">
        <AlertTriangle size={22} className="mt-0.5 flex-shrink-0 text-red-600" />
        <div className="text-sm text-red-800">
          <p className="font-bold">Zona sensible — cambios con impacto económico global</p>
          <p className="mt-1">
            Los ratios de este panel afectan al programa de fidelidad de <strong>toda la tienda</strong>.
            Cualquier modificación se aplica a clientes actuales y futuros.
            Regla vigente: <strong>{POINTS_PER_EURO} pts por €1 gastado en productos · {POINTS_PER_EURO_REDEMPTION.toLocaleString("es-ES")} pts = €1 de descuento</strong>.
            Envío y descuentos por puntos <strong>no generan puntos</strong>.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Points ratio */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <Settings size={17} className="text-gray-400" /> Configuración de
            puntos
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Puntos por cada euro gastado (solo productos)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={pointsPerEuro}
                  min="1"
                  max="1000"
                  onChange={(e) =>
                    setPointsPerEuro(parseInt(e.target.value) || 1)
                  }
                  className="h-11 w-28 rounded-xl border-2 border-gray-200 px-3 text-center text-xl font-bold focus:border-[#2563eb] focus:outline-none"
                />
                <span className="text-sm text-gray-500">puntos / €</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Referencia: {POINTS_PER_EURO_REDEMPTION.toLocaleString("es-ES")} pts = €1 de descuento al canjear.
              </p>
            </div>
            <button
              onClick={handleSaveRatio}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
            >
              <AlertTriangle size={15} /> Guardar (con confirmación)
            </button>
          </div>
        </div>

        {/* Redemption table */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <TrendingUp size={17} className="text-gray-400" /> Tabla de canje
          </h2>
          <div className="space-y-2">
            {redeemTable.map((row, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex flex-1 items-center gap-1.5">
                  <Star size={12} className="flex-shrink-0 text-amber-400" />
                  <input
                    type="number"
                    value={row.points}
                    min="1"
                    onChange={(e) =>
                      setRedeemTable((prev) =>
                        prev.map((r, j) =>
                          j === i
                            ? { ...r, points: parseInt(e.target.value) || 0 }
                            : r,
                        ),
                      )
                    }
                    className="h-9 w-20 rounded-lg border border-gray-200 px-2 text-center text-sm focus:border-[#2563eb] focus:outline-none"
                  />
                  <span className="text-xs text-gray-500">pts =</span>
                  <input
                    type="number"
                    value={row.euros}
                    min="0.01"
                    step="0.01"
                    onChange={(e) =>
                      setRedeemTable((prev) =>
                        prev.map((r, j) =>
                          j === i
                            ? { ...r, euros: parseFloat(e.target.value) || 0 }
                            : r,
                        ),
                      )
                    }
                    className="h-9 w-20 rounded-lg border border-gray-200 px-2 text-center text-sm focus:border-[#2563eb] focus:outline-none"
                  />
                  <span className="text-xs text-gray-500">€</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveTable}
            className="mt-4 flex min-h-[44px] items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
          >
            <AlertTriangle size={14} /> Guardar tabla (con confirmación)
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top users */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-bold text-gray-900">Ranking de puntos</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {TOP_USERS.map((user, i) => (
              <div
                key={user.id}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-black ${
                    i === 0
                      ? "bg-amber-400 text-white"
                      : i === 1
                        ? "bg-gray-300 text-white"
                        : i === 2
                          ? "bg-amber-700 text-white"
                          : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {user.name} {user.lastName}
                  </p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={14} className="fill-current" />
                  <span className="text-sm font-bold text-gray-900">
                    {user.points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add points manually */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <Plus size={17} className="text-gray-400" /> Añadir puntos
            manualmente
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Usuario
              </label>
              <select
                value={addPointsUser}
                onChange={(e) => setAddPointsUser(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-3 text-sm focus:border-[#2563eb] focus:outline-none"
              >
                <option value="">Seleccionar usuario...</option>
                {ALL_USERS.filter((u) => u.role !== "admin").map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Cantidad de puntos
              </label>
              <input
                type="number"
                value={addPointsAmount}
                min="1"
                onChange={(e) => setAddPointsAmount(e.target.value)}
                placeholder="Ej: 50"
                className="h-11 w-full rounded-xl border-2 border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                if (!addPointsUser || !addPointsAmount) return;
                const user = ALL_USERS.find((u) => u.id === addPointsUser);
                showToast(
                  `${addPointsAmount} puntos añadidos a ${user?.name} ${user?.lastName}`,
                );
                setAddPointsUser("");
                setAddPointsAmount("");
              }}
              disabled={!addPointsUser || !addPointsAmount}
              className="min-h-[44px] w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-40"
            >
              <Star size={14} className="-mt-0.5 mr-1.5 inline" />
              Añadir puntos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
