"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  loadPoints,
  performCheckin,
  getCheckinInfo,
  buildRedemptionTiers,
  pointsToEuros,
  ensureReferralCode,
  formatCountdown,
  POINTS_PER_EURO,
  DAILY_CHECKIN_POINTS,
  POINTS_MAX_DISCOUNT_PCT,
} from "@/services/pointsService";
import {
  Trophy,
  Zap,
  Gift,
  Clock,
  CheckCircle2,
  Info,
  Star,
  ShoppingBag,
  Share2,
  TrendingUp,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { AccountTabs } from "@/components/cuenta/AccountTabs";

// ─── Countdown timer ──────────────────────────────────────────────────────────

function Countdown({ nextAt }: { nextAt: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, nextAt - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, nextAt - Date.now());
      setRemaining(r);
    }, 1000);
    return () => clearInterval(id);
  }, [nextAt]);

  return (
    <span className="font-mono font-bold text-amber-600 tabular-nums">
      {formatCountdown(remaining)}
    </span>
  );
}

// ─── Points history (simulated from orders) ───────────────────────────────────

const HISTORY_ITEMS = [
  { label: "Check-in diario", points: 10, type: "earn" as const, date: "Hoy" },
  { label: "Compra #TCG-20260310", points: 150, type: "earn" as const, date: "10 mar" },
  { label: "Canje de puntos", points: -100, type: "spend" as const, date: "5 mar" },
  { label: "Compra #TCG-20260228", points: 80, type: "earn" as const, date: "28 feb" },
  { label: "Referido: María G. compró", points: 60, type: "referral" as const, date: "20 feb" },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PuntosPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [myCode, setMyCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [checkinInfo, setCheckinInfo] = useState({ canCheckin: false, nextAt: null as number | null, lastAt: null as number | null });
  const [checkinState, setCheckinState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [checkinMsg, setCheckinMsg] = useState("");

  const refresh = useCallback(() => {
    if (!user) return;
    setBalance(loadPoints(user.id));
    setMyCode(ensureReferralCode(user.id));
    setCheckinInfo(getCheckinInfo(user.id));
  }, [user]);

  const handleCopy = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    refresh();
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

  const handleCheckin = () => {
    if (!user) return;
    setCheckinState("loading");
    const result = performCheckin(user.id);
    if (result.ok) {
      setCheckinState("success");
      setCheckinMsg(`+${result.points} puntos conseguidos`);
      refresh();
      setTimeout(() => setCheckinState("idle"), 4000);
    } else {
      setCheckinState("error");
      setCheckinMsg(result.error ?? "No disponible");
      setTimeout(() => setCheckinState("idle"), 3000);
    }
  };

  const redemptionTiers = buildRedemptionTiers(balance);
  const balanceEuros = pointsToEuros(balance);

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
              <p className="text-blue-300">Check-in diario</p>
              <p className="font-bold">+{DAILY_CHECKIN_POINTS} pts</p>
            </div>
            <div className="border-l border-white/20 pl-4">
              <p className="text-blue-300">Canje</p>
              <p className="font-bold text-amber-300">10.000 pts = €1</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily check-in */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-1 flex items-center gap-2 font-bold text-gray-900">
            <Zap size={18} className="text-amber-500" /> Check-in diario
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Visita tu perfil cada día y gana {DAILY_CHECKIN_POINTS} puntos gratis
          </p>

          {checkinState === "success" ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-green-700">
              <CheckCircle2 size={18} /> <strong>{checkinMsg}</strong>
            </div>
          ) : checkinState === "error" ? (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              <Clock size={16} /> {checkinMsg}
            </div>
          ) : checkinInfo.canCheckin ? (
            <button
              onClick={handleCheckin}
              disabled={checkinState === "loading"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-white transition hover:bg-amber-400 disabled:opacity-60"
            >
              {checkinState === "loading" ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Zap size={18} /> Reclamar {DAILY_CHECKIN_POINTS} puntos
                </>
              )}
            </button>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-1 text-sm font-semibold text-amber-700">Próximo check-in en:</p>
              <p className="text-2xl">
                <Countdown nextAt={checkinInfo.nextAt!} />
              </p>
              <p className="mt-1 text-xs text-amber-600">Vuelve mañana para conseguir más puntos</p>
            </div>
          )}
        </div>

        {/* Canje */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-1 flex items-center gap-2 font-bold text-gray-900">
            <Gift size={18} className="text-[#2563eb]" /> Canjear puntos
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Usa tus puntos como descuento al finalizar tu compra
          </p>
          {redemptionTiers.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
              Necesitas al menos 10.000 puntos (= €1) para canjear.
              <br />
              Te faltan {(10000 - balance).toLocaleString("es-ES")} puntos.
            </div>
          ) : (
            <div className="space-y-2">
              {redemptionTiers.slice(0, 4).map((tier) => (
                <div
                  key={tier.points}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <Star size={14} className="text-amber-500" />
                    <span className="text-sm font-semibold text-gray-800">{tier.points.toLocaleString("es-ES")} pts</span>
                  </div>
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                    {tier.label} descuento
                  </span>
                </div>
              ))}
              <p className="mt-2 text-xs text-gray-400">
                Los puntos se canjean en el carrito antes de finalizar la compra.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Referral code */}
      {myCode && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-1 flex items-center gap-2 font-bold text-gray-900">
            <Share2 size={18} className="text-[#2563eb]" /> Tu código de bienvenida
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Comparte este código con nuevos usuarios. Al registrarse con él recibirán
            puntos de bienvenida automáticamente.
          </p>
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
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: ShoppingBag,
              color: "#2563eb",
              title: "Compras",
              desc: `${POINTS_PER_EURO} puntos por cada €1 gastado en productos`,
              example: "Compra de €100 → 10.000 pts → €1 de descuento",
            },
            {
              icon: Zap,
              color: "#f59e0b",
              title: "Check-in diario",
              desc: `${DAILY_CHECKIN_POINTS} puntos gratis cada día`,
              example: "30 días seguidos → 300 pts",
            },
          ].map(({ icon: Icon, color, title, desc, example }) => (
            <div key={title} className="rounded-xl border border-gray-100 p-4">
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <p className="font-bold text-gray-900">{title}</p>
              <p className="mt-0.5 text-sm text-gray-600">{desc}</p>
              <p className="mt-1.5 text-xs text-gray-400">{example}</p>
            </div>
          ))}

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
        <div className="divide-y divide-gray-50">
          {HISTORY_ITEMS.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5 text-sm">
              <div>
                <p className="font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400">{item.date}</p>
              </div>
              <span
                className={`text-base font-bold ${
                  item.type === "spend" ? "text-red-500" : item.type === "referral" ? "text-green-600" : "text-[#2563eb]"
                }`}
              >
                {item.points > 0 ? "+" : ""}{item.points} pts
              </span>
            </div>
          ))}
        </div>
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
