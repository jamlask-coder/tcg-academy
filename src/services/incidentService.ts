import type { Incident } from "@/types/incident";

const STORAGE_KEY = "tcgacademy_incidents";

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

export function saveIncident(incident: Incident): void {
  const all = loadIncidents();
  const idx = all.findIndex((i) => i.id === incident.id);
  if (idx >= 0) all[idx] = incident;
  else all.unshift(incident);
  saveAll(all);
  try { window.dispatchEvent(new Event("tcga:incidents:updated")); } catch { /* ignore */ }
}

export function updateIncident(id: string, updates: Partial<Incident>): void {
  const all = loadIncidents();
  const idx = all.findIndex((i) => i.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...updates };
  saveAll(all);
  try { window.dispatchEvent(new Event("tcga:incidents:updated")); } catch { /* ignore */ }
}

export function getIncidentsByOrder(orderId: string): Incident[] {
  return loadIncidents().filter((i) => i.orderId === orderId);
}

export function countNewIncidents(): number {
  return loadIncidents().filter((i) => i.status === "nueva").length;
}
