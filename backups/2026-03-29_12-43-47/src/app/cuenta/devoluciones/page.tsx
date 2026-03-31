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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}
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
    <div className="flex items-center gap-0 mt-4">
      {allStatuses.map((status, i) => {
        const step = steps.find((s) => s.status === status);
        const done = !!step;
        const rejected = steps.some((s) => s.status === "rechazada");
        const cfg = STATUS_CONFIG[status];
        const Icon = cfg.icon;
        return (
          <div key={status} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                  done ? cfg.bg : "bg-gray-100"
                }`}
              >
                <Icon
                  size={16}
                  className={done ? cfg.color : "text-gray-300"}
                />
              </div>
              <p
                className={`text-[10px] font-semibold mt-1 text-center whitespace-nowrap ${
                  done ? cfg.color : "text-gray-300"
                }`}
              >
                {cfg.label}
              </p>
            </div>
            {i < allStatuses.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 ${done && !rejected ? cfg.bg : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RequestForm({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    orderId: "",
    reason: "",
    notes: "",
    files: [] as string[],
  });
  const [submitted, setSubmitted] = useState(false);

  const deliveredOrders = MOCK_ORDERS.filter((o) => o.status === "entregado");

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Solicitud enviada
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Hemos recibido tu solicitud de devolución. Te contactaremos en un
          plazo de 24-48 h hábiles.
        </p>
        <button
          onClick={onClose}
          className="bg-[#1a3a5c] text-white font-bold px-6 py-3 rounded-xl text-sm"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                step >= s
                  ? "bg-[#1a3a5c] text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            <div
              className={`text-xs font-medium ${step >= s ? "text-[#1a3a5c]" : "text-gray-400"}`}
            >
              {s === 1 ? "Pedido" : s === 2 ? "Motivo" : "Fotos"}
            </div>
            {s < 3 && (
              <div
                className={`flex-1 h-0.5 mx-1 ${step > s ? "bg-[#1a3a5c]" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 mb-3">
            Selecciona el pedido del que quieres hacer la devolución:
          </p>
          {deliveredOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
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
                className="w-full flex items-center justify-between p-4 border-2 rounded-xl text-left transition hover:border-[#1a3a5c] hover:bg-blue-50/30"
              >
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
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
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Motivo de la devolución *
            </label>
            <select
              value={form.reason}
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
              className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] bg-white"
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
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Descripción detallada
            </label>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={4}
              placeholder="Describe el problema con el mayor detalle posible..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border-2 border-gray-200 font-bold py-3 rounded-xl text-sm hover:bg-gray-50 transition"
            >
              Atrás
            </button>
            <button
              onClick={() => form.reason && setStep(3)}
              disabled={!form.reason}
              className="flex-1 bg-[#1a3a5c] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#15304d] transition disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Adjuntar fotos del problema{" "}
              <span className="text-gray-400 font-normal">
                (opcional pero recomendado)
              </span>
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#1a3a5c] transition cursor-pointer">
              <Upload size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                Haz clic o arrastra las fotos aquí
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG hasta 10MB por archivo
              </p>
              <input type="file" accept="image/*" multiple className="hidden" />
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertCircle
              size={18}
              className="text-amber-500 flex-shrink-0 mt-0.5"
            />
            <p className="text-sm text-amber-700">
              Una vez enviada, revisaremos tu solicitud en 24-48 h hábiles. Te
              notificaremos por email.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 border-2 border-gray-200 font-bold py-3 rounded-xl text-sm hover:bg-gray-50 transition"
            >
              Atrás
            </button>
            <button
              onClick={() => setSubmitted(true)}
              className="flex-1 bg-[#1a3a5c] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#15304d] transition"
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
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw size={22} className="text-[#1a3a5c]" /> Mis Devoluciones
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestiona tus solicitudes de devolución y reembolso
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#1a3a5c] text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#15304d] transition min-h-[44px]"
        >
          <Plus size={16} /> Solicitar devolución
        </button>
      </div>

      {/* Request form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">
                Nueva solicitud de devolución
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            <RequestForm onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {MOCK_RETURNS.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <RefreshCw size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 mb-1">
            No tienes solicitudes de devolución
          </p>
          <p className="text-sm text-gray-400">
            Puedes solicitar la devolución de cualquier pedido entregado en los
            últimos 30 días.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {MOCK_RETURNS.map((ret) => (
            <div
              key={ret.id}
              className="bg-white border border-gray-200 rounded-2xl p-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{ret.id}</span>
                    <StatusBadge status={ret.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Pedido:{" "}
                    <Link
                      href={`/cuenta/pedidos/${ret.orderId}`}
                      className="font-medium text-[#1a3a5c] hover:underline"
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
              <div className="space-y-1 mb-3">
                {ret.items.map((item, i) => (
                  <p key={i} className="text-sm text-gray-600">
                    {item.qty}x {item.name} —{" "}
                    <span className="font-medium">
                      {item.price.toFixed(2)}€
                    </span>
                  </p>
                ))}
              </div>

              <p className="text-sm text-gray-500 italic mb-4">
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
                        className={`font-semibold w-28 flex-shrink-0 ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-gray-500">{step.note}</span>
                      <span className="text-gray-400 text-xs ml-auto whitespace-nowrap flex-shrink-0">
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
