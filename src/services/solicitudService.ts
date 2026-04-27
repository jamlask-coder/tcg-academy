// ── Solicitud Service ─────────────────────────────────────────────────────────
// SSOT canónico para solicitudes B2B / franquicia / vending.
// Modo dual: LS en local; en server, LS es cache + replica fire-and-forget al
// API. Evento: `tcga:solicitudes:updated`.

import { DataHub } from "@/lib/dataHub";

export type TipoSolicitud = "b2b" | "franquicia" | "vending";
export type EstadoSolicitud = "nueva" | "revision" | "aprobada" | "rechazada";

export interface Solicitud {
  id: string;
  tipo: TipoSolicitud;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  datos: Record<string, unknown>;
}

const KEY = "tcgacademy_solicitudes";
const MAX = 2000;

function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

function pickStr(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

export function loadSolicitudes(): Solicitud[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Solicitud[];
  } catch {
    return [];
  }
}

function persist(list: Solicitud[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    DataHub.emit("solicitudes");
  } catch {
    /* non-fatal */
  }
}

/** Reemplaza la lista entera (uso interno + seed). */
export function saveSolicitudes(list: Solicitud[]): void {
  persist(list);
}

/** Crea una nueva solicitud. Devuelve la solicitud creada. */
export function addSolicitud(
  input: Pick<Solicitud, "tipo" | "datos"> &
    Partial<Pick<Solicitud, "id" | "estado" | "fechaSolicitud">>,
): Solicitud {
  const solicitud: Solicitud = {
    id:
      input.id ??
      Date.now().toString(36) + Math.random().toString(36).slice(2),
    tipo: input.tipo,
    estado: input.estado ?? "nueva",
    fechaSolicitud: input.fechaSolicitud ?? new Date().toISOString(),
    datos: input.datos,
  };
  const list = loadSolicitudes();
  list.push(solicitud);
  persist(list);

  if (isServerMode()) {
    // Mapeamos `datos` (form libre) a las columnas concretas del DB.
    const d = solicitud.datos;
    void fetch("/api/solicitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: solicitud.tipo,
        companyName: pickStr(d.companyName) ?? pickStr(d.empresa) ?? "—",
        cif: pickStr(d.cif) ?? pickStr(d.nif),
        contactName: pickStr(d.contactName) ?? pickStr(d.nombre) ?? "—",
        contactEmail: pickStr(d.contactEmail) ?? pickStr(d.email) ?? "",
        contactPhone: pickStr(d.contactPhone) ?? pickStr(d.telefono),
        volume: pickStr(d.volume) ?? pickStr(d.volumen),
        games: Array.isArray(d.games) ? (d.games as string[]) : [],
        message: pickStr(d.message) ?? pickStr(d.mensaje),
      }),
    }).catch(() => {});
  }
  return solicitud;
}

export function updateSolicitudEstado(
  id: string,
  estado: EstadoSolicitud,
): Solicitud | null {
  const list = loadSolicitudes();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], estado };
  persist(list);

  if (isServerMode()) {
    void fetch("/api/solicitudes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: estado }),
    }).catch(() => {});
  }
  return list[idx];
}

export function getSolicitudById(id: string): Solicitud | undefined {
  return loadSolicitudes().find((s) => s.id === id);
}

export function countNuevasSolicitudes(): number {
  return loadSolicitudes().filter((s) => s.estado === "nueva").length;
}
