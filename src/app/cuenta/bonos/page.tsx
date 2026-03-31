"use client";
import { useState } from "react";
import { Star, TrendingUp, TrendingDown, Gift, X, Check } from "lucide-react";
import {
  MOCK_POINTS_HISTORY,
  MOCK_POINTS_BALANCE,
  POINTS_REDEMPTION_TABLE,
  type PointsTransaction,
} from "@/data/mockData";

const TYPE_CONFIG: Record<
  PointsTransaction["type"],
  { label: string; color: string; bg: string }
> = {
  compra: { label: "Compra", color: "text-green-700", bg: "bg-green-100" },
  canje: { label: "Canje", color: "text-red-600", bg: "bg-red-100" },
  bonus: { label: "Bonus", color: "text-amber-700", bg: "bg-amber-100" },
  devolucion: {
    label: "Devolución",
    color: "text-gray-600",
    bg: "bg-gray-100",
  },
};

function RedeemModal({
  balance,
  onClose,
}: {
  balance: number;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const available = POINTS_REDEMPTION_TABLE.filter((r) => r.points <= balance);

  if (confirmed) {
    const option = POINTS_REDEMPTION_TABLE.find((r) => r.points === selected)!;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check size={32} className="text-green-500" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">
            ¡Puntos canjeados!
          </h3>
          <p className="mb-1 text-gray-600">
            Has canjeado <strong>{option.points} puntos</strong> por un
            descuento de{" "}
            <strong className="text-[#2563eb]">
              {option.euros.toFixed(2)}€
            </strong>
            .
          </p>
          <p className="mb-6 text-sm text-gray-500">
            El cupón se ha aplicado automáticamente a tu próxima compra.
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-[#2563eb] py-3 font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            Aceptar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Canjear puntos</h3>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Saldo disponible:{" "}
          <strong className="text-base text-[#2563eb]">{balance} puntos</strong>
        </p>
        <div className="mb-5 space-y-2">
          {POINTS_REDEMPTION_TABLE.map((option) => {
            const canRedeem = option.points <= balance;
            return (
              <button
                key={option.points}
                onClick={() => canRedeem && setSelected(option.points)}
                disabled={!canRedeem}
                className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition ${
                  selected === option.points
                    ? "border-[#2563eb] bg-blue-50"
                    : canRedeem
                      ? "border-gray-200 hover:border-gray-300"
                      : "cursor-not-allowed border-gray-100 opacity-40"
                }`}
              >
                <span className="font-bold text-gray-900">
                  {option.points} puntos
                </span>
                <span
                  className={`text-lg font-black ${canRedeem ? "text-[#2563eb]" : "text-gray-300"}`}
                >
                  = {option.euros.toFixed(2)}€
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => selected && setConfirmed(true)}
          disabled={!selected}
          className="w-full rounded-xl bg-[#2563eb] py-3.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-40"
        >
          Canjear {selected ? `${selected} puntos` : "puntos"}
        </button>
        {available.length === 0 && (
          <p className="mt-3 text-center text-sm text-gray-400">
            Necesitas al menos 100 puntos para canjear.
          </p>
        )}
      </div>
    </div>
  );
}

export default function BonosPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      {showModal && (
        <RedeemModal
          balance={MOCK_POINTS_BALANCE}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Star size={22} className="text-amber-500" /> Bonos y Puntos
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Acumula puntos con cada compra y canjéalos por descuentos
        </p>
      </div>

      {/* Points balance card */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-400 p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-medium text-amber-100">
              Tus puntos acumulados
            </p>
            <div className="flex items-end gap-2">
              <span className="text-6xl leading-none font-black">
                {MOCK_POINTS_BALANCE}
              </span>
              <span className="mb-1 text-lg font-bold text-amber-200">
                puntos
              </span>
            </div>
            <p className="mt-2 text-sm text-amber-100">
              Equivalen a{" "}
              <strong className="text-white">
                {(MOCK_POINTS_BALANCE / 100).toFixed(2)}€
              </strong>{" "}
              de descuento
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="min-h-[44px] rounded-xl bg-white px-6 py-3 text-sm font-bold text-amber-600 transition hover:bg-amber-50"
          >
            <Gift size={16} className="-mt-0.5 mr-1.5 inline" />
            Canjear puntos
          </button>
        </div>
      </div>

      {/* How to earn */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
          <div className="mb-2 text-3xl">🛍️</div>
          <p className="text-sm font-bold text-gray-900">Compra</p>
          <p className="mt-1 text-xs text-gray-500">1€ gastado = 1 punto</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
          <div className="mb-2 text-3xl">🎁</div>
          <p className="text-sm font-bold text-gray-900">Bonus especiales</p>
          <p className="mt-1 text-xs text-gray-500">Eventos y promociones</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
          <div className="mb-2 text-3xl">⭐</div>
          <p className="text-sm font-bold text-gray-900">Bienvenida</p>
          <p className="mt-1 text-xs text-gray-500">50 puntos al registrarte</p>
        </div>
      </div>

      {/* Redemption table */}
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-900">Tabla de canje</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="rounded-l-xl px-4 py-2.5 text-left font-semibold text-gray-600">
                  Puntos necesarios
                </th>
                <th className="rounded-r-xl px-4 py-2.5 text-right font-semibold text-gray-600">
                  Descuento obtenido
                </th>
              </tr>
            </thead>
            <tbody>
              {POINTS_REDEMPTION_TABLE.map((row) => (
                <tr
                  key={row.points}
                  className={`border-t border-gray-100 ${row.points <= MOCK_POINTS_BALANCE ? "" : "opacity-50"}`}
                >
                  <td className="flex items-center gap-2 px-4 py-3">
                    <Star size={14} className="flex-shrink-0 text-amber-400" />
                    <span className="font-semibold text-gray-900">
                      {row.points} puntos
                    </span>
                    {row.points <= MOCK_POINTS_BALANCE && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        Disponible
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-[#2563eb]">
                    {row.euros.toFixed(2)}€
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* History */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-900">Historial de puntos</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {MOCK_POINTS_HISTORY.map((tx) => {
            const config = TYPE_CONFIG[tx.type];
            return (
              <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5">
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${config.bg}`}
                >
                  {tx.points > 0 ? (
                    <TrendingUp size={16} className={config.color} />
                  ) : (
                    <TrendingDown size={16} className={config.color} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {tx.concept}
                  </p>
                  <p className="text-xs text-gray-500">{tx.date}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p
                    className={`text-sm font-bold ${tx.points > 0 ? "text-green-600" : "text-red-500"}`}
                  >
                    {tx.points > 0 ? "+" : ""}
                    {tx.points} pts
                  </p>
                  <p className="text-xs text-gray-400">Saldo: {tx.balance}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
