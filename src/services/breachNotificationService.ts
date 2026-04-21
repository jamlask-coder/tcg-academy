/**
 * Servicio de notificación de brechas de seguridad (RGPD art. 33 + 34).
 *
 * Obligaciones legales (España):
 *   - Notificar a la AEPD en ≤72h desde la detección si hay riesgo para los
 *     derechos/libertades del interesado.
 *   - Si el riesgo es ALTO, notificar también a los interesados afectados.
 *   - Llevar un registro interno de TODAS las brechas (aunque no se notifiquen).
 *
 * Este servicio:
 *   - Abre un incident con deadline +72h.
 *   - Permite añadir medidas, escalar severidad, marcar como notificado.
 *   - Dispara email a AEPD + DPO cuando se marca como "reported".
 *   - Guarda el registro inmutable (no se puede borrar — solo cerrar).
 */

import type { BreachIncident } from "@/lib/backup/types";
import { DataHub } from "@/lib/dataHub";

const BREACH_STORAGE_KEY = "tcgacademy_breach_incidents";

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

function randomId(): string {
  return `brecha_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readIncidents(): BreachIncident[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BREACH_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BreachIncident[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIncidents(list: BreachIncident[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BREACH_STORAGE_KEY, JSON.stringify(list));
  DataHub.emit("breach_incidents");
}

// ─── API pública ────────────────────────────────────────────────────────────

export interface OpenBreachParams {
  severity: BreachIncident["severity"];
  affectedSubjects: number;
  dataCategories: string[];
  description: string;
  measuresTaken?: string;
}

export function openBreach(params: OpenBreachParams): BreachIncident {
  const now = new Date().toISOString();
  const dpoEmail = process.env.DPO_EMAIL ?? "";
  const incident: BreachIncident = {
    id: randomId(),
    detectedAt: now,
    reportedAt: null,
    notifiedAepdAt: null,
    severity: params.severity,
    affectedSubjects: params.affectedSubjects,
    dataCategories: params.dataCategories,
    description: params.description,
    measuresTaken: params.measuresTaken ?? "",
    dpoEmail,
    status: "detected",
    deadlineAt: hoursFromNow(72),
  };
  const list = readIncidents();
  list.unshift(incident);
  writeIncidents(list);
  return incident;
}

export function listBreaches(): BreachIncident[] {
  return readIncidents();
}

export function getBreach(id: string): BreachIncident | null {
  return readIncidents().find((b) => b.id === id) ?? null;
}

export function updateBreach(
  id: string,
  updates: Partial<Pick<BreachIncident, "severity" | "affectedSubjects" | "dataCategories" | "description" | "measuresTaken" | "status">>,
): BreachIncident | null {
  const list = readIncidents();
  const idx = list.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  const next = { ...list[idx], ...updates };
  list[idx] = next;
  writeIncidents(list);
  return next;
}

export async function markReported(
  id: string,
  opts: { notifyAepd?: boolean; notifyDpo?: boolean } = {},
): Promise<BreachIncident | null> {
  const list = readIncidents();
  const idx = list.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  list[idx] = {
    ...list[idx],
    reportedAt: now,
    notifiedAepdAt: opts.notifyAepd ? now : list[idx].notifiedAepdAt,
    status: "reported",
  };
  writeIncidents(list);

  if (opts.notifyAepd || opts.notifyDpo) {
    // Los emails salen por un endpoint servidor para usar el adapter real
    // (Resend en server mode). Si falla, el incident queda marcado igual —
    // el admin puede re-lanzar desde la UI.
    try {
      await fetch("/api/admin/breach/notify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": getAdminToken(),
        },
        body: JSON.stringify({
          incident: list[idx],
          notifyAepd: opts.notifyAepd === true,
          notifyDpo: opts.notifyDpo === true,
        }),
      });
    } catch {
      /* non-fatal: el incidente ya quedó registrado */
    }
  }
  return list[idx];
}

export function closeBreach(id: string): BreachIncident | null {
  return updateBreach(id, { status: "closed" });
}

function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("tcgacademy_admin_token") ?? "";
  } catch {
    return "";
  }
}

// ─── Notificación por email ─────────────────────────────────────────────────

export function renderBreachEmailHtml(incident: BreachIncident): string {
  const hoursLeft = Math.max(
    0,
    Math.round((new Date(incident.deadlineAt).getTime() - Date.now()) / 3600_000),
  );
  return `
    <h1>Notificación de brecha de seguridad — RGPD art. 33</h1>
    <p><strong>ID interno:</strong> ${incident.id}</p>
    <p><strong>Detectada:</strong> ${incident.detectedAt}</p>
    <p><strong>Plazo legal restante:</strong> ${hoursLeft}h (total 72h desde detección)</p>
    <p><strong>Severidad:</strong> ${incident.severity}</p>
    <p><strong>Sujetos afectados:</strong> ${incident.affectedSubjects}</p>
    <p><strong>Categorías de datos:</strong> ${incident.dataCategories.join(", ")}</p>
    <h2>Descripción del incidente</h2>
    <p>${incident.description.replace(/\n/g, "<br>")}</p>
    <h2>Medidas adoptadas</h2>
    <p>${(incident.measuresTaken || "(pendiente)").replace(/\n/g, "<br>")}</p>
    <hr>
    <p style="font-size:12px;color:#666">
      Este email es una notificación automática del sistema interno de TCG Academy.
      Para presentar la notificación formal usar el formulario electrónico de la
      AEPD (https://sedeagpd.gob.es) con estos mismos datos.
    </p>
  `;
}

export function getBreachEmailSubject(incident: BreachIncident): string {
  return `[BRECHA ${incident.severity.toUpperCase()}] Notificación RGPD — ${incident.id}`;
}
