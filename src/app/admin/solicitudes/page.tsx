"use client";
import { useState, useCallback } from "react";
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
  FileText,
  Shield,
  ShieldAlert,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  loadSolicitudes as loadSolicitudesSvc,
  saveSolicitudes as saveSolicitudesSvc,
  type Solicitud,
  type TipoSolicitud,
  type EstadoSolicitud,
} from "@/services/solicitudService";

const SEED_SOLICITUD: Solicitud = {
  id: "demo-b2b-001",
  tipo: "b2b",
  estado: "nueva",
  fechaSolicitud: new Date().toISOString(),
  datos: {
    razonSocial: "Distribuciones García López S.L.",
    cif: "B87654321",
    cnae: "4764",
    tipoEmpresa: "SL",
    web: "https://www.garcialopez-tcg.es",
    tiendaFisica: "si",
    direccionTiendaFisica: "Calle Gran Vía 45, 28013 Madrid",
    ventaOnline: "si",
    urlTiendaOnline: "https://tienda.garcialopez-tcg.es",
    juegosTCG: ["Pokémon", "Magic: The Gathering", "One Piece"],
    volumenMensual: "5000-10000",
    comoConociste: "instagram",
    calle: "Calle Gran Vía",
    numero: "45",
    piso: "3B",
    cp: "28013",
    ciudad: "Madrid",
    provincia: "Madrid",
    pais: "España",
    recargoEquivalencia: "no",
    nifRepresentante: "12345678A",
    nombreRepresentante: "Carlos García López",
    emailFacturacion: "facturas@garcialopez-tcg.es",
    personaContacto: "Carlos García López",
    telefono: "+34 612 345 678",
    emailContacto: "carlos@garcialopez-tcg.es",
    documentos: {
      modelo036: { name: "modelo036_garcia.pdf", type: "application/pdf" },
      cif: { name: "cif_empresa.jpg", type: "image/jpeg" },
      dni: { name: "dni_carlos_garcia.pdf", type: "application/pdf" },
    },
    aceptaTerminos: true,
    aceptaPrivacidad: true,
    aceptaComunicaciones: true,
  },
};

function loadSolicitudes(): Solicitud[] {
  const list = loadSolicitudesSvc();
  if (list.length === 0) {
    // Seed con solicitud demo si no hay ninguna
    const seeded = [SEED_SOLICITUD];
    saveSolicitudesSvc(seeded);
    return seeded;
  }
  return list;
}

function saveSolicitudes(list: Solicitud[]) {
  saveSolicitudesSvc(list);
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
  return (datos.emailContacto as string) ?? (datos.email as string) ?? "";
}

function getContactName(datos: Record<string, unknown>): string {
  return (
    (datos.razonSocial as string) ?? (datos.nombre as string) ?? "Sin nombre"
  );
}

const FIELD_LABELS: Record<string, string> = {
  razonSocial: "Razón social",
  cif: "CIF",
  cnae: "CNAE",
  tipoEmpresa: "Tipo de empresa",
  web: "Web de la empresa",
  tiendaFisica: "¿Tienda física?",
  direccionTiendaFisica: "Dirección tienda física",
  ventaOnline: "¿Venta online?",
  urlTiendaOnline: "URL tienda online",
  juegosTCG: "Juegos TCG de interés",
  volumenMensual: "Volumen mensual estimado",
  comoConociste: "¿Cómo nos conoció?",
  calle: "Calle",
  numero: "Número",
  piso: "Piso / Puerta",
  cp: "Código postal",
  ciudad: "Ciudad",
  provincia: "Provincia",
  pais: "País",
  recargoEquivalencia: "Recargo de equivalencia",
  nifRepresentante: "NIF representante",
  nombreRepresentante: "Nombre representante",
  emailFacturacion: "Email de facturación",
  personaContacto: "Persona de contacto",
  telefono: "Teléfono",
  emailContacto: "Email de contacto",
  aceptaTerminos: "Acepta términos",
  aceptaPrivacidad: "Acepta privacidad",
  aceptaComunicaciones: "Acepta comunicaciones",
};

