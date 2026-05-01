"use client";
import { useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
  Upload,
  X,
} from "lucide-react";
import {
  MOCK_RETURNS,
  MOCK_ORDERS,
  type ReturnRequest,
  type ReturnStatus,
} from "@/data/mockData";
import { AccountTabs } from "@/components/cuenta/AccountTabs";
import { useAuth } from "@/context/AuthContext";

const STATUS_CONFIG: Record<
  ReturnStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  solicitada: {
    label: "Solicitada",
    color: "text-blue-600",
    bg: "bg-blue-100",
    icon: Clock,
  },
  en_revision: {
    label: "En revisión",
    color: "text-amber-600",
    bg: "bg-amber-100",
    icon: Search,
  },
  aceptada: {
    label: "Aceptada",
    color: "text-green-600",
    bg: "bg-green-100",
    icon: CheckCircle,
  },
  reembolsada: {
    label: "Reembolsada",
    color: "text-purple-600",
    bg: "bg-purple-100",
    icon: CheckCircle,
  },
  rechazada: {
    label: "Rechazada",
    color: "text-red-600",
    bg: "bg-red-100",
    icon: XCircle,
  },
};

const RETURN_REASONS = [
  "Producto dañado",
  "Producto incorrecto",
  "No coincide con la descripción",
  "Llegó tarde",
  "No me gusta / cambio de opinión",
  "Otro",
];

