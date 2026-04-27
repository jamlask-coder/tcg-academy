/**
 * incidentService — SSOT de incidencias de pedido.
 *
 * Modo dual:
 * - **local**: SSOT en `localStorage[STORAGE_KEY]`.
 * - **server**: LS sigue siendo cache (preserva API sync); las escrituras
 *   se replican fire-and-forget a `/api/incidents`. La hidratación inicial
 *   ocurre cuando el componente que las muestra llama a `hydrateIncidents()`.
 */

import type { Incident, IncidentStatus } from "@/types/incident";
import type { IncidentRecord } from "@/lib/db";
import { getOrdersByUser } from "@/lib/orderAdapter";
import { DataHub } from "@/lib/dataHub";

const STORAGE_KEY = "tcgacademy_incidents";

function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

export function loadIncidents(): Incident[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? (JSON.parse(raw) as Incident[]) : [];
  } catch {
    return [];
  }
}

function saveAll(incidents: Incident[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
  } catch { /* ignore */ }
}

// Mappings UI Incident ⇄ DB IncidentRecord (status enum distinto).
const UI_TO_DB_STATUS: Record<IncidentStatus, IncidentRecord["status"]> = {
  nueva: "abierta",
  en_gestion: "en_revision",
  resuelta: "resuelta",
};
const DB_TO_UI_STATUS: Record<IncidentRecord["status"], IncidentStatus> = {
  abierta: "nueva",
  en_revision: "en_gestion",
  resuelta: "resuelta",
  cerrada: "resuelta",
};

function recordToIncident(r: IncidentRecord): Incident {
  return {
    id: r.id,
    orderId: r.orderId,
    userId: r.userId ?? "",
    userEmail: "",
    userName: "",
    type: r.category,
    typeLabel: r.title,
    detail: r.body,
    photos: [],
    status: DB_TO_UI_STATUS[r.status] ?? "nueva",
    createdAt: r.createdAt,
    reply: r.adminNote,
    repliedAt: r.adminNote ? r.updatedAt : undefined,
  };
}

export function saveIncident(incident: Incident): void {
  const all = loadIncidents();
  const idx = all.findIndex((i) => i.id === incident.id);
  if (idx >= 0) all[idx] = incident;
  else all.unshift(incident);
  saveAll(all);
  DataHub.emit("incidents");

  if (isServerMode() && idx < 0) {
    // Solo replicamos creaciones nuevas (idx<0). Los updates van por updateIncident.
    void fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: incident.orderId,
        category: incident.type,
        title: incident.typeLabel,
        body: incident.detail,
        status: UI_TO_DB_STATUS[incident.status] ?? "abierta",
      }),
    }).catch(() => {});
  }
}

export function updateIncident(id: string, updates: Partial<Incident>): void {
  const all = loadIncidents();
  const idx = all.findIndex((i) => i.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...updates };
  saveAll(all);
  DataHub.emit("incidents");

  if (isServerMode()) {
    const patch: Partial<IncidentRecord> = {};
    if (updates.status) patch.status = UI_TO_DB_STATUS[updates.status] ?? undefined;
    if (updates.reply !== undefined) patch.adminNote = updates.reply;
    if (Object.keys(patch).length > 0) {
      void fetch("/api/incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      }).catch(() => {});
    }
  }
}

export function getIncidentsByOrder(orderId: string): Incident[] {
  return loadIncidents().filter((i) => i.orderId === orderId);
}

/**
 * Helper canónico "Vista 360°": todas las incidencias asociadas a pedidos
 * de un usuario (resuelto vía FK orderId → Order.userId).
 */
export function getIncidentsByUser(userId: string): Incident[] {
  const orderIds = new Set(getOrdersByUser(userId).map((o) => o.id));
  return loadIncidents().filter((i) => orderIds.has(i.orderId));
}

export function countNewIncidents(): number {
  return loadIncidents().filter((i) => i.status === "nueva").length;
}

/**
 * Hidrata desde el servidor en server mode. Mergea con LS por id (server gana).
 */
export async function hydrateIncidents(opts?: { userId?: string; orderId?: string }): Promise<void> {
  if (!isServerMode() || typeof window === "undefined") return;
  try {
    const params = new URLSearchParams();
    if (opts?.userId) params.set("userId", opts.userId);
    if (opts?.orderId) params.set("orderId", opts.orderId);
    const qs = params.toString();
    const res = await fetch(`/api/incidents${qs ? `?${qs}` : ""}`, { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { incidents?: IncidentRecord[] };
    const fromServer = (json.incidents ?? []).map(recordToIncident);
    const existing = loadIncidents();
    const byId = new Map<string, Incident>();
    for (const i of existing) byId.set(i.id, i);
    for (const i of fromServer) byId.set(i.id, i);
    saveAll([...byId.values()]);
    DataHub.emit("incidents");
  } catch {
    /* offline — LS sigue siendo válido */
  }
}