interface DocumentFile {
  name: string;
  type: string;
  data?: string;
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateDocument(file: DocumentFile): { valid: boolean; error?: string } {
  if (!file.name || !file.type) {
    return { valid: false, error: "Documento sin nombre o tipo" };
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: `Tipo no permitido: ${file.type}` };
  }
  if (!file.data) {
    return { valid: false, error: "Sin datos adjuntos" };
  }
  const prefix = `data:${file.type};base64,`;
  if (!file.data.startsWith(prefix)) {
    return { valid: false, error: "Formato de datos inválido" };
  }
  const base64Part = file.data.slice(prefix.length);
  if (!/^[A-Za-z0-9+/=]+$/.test(base64Part)) {
    return { valid: false, error: "Datos base64 corruptos o manipulados" };
  }
  const estimatedSize = (base64Part.length * 3) / 4;
  if (estimatedSize > MAX_DOC_SIZE_BYTES) {
    return { valid: false, error: "Archivo demasiado grande" };
  }
  if (file.type === "application/pdf") {
    try {
      const raw = atob(base64Part.slice(0, 20));
      if (!raw.startsWith("%PDF")) {
        return { valid: false, error: "El archivo no es un PDF válido" };
      }
    } catch {
      return { valid: false, error: "Error al verificar cabecera PDF" };
    }
  }
  return { valid: true };
}

function SecureDocViewer({
  file,
  label,
  onClose,
}: {
  file: DocumentFile;
  label: string;
  onClose: () => void;
}) {
  const validation = validateDocument(file);

  if (!validation.valid) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center gap-3 text-red-600">
            <ShieldAlert size={24} />
            <h3 className="text-lg font-bold">Documento bloqueado</h3>
          </div>
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <p className="mb-1 font-semibold">Problema de seguridad detectado</p>
            <p>{validation.error}</p>
          </div>
          <p className="mb-4 text-xs text-gray-500">
            Este documento no ha pasado la validación de seguridad y no puede
            visualizarse. Contacta con el solicitante para que lo envíe de nuevo.
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const isImage = file.type.startsWith("image/");

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black/80 backdrop-blur-sm">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-gray-900 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <Shield size={16} className="text-green-400" />
          <span className="text-sm font-semibold">{label}</span>
          <span className="rounded bg-gray-700 px-2 py-0.5 text-[10px] font-bold text-gray-300">
            {file.type.split("/")[1]?.toUpperCase()} — Solo lectura
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-lg bg-green-900/40 px-2 py-1 text-[10px] font-bold text-green-400">
            <Shield size={10} /> Verificado
          </span>
          <button
            onClick={onClose}
            aria-label="Cerrar visor"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-gray-700"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {isImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={file.data}
            alt={label}
            className="max-h-full max-w-full rounded-lg shadow-2xl"
            style={{ userSelect: "none", pointerEvents: "none" }}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          <iframe
            src={file.data}
            title={label}
            className="h-full w-full rounded-lg bg-white"
            sandbox=""
            style={{ border: "none" }}
          />
        )}
      </div>

      {/* Security footer */}
      <div className="flex items-center justify-center gap-2 bg-gray-900 px-4 py-2 text-[10px] text-gray-500">
        <Shield size={10} />
        Visor seguro — Sandbox aislado, sin scripts, sin descargas, sin acceso a datos de la web
      </div>
    </div>
  );
}

const COMPANY_FIELDS = [
  "razonSocial", "cif", "cnae", "tipoEmpresa",
  "calle", "numero", "piso", "cp", "ciudad", "provincia", "pais",
  "recargoEquivalencia", "nifRepresentante", "nombreRepresentante",
  "emailFacturacion", "personaContacto", "telefono", "emailContacto",
  "web", "tiendaFisica", "direccionTiendaFisica", "ventaOnline", "urlTiendaOnline",
  "juegosTCG", "volumenMensual", "comoConociste",
];

