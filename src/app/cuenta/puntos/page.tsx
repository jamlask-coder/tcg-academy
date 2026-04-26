"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  loadPoints,
  loadPendingPoints,
  getNextMaturationDate,
  getPointsHistory,
  pointsToEuros,
  ensureReferralCode,
  POINTS_PER_EURO,
  POINTS_MAX_DISCOUNT_PCT,
  POINTS_PENDING_DAYS,
  REFERRAL_INVITER_BONUS,
  REFERRAL_NEW_USER_BONUS,
  type HistoryEntry,
} from "@/services/pointsService";
import { DataHub } from "@/lib/dataHub";
import {
  Trophy,
  Clock,
  CheckCircle2,
  Info,
  ShoppingBag,
  Share2,
  TrendingUp,
  Copy,
  ShieldCheck,
  Hourglass,
} from "lucide-react";
import Link from "next/link";
import { AccountTabs } from "@/components/cuenta/AccountTabs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
});

function formatHistoryDate(ts: number): string {
  return DATE_FMT.format(new Date(ts));
}

function formatMaturationDate(ts: number): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(ts));
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PuntosPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState(0);
  const [nextMaturation, setNextMaturation] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // Snapshot de "ahora" para mostrar pendientes consistentemente durante el
  // render (Date.now en JSX rompe react-hooks/purity y produce flicker).
  const [nowTs, setNowTs] = useState(0);
  const [myCode, setMyCode] = useState("");
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(() => {
    if (!user) return;
    setBalance(loadPoints(user.id));
    setPending(loadPendingPoints(user.id));
    setNextMaturation(getNextMaturationDate(user.id));
    setHistory(getPointsHistory(user.id));
    setNowTs(Date.now());
    setMyCode(ensureReferralCode(user.id));
  }, [user]);

  const handleCopy = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial síncrona desde localStorage tras montar
    refresh();
    return DataHub.on("points", refresh);
  }, [refresh]);

  if (!user || user.role !== "cliente") {
    return (
      <div>
        <AccountTabs group="recompensas" />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Trophy size={40} className="mx-auto mb-3 text-amber-400" />
          <p className="font-semibold text-amber-700">El programa de puntos es exclusivo para clientes.</p>
          <p className="mt-1 text-sm text-amber-600">
            Los usuarios profesionales (mayoristas/tiendas) tienen acceso a otras ventajas.
          </p>
        </div>
      </div>
    );
  }

  const balanceEuros = pointsToEuros(balance);
  const inviterEuros = Math.floor(REFERRAL_INVITER_BONUS / 10000);
  const newUserEuros = Math.floor(REFERRAL_NEW_USER_BONUS / 10000);

  return (
    <div className="space-y-6">
      <AccountTabs group="recompensas" />

      {/* Balance card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] p-6 text-white">
        <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative">
          <p className="mb-1 text-sm text-blue-200">Saldo actual</p>
          <p className="text-5xl font-black tabular-nums">
            {balance.toLocaleString("es-ES")}
            <span className="ml-2 text-2xl font-bold text-blue-300">pts</span>
          </p>
          <p className="mt-1 text-blue-200">
            Equivale a <strong className="text-amber-300">{balanceEuros.toFixed(2)}€</strong> de descuento
          </p>

          <div className="mt-4 flex flex-wrap gap-4 border-t border-white/20 pt-4 text-sm">
            <div>
              <p className="text-blue-300">Por compra</p>
              <p className="font-bold">{POINTS_PER_EURO} pts / €1</p>
            </div>
            <div className="border-l border-white/20 pl-4">
              <p className="text-blue-300">Canje</p>
              <p className="font-bold text-amber-300">10.000 pts = €1</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending points (hold 14d) */}
      {pending > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <Hourglass size={20} className="text-amber-600" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-amber-900">
                  {pending.toLocaleString("es-ES")} pts pendientes
                  <span className="ml-2 text-sm font-medium text-amber-700">
                    (= {pointsToEuros(pending).toFixed(2)}€)
                  </span>
                </p>
                {nextMaturation !== null && (
                  <p className="text-xs font-semibold text-amber-700">
                    Disponibles desde el {formatMaturationDate(nextMaturation)}
                  </p>
                )}
              </div>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-amber-800">
                <ShieldCheck size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>
                  Por seguridad, los puntos de cada compra se acreditan{" "}
                  <strong>{POINTS_PENDING_DAYS} días después</strong> para cubrir
                  posibles devoluciones. Si devuelves el pedido durante ese
                  periodo, los puntos pendientes se anulan automáticamente y tu
                  saldo disponible no cambia.
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Referral code */}
      {myCode && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-1 flex items-center gap-2 font-bold text-gray-900">
            <Share2 size={18} className="text-[#2563eb]" /> Tu código de bienvenida
          </h2>
          <p className="mb-3 text-sm text-gray-500">
            Comparte este código con nuevos usuarios. Al registrarse con él:
          </p>
          <ul className="mb-4 space-y-1.5 text-sm">
            <li className="flex items-start gap-2 text-gray-700">
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">✓</span>
              <span>
                Tú recibes <strong className="text-[#2563eb]">{REFERRAL_INVITER_BONUS.toLocaleString("es-ES")} puntos</strong>{" "}
                <span className="text-gray-400">(= {inviterEuros}€)</span>
              </span>
            </li>
            <li className="flex items-start gap-2 text-gray-700">
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">✓</span>
              <span>
                Tu invitado recibe <strong className="text-[#2563eb]">{REFERRAL_NEW_USER_BONUS.toLocaleString("es-ES")} puntos</strong>{" "}
                <span className="text-gray-400">(= {newUserEuros}€) canjeables en su próxima compra</span>
              </span>
            </li>
          </ul>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl border-2 border-dashed border-[#2563eb]/30 bg-blue-50 px-4 py-3 text-center">
              <p className="font-mono text-xl font-black tracking-widest text-[#2563eb]">
                {myCode}
              </p>
            </div>
            <button
              onClick={handleCopy}
              aria-label="Copiar código"
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition ${
                copied
                  ? "bg-green-500 text-white"
                  : "border border-gray-200 text-gray-500 hover:border-[#2563eb] hover:text-[#2563eb]"
              }`}
            >
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            </button>
          </div>
          {copied && (
            <p className="mt-2 text-xs font-semibold text-green-600">
              ✓ Código copiado al portapapeles
            </p>
          )}
        </div>
      )}

      {/* How to earn */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
          <TrendingUp size={18} className="text-[#2563eb]" /> Cómo ganar puntos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 p-4">
            <div
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: "#2563eb15" }}
            >
              <ShoppingBag size={18} style={{ color: "#2563eb" }} />
            </div>
            <p className="font-bold text-gray-900">Compras</p>
            <p className="mt-0.5 text-sm text-gray-600">
              {POINTS_PER_EURO} puntos por cada €1 gastado en productos
            </p>
            <p className="mt-1.5 text-xs text-gray-400">
              Compra de €100 → 10.000 pts → €1 de descuento
            </p>
            <p className="mt-2 flex items-start gap-1 text-xs text-amber-700">
              <Hourglass size={11} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>
                Disponibles a los {POINTS_PENDING_DAYS} días por si hay devolución
              </span>
            </p>
          </div>

          {/* Asociaciones — needs bilateral explanation */}
          <div className="rounded-xl border border-gray-100 p-4">
            <div
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: "#16a34a15" }}
            >
              <Share2 size={18} style={{ color: "#16a34a" }} />
            </div>
            <p className="font-bold text-gray-900">Asociaciones</p>
            <p className="mt-0.5 text-sm text-gray-600">
              5.000 pts por cada €100 que gaste un asociado — y ellos ganan lo mismo de tus compras
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-400">
                <span className="font-semibold text-green-600">Asociado compra €100</span> → tú recibes <span className="font-semibold">+5.000 pts</span> (= €0,50)
              </p>
              <p className="text-xs text-gray-400">
                <span className="font-semibold text-[#2563eb]">Tú compras €100</span> → cada asociado recibe <span className="font-semibold">+5.000 pts</span> (= €0,50)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <Clock size={16} className="text-gray-400" /> Historial reciente
          </h2>
        </div>
        {history.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            Aún no hay movimientos en tu cuenta de puntos.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.slice(0, 12).map((item) => {
              const isPending =
                item.type === "compra" &&
                typeof item.availableAt === "number" &&
                !item.released &&
                !item.cancelled &&
                item.availableAt > nowTs;
              const isCancelled = item.cancelled === true;
              const ptsClass = isCancelled
                ? "text-gray-400 line-through"
                : isPending
                ? "text-amber-600"
                : item.pts < 0
                ? "text-red-500"
                : item.type === "asociacion" || item.type === "bienvenida"
                ? "text-green-600"
                : "text-[#2563eb]";
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-5 py-3.5 text-sm"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="truncate font-medium text-gray-800">
                      {item.desc}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span className="text-gray-400">
                        {formatHistoryDate(item.ts)}
                      </span>
                      {isPending && item.availableAt && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                          <Hourglass size={10} aria-hidden="true" />
                          Disponible {formatMaturationDate(item.availableAt)}
                        </span>
                      )}
                      {isCancelled && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-500">
                          Anulado por devolución
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-base font-bold tabular-nums ${ptsClass}`}>
                    {item.pts > 0 ? "+" : ""}
                    {item.pts.toLocaleString("es-ES")} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        <Info size={16} className="mt-0.5 flex-shrink-0 text-blue-400" />
        <div className="space-y-1">
          <p>
            <strong>Condiciones del programa de puntos:</strong> Los puntos son personales e intransferibles.
            Caducan a los 24 meses sin actividad. No aplicable a usuarios profesionales (mayoristas/tiendas).
          </p>
          <p>
            <strong>Acreditación de {POINTS_PENDING_DAYS} días:</strong> Los puntos
            obtenidos por compras se acreditan en tu saldo disponible{" "}
            <strong>{POINTS_PENDING_DAYS} días después</strong> de la compra. Es
            una medida de seguridad: si solicitas una devolución durante ese
            periodo, los puntos pendientes se anulan automáticamente sin
            descontar de tu saldo previo.
          </p>
          <p>
            <strong>Límite de canje:</strong> Los puntos pueden descontar como máximo el{" "}
            <strong>{(POINTS_MAX_DISCOUNT_PCT * 100).toFixed(0)}% del subtotal de productos</strong> de cada pedido
            (envío excluido). Ejemplo: en una compra de €100, el descuento máximo por puntos es de €50.
          </p>
          <p>
            Para más información sobre el programa de grupos,{" "}
            <Link href="/cuenta/grupo" className="font-semibold underline">
              visita la sección Mi grupo
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
