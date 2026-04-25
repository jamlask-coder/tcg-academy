// ── Complaint Service ─────────────────────────────────────────────────────────
// SSOT canónico para reclamaciones formales de cliente (hoja de reclamaciones).
// Todas las escrituras pasan por aquí y disparan `tcga:complaints:updated`.

import { DataHub } from "@/lib/dataHub";

export type ComplaintStatus = "recibida" | "en_estudio" | "resuelta" | "rechazada";

export type ComplaintTipo =
  | "producto_defectuoso"
  | "error_envio"
  | "retraso_entrega"
  | "cobro_incorrecto"
  | "atencion_cliente"
  | "proteccion_datos"
  | "otro";

export interface Complaint {
  id: string;
  nombre: string;
  email: string;
  pedido?: string;
  tipo: ComplaintTipo | string;
  descripcion: string;
  status: ComplaintStatus;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

const KEY = "tcgacademy_complaints";
const MAX = 1000;

export function loadComplaints(): Complaint[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Complaint[];
  } catch {
    return [];
  }
}

function persist(list: Complaint[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    DataHub.emit("complaints");
  } catch {
    /* non-fatal */
  }
}

/** Añade una reclamación. Devuelve la reclamación creada. */
export function addComplaint(
  input: Omit<Complaint, "id" | "status" | "createdAt"> &
    Partial<Pick<Complaint, "id" | "status" | "createdAt">>,
): Complaint {
  const complaint: Complaint = {
    id: input.id ?? `REC-${Date.now()}`,
    nombre: input.nombre,
    email: input.email,
    pedido: input.pedido,
    tipo: input.tipo,
    descripcion: input.descripcion,
    status: input.status ?? "recibida",
    createdAt: input.createdAt ?? new Date().toISOString(),
    resolvedAt: input.resolvedAt,
    resolution: input.resolution,
  };
  const list = loadComplaints();
  list.unshift(complaint);
  persist(list);
  return complaint;
}

export function updateComplaint(
  id: string,
  patch: Partial<Omit<Complaint, "id" | "createdAt">>,
): Complaint | null {
  const list = loadComplaints();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch };
  persist(list);
  return list[idx];
}

export function getComplaintById(id: string): Complaint | undefined {
  return loadComplaints().find((c) => c.id === id);
}

export function countOpenComplaints(): number {
  return loadComplaints().filter(
    (c) => c.status === "recibida" || c.status === "en_estudio",
  ).length;
}