function StatusBadge({ status }: { status: ReturnStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cfg.bg} ${cfg.color}`}
    >
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

function Timeline({ steps }: { steps: ReturnRequest["timeline"] }) {
  const allStatuses: ReturnStatus[] = [
    "solicitada",
    "en_revision",
    "aceptada",
    "reembolsada",
  ];
  return (
    <div className="mt-4 flex items-center gap-0">
      {allStatuses.map((status, i) => {
        const step = steps.find((s) => s.status === status);
        const done = !!step;
        const rejected = steps.some((s) => s.status === "rechazada");
        const cfg = STATUS_CONFIG[status];
        const Icon = cfg.icon;
        return (
          <div key={status} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={`z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                  done ? cfg.bg : "bg-gray-100"
                }`}
              >
                <Icon
                  size={16}
                  className={done ? cfg.color : "text-gray-300"}
                />
              </div>
              <p
                className={`mt-1 text-center text-[10px] font-semibold whitespace-nowrap ${
                  done ? cfg.color : "text-gray-300"
                }`}
              >
                {cfg.label}
              </p>
            </div>
            {i < allStatuses.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 ${done && !rejected ? cfg.bg : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RequestForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    orderId: "",
    reason: "",
    notes: "",
    files: [] as string[],
  });
  const [submitted, setSubmitted] = useState(false);

  // Bug 2026-04-30: antes mostraba MOCK_ORDERS sin filtrar a cualquier usuario,
  // permitiendo seleccionar pedidos demo para "devolver". Ahora se filtra por
  // user.id (real → tcgacademy_orders del propio cliente; demo → MOCK).
  // Migración 2026-04-20: "entregado" se eliminó del set customer; pedidos
  // enviados (estado final del flujo) son elegibles para devolución.
  const deliveredOrders = (() => {
    if (!user) return [];
    const isDemoUser = user.id?.startsWith("demo-") ?? false;
    try {
      const raw = typeof window !== "undefined"
        ? localStorage.getItem("tcgacademy_orders")
        : null;
      const real = raw
        ? (JSON.parse(raw) as typeof MOCK_ORDERS).filter(
            (o) => o.userId === user.id && o.status === "enviado",
          )
        : [];
      const seed = isDemoUser
        ? MOCK_ORDERS.filter((o) => o.status === "enviado")
        : [];
      return [...real, ...seed];
    } catch {
      return isDemoUser
        ? MOCK_ORDERS.filter((o) => o.status === "enviado")
        : [];
    }
  })();

  if (submitted) {
    return (
      <div className="py-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h3 className="mb-2 text-lg font-bold text-gray-900">
          Solicitud enviada
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          Hemos registrado tu solicitud de devolución. Te contactaremos en un
          plazo de 24-48 h hábiles.
        </p>
        <button
          onClick={onClose}
          className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step >= s
                  ? "bg-[#2563eb] text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            <div
              className={`text-xs font-medium ${step >= s ? "text-[#2563eb]" : "text-gray-400"}`}
            >
              {s === 1 ? "Pedido" : s === 2 ? "Motivo" : "Fotos"}
            </div>
            {s < 3 && (
              <div
                className={`mx-1 h-0.5 flex-1 ${step > s ? "bg-[#2563eb]" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <p className="mb-3 text-sm text-gray-600">
            Selecciona el pedido del que quieres hacer la devolución:
          </p>
          {deliveredOrders.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No tienes pedidos entregados para devolver.
            </p>
          ) : (
            deliveredOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => {
                  setForm((f) => ({ ...f, orderId: order.id }));
                  setStep(2);
                }}
                className="flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition hover:border-[#2563eb] hover:bg-blue-50/30"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {order.id}
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.date} · {order.total.toFixed(2)}€
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            ))
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Motivo de la devolución *
            </label>
            <select
              value={form.reason}
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
              className="h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 text-sm focus:border-[#2563eb] focus:outline-none"
            >
              <option value="">Selecciona un motivo...</option>
              {RETURN_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Descripción detallada
            </label>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={4}
              placeholder="Describe el problema con el mayor detalle posible..."
              className="w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-[#2563eb] focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold transition hover:bg-gray-50"
            >
              Atrás
            </button>
            <button
              onClick={() => form.reason && setStep(3)}
              disabled={!form.reason}
              className="flex-1 rounded-xl bg-[#2563eb] py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Adjuntar fotos del problema{" "}
              <span className="font-normal text-gray-400">
                (opcional pero recomendado)
              </span>
            </label>
            <div className="cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-8 text-center transition hover:border-[#2563eb]">
              <Upload size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">
                Haz clic o arrastra las fotos aquí
              </p>
              <p className="mt-1 text-xs text-gray-400">
                PNG, JPG hasta 10MB por archivo
              </p>
              <input type="file" accept="image/*" multiple className="hidden" />
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertCircle
              size={18}
              className="mt-0.5 flex-shrink-0 text-amber-500"
            />
            <p className="text-sm text-amber-700">
              Una vez enviada, revisaremos tu solicitud en 24-48 h hábiles. Te
              notificaremos por email.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold transition hover:bg-gray-50"
            >
              Atrás
            </button>
            <button
              onClick={() => setSubmitted(true)}
              className="flex-1 rounded-xl bg-[#2563eb] py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
            >
              Enviar solicitud
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DevolucionesPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);

  // Bug 2026-04-30: antes listaba MOCK_RETURNS a cualquier usuario.
  // Solo demos los ven; el resto (cliente real recién logueado con Google) ve
  // empty state hasta que tenga devoluciones reales suyas.
  const isDemoUser = user?.id?.startsWith("demo-") ?? false;
  const visibleReturns = isDemoUser ? MOCK_RETURNS : [];

  return (
    <div>
      <AccountTabs group="pedidos" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Gestiona tus solicitudes de devolución y reembolso
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
        >
          <Plus size={16} /> Solicitar devolución
        </button>
      </div>

      {/* Request form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Nueva solicitud de devolución
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <RequestForm onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {visibleReturns.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <RefreshCw size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="mb-1 text-gray-500">
            No tienes solicitudes de devolución
          </p>
          <p className="text-sm text-gray-400">
            Puedes solicitar la devolución de cualquier pedido entregado en los
            últimos 30 días.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleReturns.map((ret) => (
            <div
              key={ret.id}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              {/* Header */}
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-gray-900">{ret.id}</span>
                    <StatusBadge status={ret.status} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Pedido:{" "}
                    <Link
                      href={`/cuenta/pedidos/${ret.orderId}`}
                      className="font-medium text-[#2563eb] hover:underline"
                    >
                      {ret.orderId}
                    </Link>
                    {" · "}Solicitado el {ret.date}
                  </p>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {ret.refundAmount.toFixed(2)}€
                </span>
              </div>

              {/* Items */}
              <div className="mb-3 space-y-1">
                {ret.items.map((item, i) => (
                  <p key={i} className="text-sm text-gray-600">
                    {item.qty}x {item.name} —{" "}
                    <span className="font-medium">
                      {item.price.toFixed(2)}€
                    </span>
                  </p>
                ))}
              </div>

              <p className="mb-4 text-sm text-gray-500 italic">
                &ldquo;{ret.notes}&rdquo;
              </p>

              {/* Timeline */}
              <Timeline steps={ret.timeline} />

              {/* Timeline details */}
              <div className="mt-4 space-y-1.5">
                {ret.timeline.map((step, i) => {
                  const cfg = STATUS_CONFIG[step.status];
                  return (
                    <div key={i} className="flex gap-3 text-sm">
                      <span
                        className={`w-28 flex-shrink-0 font-semibold ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-gray-500">{step.note}</span>
                      <span className="ml-auto flex-shrink-0 text-xs whitespace-nowrap text-gray-400">
                        {step.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
