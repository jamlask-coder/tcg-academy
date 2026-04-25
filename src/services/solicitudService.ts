// ── Solicitud Service ─────────────────────────────────────────────────────────
// SSOT canónico para solicitudes B2B / franquicia / vending. Todas las
// escrituras pasan por aquí y disparan `tcga:solicitudes:updated`.

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
  return list[idx];
}

export function getSolicitudById(id: string): Solicitud | undefined {
  return loadSolicitudes().find((s) => s.id === id);
}

export function countNuevasSolicitudes(): number {
  return loadSolicitudes().filter((s) => s.estado === "nueva").length;
}
