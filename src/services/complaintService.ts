// ── Complaint Service ─────────────────────────────────────────────────────────
// SSOT canónico para reclamaciones formales de cliente (hoja de reclamaciones).
// Modo dual: LS canónico en local; en server, LS es cache + replica fire-and-forget
// a `/api/complaints`. Eventos: `tcga:complaints:updated`.

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

function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

// Mapping UI ⇄ DB.
const UI_TO_DB_STATUS: Record<ComplaintStatus, "recibida" | "tramitando" | "resuelta" | "desestimada"> = {
  recibida: "recibida",
  en_estudio: "tramitando",
  resuelta: "resuelta",
  rechazada: "desestimada",
};

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

  if (isServerMode()) {
    void fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claimantName: complaint.nombre,
        claimantEmail: complaint.email,
        orderId: complaint.pedido,
        // El modelo DB exige `facts` y `claim` separados; en la UI actual solo
        // hay `descripcion`. Lo replicamos en ambos para no perder info.
        facts: complaint.descripcion,
        claim: complaint.descripcion,
      }),
    }).catch(() => {});
  }
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

  if (isServerMode()) {
    const dbPatch: Record<string, unknown> = {};
    if (patch.status) dbPatch.status = UI_TO_DB_STATUS[patch.status];
    if (patch.resolution !== undefined) dbPatch.resolution = patch.resolution;
    if (Object.keys(dbPatch).length > 0) {
      void fetch("/api/complaints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...dbPatch }),
      }).catch(() => {});
    }
  }
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
