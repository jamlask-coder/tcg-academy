"use client";
import { useState } from "react";
import {
  Building2,
  Store,
  Package2,
  ChevronDown,
  ChevronUp,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Inbox,
} from "lucide-react";

const SOLICITUDES_KEY = "tcgacademy_solicitudes";

type TipoSolicitud = "b2b" | "franquicia" | "vending";
type EstadoSolicitud = "nueva" | "revision" | "aprobada" | "rechazada";

interface Solicitud {
  id: string;
  tipo: TipoSolicitud;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  datos: Record<string, unknown>;
}

function loadSolicitudes(): Solicitud[] {
  try {
    return JSON.parse(localStorage.getItem(SOLICITUDES_KEY) ?? "[]") as Solicitud[];
  } catch {
    return [];
  }
}

function saveSolicitudes(list: Solicitud[]) {
  localStorage.setItem(SOLICITUDES_KEY, JSON.stringify(list));
}

const TIPO_CONFIG: Record<
  TipoSolicitud,
  { label: string; icon: React.ComponentType<{ size?: number }>; color: string }
> = {
  b2b: { label: "Distribuidor B2B", icon: Building2, color: "#2563eb" },
  franquicia: { label: "Tienda TCG", icon: Store, color: "#0f766e" },
  vending: { label: "Vending TCG", icon: Package2, color: "#7c3aed" },
};

const ESTADO_CONFIG: Record<
  EstadoSolicitud,
  { label: string; color: string; bg: string }
> = {
  nueva: { label: "Nueva", color: "#d97706", bg: "#fef3c7" },
  revision: { label: "En revisión", color: "#1d4ed8", bg: "#dbeafe" },
  aprobada: { label: "Aprobada", color: "#16a34a", bg: "#dcfce7" },
  rechazada: { label: "Rechazada", color: "#dc2626", bg: "#fee2e2" },
};

function getContactEmail(datos: Record<string, unknown>): string {
  return (
    (datos.emailContacto as string) ??
    (datos.email as string) ??
    ""
  );
}

function getContactName(datos: Record<string, unknown>): string {
  return (
    (datos.razonSocial as string) ??
    (datos.nombre as string) ??
    "Sin nombre"
  );
}

function DataRow({ label, value }: { label: string; value: unknown }) {
  if (!value && value !== false && value !== 0) return null;
  const display = Array.isArray(value) ? value.join(", ") : String(value);
  if (!display) return null;
  return (
    <div className="flex gap-3 border-b border-gray-50 py-1.5 last:border-0">
      <span className="w-44 flex-shrink-0 text-xs text-gray-400">{label}</span>
      <span className="flex-1 text-xs text-gray-700">{display}</span>
    </div>
  );
}