function CompanyFicha({
  datos,
  open,
  onToggle,
}: {
  datos: Record<string, unknown>;
  open: boolean;
  onToggle: () => void;
}) {
  const name = (datos.razonSocial as string) ?? "Sin nombre";

  return (
    <div>
      <button
        onClick={onToggle}
        className="group flex items-center gap-1.5 text-left"
        title="Ver ficha de empresa"
      >
        <span className="truncate font-semibold text-gray-900 underline decoration-gray-300 decoration-dotted underline-offset-4 transition group-hover:text-[#2563eb] group-hover:decoration-[#2563eb]">
          {name}
        </span>
        {open ? (
          <ChevronUp size={14} className="flex-shrink-0 text-gray-400 transition group-hover:text-[#2563eb]" />
        ) : (
          <ChevronDown size={14} className="flex-shrink-0 text-gray-400 transition group-hover:text-[#2563eb]" />
        )}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="mb-2 text-[11px] font-bold tracking-widest text-blue-600 uppercase">
            Ficha de empresa
          </p>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-2">
            {COMPANY_FIELDS.map((key) => {
              const value = datos[key];
              if (!value && value !== false && value !== 0) return null;
              return <DataRow key={key} label={key} value={value} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: unknown }) {
  if (!value && value !== false && value !== 0) return null;
  if (label === "documentos") return null; // rendered separately
  const display = Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? (value ? "Sí" : "No") : String(value);
  if (!display) return null;
  const prettyLabel = FIELD_LABELS[label] ?? label.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
  return (
    <div className="flex gap-3 border-b border-gray-50 py-1.5 last:border-0">
      <span className="w-44 flex-shrink-0 text-xs font-medium text-gray-400">{prettyLabel}</span>
      <span className="flex-1 text-xs text-gray-700">{display}</span>
    </div>
  );
}

const DOC_LABELS: Record<string, string> = {
  modelo036: "Modelo 036/037",
  cif: "CIF empresa",
  dni: "DNI representante",
};

function DocRow({
  docs,
  onViewDoc,
}: {
  docs: Record<string, DocumentFile | null>;
  onViewDoc: (file: DocumentFile, label: string) => void;
}) {
  const entries = Object.entries(docs).filter(([, v]) => v !== null);
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
      <p className="mb-2 text-[11px] font-bold tracking-widest text-blue-600 uppercase">
        Documentación adjunta
      </p>
      <div className="space-y-1.5">
        {entries.map(([key, file]) => {
          const f = file as DocumentFile;
          const label = DOC_LABELS[key] ?? key;
          const hasData = Boolean(f.data);
          const validation = hasData ? validateDocument(f) : { valid: false };

          return (
            <button
              key={key}
              onClick={() => onViewDoc(f, label)}
              disabled={!hasData}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${
                hasData
                  ? "cursor-pointer bg-white hover:bg-blue-100 hover:shadow-sm"
                  : "cursor-not-allowed opacity-50"
              }`}
              title={hasData ? `Visualizar ${label}` : "Sin datos — documento de demostración"}
            >
              <FileText size={14} className="flex-shrink-0 text-blue-600" />
              <span className="flex-1">
                <span className="font-medium text-blue-700">{label}</span>
                <span className="ml-2 text-blue-500">{f.name}</span>
              </span>
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-500">
                {f.type.split("/")[1]?.toUpperCase() ?? "ARCHIVO"}
              </span>
              {hasData && (
                <span
                  className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    validation.valid
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {validation.valid ? (
                    <><Shield size={8} /> Seguro</>
                  ) : (
                    <><AlertTriangle size={8} /> Revisar</>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SolicitudRow({
  solicitud,
  onEstadoChange,
  onViewDoc,
}: {
  solicitud: Solicitud;
  onEstadoChange: (id: string, estado: EstadoSolicitud) => void;
  onViewDoc: (file: DocumentFile, label: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fichaOpen, setFichaOpen] = useState(false);
  const tipo = TIPO_CONFIG[solicitud.tipo];
  const estado = ESTADO_CONFIG[solicitud.estado];
  const Icon = tipo.icon;
  const email = getContactEmail(solicitud.datos);
  const date = new Date(solicitud.fechaSolicitud).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasDocs =
    typeof solicitud.datos.documentos === "object" &&
    solicitud.datos.documentos !== null;

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
          <CompanyFicha
            datos={solicitud.datos}
            open={fichaOpen}
            onToggle={() => setFichaOpen(!fichaOpen)}
          />
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
              <DataRow key={key} label={key} value={value} />
            ))}
          </div>
          {hasDocs && (
            <DocRow
              docs={solicitud.datos.documentos as Record<string, DocumentFile | null>}
              onViewDoc={onViewDoc}
            />
          )}
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
  const [viewingDoc, setViewingDoc] = useState<{
    file: DocumentFile;
    label: string;
  } | null>(null);
  const [confirmApproval, setConfirmApproval] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  const handleEstadoChange = (id: string, estado: EstadoSolicitud) => {
    if (estado === "aprobada") {
      const sol = solicitudes.find((s) => s.id === id);
      if (sol) {
        setConfirmApproval({
          id,
          name: getContactName(sol.datos),
          email: getContactEmail(sol.datos),
        });
      }
      return;
    }
    const updated = solicitudes.map((s) =>
      s.id === id ? { ...s, estado } : s,
    );
    setSolicitudes(updated);
    saveSolicitudes(updated);
  };

  const handleConfirmApproval = () => {
    if (!confirmApproval) return;
    const updated = solicitudes.map((s) =>
      s.id === confirmApproval.id ? { ...s, estado: "aprobada" as EstadoSolicitud } : s,
    );
    setSolicitudes(updated);
    saveSolicitudes(updated);
    setConfirmApproval(null);
  };

  const handleViewDoc = useCallback((file: DocumentFile, label: string) => {
    setViewingDoc({ file, label });
  }, []);

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
          { label: "Total solicitudes", value: counts.total, icon: Inbox },
          { label: "Nuevas", value: counts.nuevas, icon: Clock },
          { label: "En revisión", value: counts.revision, icon: Eye },
          { label: "Aprobadas", value: counts.aprobadas, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="relative rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon size={16} className="text-gray-400" />
              <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                {label}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {value > 0 && (
              <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white">
                {value}
              </span>
            )}
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
              {t === "todas" ? "Todas" : TIPO_CONFIG[t as TipoSolicitud].label}
            </button>
          ))}
        </div>
        <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white">
          {(
            ["todas", "nueva", "revision", "aprobada", "rechazada"] as const
          ).map((e) => (
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
          ))}
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
              onViewDoc={handleViewDoc}
            />
          ))}
        </div>
      )}

      {/* Approval confirmation modal */}
      {confirmApproval && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <Mail size={20} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Confirmar aprobación</h3>
                <p className="text-xs text-gray-500">Solicitud B2B</p>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-800">
              <p className="mb-2">
                Se va a <strong>aprobar</strong> la solicitud de:
              </p>
              <p className="font-bold">{confirmApproval.name}</p>
              {confirmApproval.email && (
                <p className="mt-1 text-xs text-green-600">
                  Se enviará un email confirmatorio a: <strong>{confirmApproval.email}</strong>
                </p>
              )}
            </div>

            <p className="mb-5 text-xs text-gray-500">
              El solicitante recibirá un correo electrónico notificándole que su
              solicitud ha sido aprobada y los próximos pasos para activar su
              cuenta de distribuidor.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmApproval(null)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmApproval}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-700"
              >
                <CheckCircle2 size={15} />
                Aprobar y enviar email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secure document viewer overlay */}
      {viewingDoc && (
        <SecureDocViewer
          file={viewingDoc.file}
          label={viewingDoc.label}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
}
