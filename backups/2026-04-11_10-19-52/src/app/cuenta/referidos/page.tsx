"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ensureReferralCode,
  getReferredCount,
  loadPoints,
  REFERRAL_L1_PER_EURO,
  REFERRAL_L2_PER_EURO,
  POINTS_PER_EURO,
} from "@/services/pointsService";
import {
  Share2,
  Copy,
  Check,
  Users,
  Trophy,
  TrendingUp,
  Gift,
  Info,
  ChevronRight,
  Star,
} from "lucide-react";
import Link from "next/link";

// ─── Share helpers ────────────────────────────────────────────────────────────

function buildShareUrl(code: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/registro?ref=${code}`;
}

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-black" style={{ color }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReferidosPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [referredCount, setReferredCount] = useState(0);
  const [points, setPoints] = useState(0);

  const refresh = useCallback(() => {
    if (!user) return;
    const c = ensureReferralCode(user.id);
    setCode(c);
    setReferredCount(getReferredCount(user.id));
    setPoints(loadPoints(user.id));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!user || user.role !== "cliente") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <Share2 size={40} className="mx-auto mb-3 text-amber-400" />
        <p className="font-semibold text-amber-700">
          El programa de referidos es exclusivo para clientes.
        </p>
      </div>
    );
  }

  const shareUrl = buildShareUrl(code);

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const shareNative = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "TCG Academy — Código de referido",
        text: `Usa mi código ${code} al registrarte en TCG Academy y recibe ventajas exclusivas.`,
        url: shareUrl,
      });
    } else {
      copyUrl();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Share2 size={24} className="text-[#2563eb]" /> Programa de referidos
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Invita a tus amigos y gana puntos cada vez que compren
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Amigos referidos"
          value={referredCount}
          sub="cuentas creadas con tu código"
          color="#2563eb"
        />
        <StatCard
          label="Tus puntos totales"
          value={points.toLocaleString("es-ES")}
          sub="incluyendo bonus por referidos"
          color="#f59e0b"
        />
        <StatCard
          label="Pts/€ de tu amigo"
          value={`${REFERRAL_L1_PER_EURO} pts`}
          sub="por cada euro que gaste tu referido"
          color="#16a34a"
        />
      </div>

      {/* Referral code */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 font-bold text-gray-900">Tu código de referido</h2>
        <p className="mb-4 text-sm text-gray-500">
          Comparte este código con tus amigos. Lo introducen al registrarse.
        </p>

        {/* Code display */}
        <div className="mb-3 flex items-center gap-2">
          <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-[#2563eb] bg-blue-50 py-3">
            <span className="text-2xl font-black tracking-[0.2em] text-[#2563eb]">{code}</span>
          </div>
          <button
            onClick={copyCode}
            aria-label="Copiar código"
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-white transition hover:bg-[#1d4ed8]"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>

        {/* Share URL */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-xs text-gray-500">{shareUrl}</span>
          <button
            onClick={copyUrl}
            aria-label="Copiar enlace"
            className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#2563eb] transition hover:bg-blue-50"
          >
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
        </div>

        {/* Share button */}
        <button
          onClick={shareNative}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] font-bold text-white transition hover:bg-[#1d4ed8]"
        >
          <Share2 size={16} /> Compartir invitación
        </button>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-5 flex items-center gap-2 font-bold text-gray-900">
          <TrendingUp size={18} className="text-[#2563eb]" /> ¿Cómo funciona?
        </h2>

        {/* Steps */}
        <div className="mb-6 space-y-4">
          {[
            {
              step: "1",
              title: "Comparte tu código",
              desc: "Envía tu código o enlace personal a un amigo",
              color: "#2563eb",
            },
            {
              step: "2",
              title: "Tu amigo se registra",
              desc: "Introduce tu código al crear su cuenta en TCG Academy",
              color: "#7c3aed",
            },
            {
              step: "3",
              title: "Tu amigo compra",
              desc: "Cada vez que tu amigo gasta €1, tú recibes puntos automáticamente",
              color: "#16a34a",
            },
            {
              step: "4",
              title: "¡Todos ganan!",
              desc: "Tú, tu amigo y quien te refirió a ti recibís puntos",
              color: "#f59e0b",
            },
          ].map(({ step, title, desc, color }) => (
            <div key={step} className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                style={{ backgroundColor: color }}
              >
                {step}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{title}</p>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Earnings table */}
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-[#2563eb] text-white">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Nivel</th>
                <th className="px-4 py-2.5 text-left font-semibold">Relación</th>
                <th className="px-4 py-2.5 text-right font-semibold">Puntos / €1</th>
                <th className="px-4 py-2.5 text-right font-semibold">Ejemplo (€30)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-700">Tú</td>
                <td className="px-4 py-3 text-gray-600">Comprador directo</td>
                <td className="px-4 py-3 text-right font-bold text-[#2563eb]">
                  {POINTS_PER_EURO} pts
                </td>
                <td className="px-4 py-3 text-right text-gray-700">300 pts</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-green-700">L1 — Tu referidor</td>
                <td className="px-4 py-3 text-gray-600">Quien te invitó a ti</td>
                <td className="px-4 py-3 text-right font-bold text-green-700">
                  +{REFERRAL_L1_PER_EURO} pts
                </td>
                <td className="px-4 py-3 text-right text-gray-700">+300 pts</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3 font-semibold text-amber-700">L2 — Referidor de tu referidor</td>
                <td className="px-4 py-3 text-gray-600">2 niveles de red</td>
                <td className="px-4 py-3 text-right font-bold text-amber-700">
                  +{REFERRAL_L2_PER_EURO} pts
                </td>
                <td className="px-4 py-3 text-right text-gray-700">+150 pts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Earnings breakdown */}
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-green-800">
          <Star size={16} className="text-green-600" /> ¿Cuánto puedo ganar?
        </h2>
        <div className="space-y-2 text-sm text-green-700">
          <p>
            <strong>Ejemplo:</strong> Invitas a 5 amigos que gastan €50 cada uno al mes:
          </p>
          <ul className="ml-4 list-disc space-y-1 text-green-600">
            <li>Tus puntos por sus compras: 5 × 50 × {REFERRAL_L1_PER_EURO} = <strong>2.500 pts/mes</strong></li>
            <li>Equivale a <strong>€2.50</strong> de descuento al mes solo por referidos</li>
            <li>Si tus amigos también refieren a otros, tú recibes +{REFERRAL_L2_PER_EURO} pts por cada euro de esos</li>
          </ul>
          <p className="mt-2 font-semibold">
            Sin límite de referidos ni de puntos acumulados.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-gray-900">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {[
            {
              q: "¿Cuándo recibo los puntos por referido?",
              a: "Inmediatamente después de que tu amigo complete una compra. Los puntos se reflejan en tu saldo al instante.",
            },
            {
              q: "¿Mis amigos también ganan puntos al registrarse con mi código?",
              a: "Sí, siguen el programa normal: 10 pts por €1 gastado, check-in diario y pueden referir a otros también.",
            },
            {
              q: "¿Hay límite de personas que puedo referir?",
              a: "No. Puedes referir a tantas personas como quieras y ganar puntos de todas ellas indefinidamente.",
            },
            {
              q: "¿Los puntos por referidos caducan?",
              a: "Los puntos por referidos se suman a tu saldo general y caducan igual que el resto: 24 meses sin actividad.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-gray-100 p-4">
              <p className="flex items-start gap-2 font-semibold text-gray-800">
                <ChevronRight size={16} className="mt-0.5 flex-shrink-0 text-[#2563eb]" /> {q}
              </p>
              <p className="mt-1.5 pl-6 text-sm text-gray-500">{a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        <Info size={16} className="mt-0.5 flex-shrink-0 text-blue-400" />
        <p>
          El programa de referidos es solo para cuentas personales (rol cliente).
          Los puntos obtenidos por referidos son reales y canjeables desde el{" "}
          <Link href="/cuenta/puntos" className="font-semibold underline">
            panel de puntos
          </Link>{" "}
          o en el carrito de compra.
        </p>
      </div>
    </div>
  );
}