function SolicitudRow({
  solicitud,
  onEstadoChange,
}: {
  solicitud: Solicitud;
  onEstadoChange: (id: string, estado: EstadoSolicitud) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tipo = TIPO_CONFIG[solicitud.tipo];
  const estado = ESTADO_CONFIG[solicitud.estado];
  const Icon = tipo.icon;
  const email = getContactEmail(solicitud.datos);
  const name = getContactName(solicitud.datos);
  const date = new Date(solicitud.fechaSolicitud).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Header row */}
      <div className="flex items-center gap-4 p-4">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: tipo.color }}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-400">{date}</p>
        </div>
        <span
          className="flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-bold"
          style={{ backgroundColor: estado.bg, color: estado.color }}
        >
          {estado.label}
        </span>
        <span
          className="hidden flex-shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold text-white sm:block"
          style={{ backgroundColor: tipo.color }}
        >
          {tipo.label}
        </span>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-1">
          {email && (
            <a
              href={`mailto:${email}?subject=Tu solicitud B2B — TCG Academy`}
              title="Contactar por email"
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-[#2563eb]"
            >
              <Mail size={15} />
            </a>
          )}
          {solicitud.estado !== "aprobada" && (
            <button
              onClick={() => onEstadoChange(solicitud.id, "aprobada")}
              title="Aprobar"
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-green-50 hover:text-green-600"
            >
              <CheckCircle2 size={15} />
            </button>
          )}
          {solicitud.estado !== "rechazada" && (
            <button
              onClick={() => onEstadoChange(solicitud.id, "rechazada")}
              title="Rechazar"
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
            >
              <XCircle size={15} />
            </button>
          )}
          {solicitud.estado === "nueva" && (
            <button
              onClick={() => onEstadoChange(solicitud.id, "revision")}
              title="Marcar en revisión"
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
            >
              <Eye size={15} />
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Colapsar" : "Ver detalles"}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-gray-100"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">
              Datos del formulario
            </p>
            <select
              value={solicitud.estado}
              onChange={(e) =>
                onEstadoChange(solicitud.id, e.target.value as EstadoSolicitud)
              }
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold focus:outline-none"
            >
              <option value="nueva">Nueva</option>
              <option value="revision">En revisión</option>
              <option value="aprobada">Aprobada</option>
              <option value="rechazada">Rechazada</option>
            </select>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-2">
            {Object.entries(solicitud.datos).map(([key, value]) => (
              <DataRow
                key={key}
                label={key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (s) => s.toUpperCase())}
                value={value}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>(() =>
    loadSolicitudes(),
  );
  const [filterTipo, setFilterTipo] = useState<TipoSolicitud | "todas">(
    "todas",
  );
  const [filterEstado, setFilterEstado] = useState<EstadoSolicitud | "todas">(
    "todas",
  );

  const handleEstadoChange = (id: string, estado: EstadoSolicitud) => {
    const updated = solicitudes.map((s) =>
      s.id === id ? { ...s, estado } : s,
    );
    setSolicitudes(updated);
    saveSolicitudes(updated);
  };

  const filtered = solicitudes.filter((s) => {
    if (filterTipo !== "todas" && s.tipo !== filterTipo) return false;
    if (filterEstado !== "todas" && s.estado !== filterEstado) return false;
    return true;
  });

  const counts = {
    total: solicitudes.length,
    nuevas: solicitudes.filter((s) => s.estado === "nueva").length,
    revision: solicitudes.filter((s) => s.estado === "revision").length,
    aprobadas: solicitudes.filter((s) => s.estado === "aprobada").length,
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de solicitudes B2B, franquicias y vending
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Total solicitudes",
            value: counts.total,
            icon: Inbox,
            color: "#2563eb",
          },
          {
            label: "Nuevas",
            value: counts.nuevas,
            icon: Clock,
            color: "#d97706",
          },
          {
            label: "En revisión",
            value: counts.revision,
            icon: Eye,
            color: "#1d4ed8",
          },
          {
            label: "Aprobadas",
            value: counts.aprobadas,
            icon: CheckCircle2,
            color: "#16a34a",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon size={16} style={{ color }} />
              <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                {label}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white">
          {(["todas", "b2b", "franquicia", "vending"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterTipo(t)}
              className={`px-4 py-2 text-sm font-medium transition ${
                filterTipo === t
                  ? "bg-[#2563eb] text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t === "todas"
                ? "Todas"
                : TIPO_CONFIG[t as TipoSolicitud].label}
            </button>
          ))}
        </div>
        <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white">
          {(["todas", "nueva", "revision", "aprobada", "rechazada"] as const).map(
            (e) => (
              <button
                key={e}
                onClick={() => setFilterEstado(e)}
                className={`px-3 py-2 text-sm font-medium capitalize transition ${
                  filterEstado === e
                    ? "bg-[#2563eb] text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {e === "todas"
                  ? "Todos los estados"
                  : ESTADO_CONFIG[e as EstadoSolicitud].label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
          <Inbox size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-600">
            {solicitudes.length === 0
              ? "No hay solicitudes todavía"
              : "No hay solicitudes con los filtros seleccionados"}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Las solicitudes aparecen aquí cuando alguien completa un formulario
            B2B, de franquicia o vending.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <SolicitudRow
              key={s.id}
              solicitud={s}
              onEstadoChange={handleEstadoChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
