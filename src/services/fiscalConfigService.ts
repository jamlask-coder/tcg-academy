/**
 * Fiscal Config Service — SSOT para datos de configuración fiscal de la empresa.
 *
 * Único punto de escritura para `tcgacademy_fiscal_config`. Después de cada
 * write emite `tcga:fiscal_config:updated` por DataHub para que los borradores
 * de modelos fiscales se regeneren.
 */

import { safeRead, safeWrite } from "@/lib/safeStorage";
import { DataHub } from "@/lib/dataHub";
import {
  type FiscalConfig,
  type RentalAgreement,
  type DividendDistribution,
  type RelatedPartyOperation,
  type ForeignAsset,
  type PendingFiscalTask,
  DEFAULT_FISCAL_CONFIG,
} from "@/types/fiscalConfig";

const KEY = "tcgacademy_fiscal_config";

// ─── Read / write atómicos ───────────────────────────────────────────────────

/** IDs de tareas obsoletas que deben eliminarse al cargar config */
const OBSOLETE_TASK_IDS = new Set<string>([
  "seed_t1_2026_status", // 303 T1 + 202 1P 2026: no aplican sin actividad efectiva
]);

export function loadFiscalConfig(): FiscalConfig {
  const stored = safeRead<FiscalConfig | null>(KEY, null);
  if (!stored) return DEFAULT_FISCAL_CONFIG;
  const cleanedTasks = (stored.pendingTasks ?? []).filter(
    (t) => !OBSOLETE_TASK_IDS.has(t.id),
  );
  // Merge para que defaults de campos nuevos se respeten
  return {
    ...DEFAULT_FISCAL_CONFIG,
    ...stored,
    company: { ...DEFAULT_FISCAL_CONFIG.company, ...(stored.company ?? {}) },
    modelo202: { ...DEFAULT_FISCAL_CONFIG.modelo202, ...(stored.modelo202 ?? {}) },
    oss: { ...DEFAULT_FISCAL_CONFIG.oss, ...(stored.oss ?? {}) },
    intrastat: { ...DEFAULT_FISCAL_CONFIG.intrastat, ...(stored.intrastat ?? {}) },
    rentals: stored.rentals ?? [],
    dividends: stored.dividends ?? [],
    relatedParties: stored.relatedParties ?? [],
    foreignAssets: stored.foreignAssets ?? [],
    pendingTasks: cleanedTasks,
    seeded: stored.seeded ?? false,
  };
}

export function saveFiscalConfig(cfg: FiscalConfig): boolean {
  const next = { ...cfg, updatedAt: new Date().toISOString() };
  const ok = safeWrite(KEY, next);
  if (ok) DataHub.emit("fiscal_config");
  return ok;
}

// ─── Helpers de actualización parcial (opcional, evitan races) ──────────────

export function updateCompanyData(
  patch: Partial<FiscalConfig["company"]>,
): boolean {
  const cfg = loadFiscalConfig();
  return saveFiscalConfig({ ...cfg, company: { ...cfg.company, ...patch } });
}

export function upsertRental(rental: RentalAgreement): boolean {
  const cfg = loadFiscalConfig();
  const idx = cfg.rentals.findIndex((r) => r.id === rental.id);
  const rentals = [...cfg.rentals];
  if (idx >= 0) rentals[idx] = rental;
  else rentals.push(rental);
  return saveFiscalConfig({ ...cfg, rentals });
}

export function deleteRental(id: string): boolean {
  const cfg = loadFiscalConfig();
  return saveFiscalConfig({ ...cfg, rentals: cfg.rentals.filter((r) => r.id !== id) });
}

export function upsertDividend(d: DividendDistribution): boolean {
  const cfg = loadFiscalConfig();
  const idx = cfg.dividends.findIndex((x) => x.id === d.id);
  const list = [...cfg.dividends];
  if (idx >= 0) list[idx] = d;
  else list.push(d);
  return saveFiscalConfig({ ...cfg, dividends: list });
}

export function deleteDividend(id: string): boolean {
  const cfg = loadFiscalConfig();
  return saveFiscalConfig({ ...cfg, dividends: cfg.dividends.filter((d) => d.id !== id) });
}

export function upsertRelatedParty(op: RelatedPartyOperation): boolean {
  const cfg = loadFiscalConfig();
  const idx = cfg.relatedParties.findIndex((x) => x.id === op.id);
  const list = [...cfg.relatedParties];
  if (idx >= 0) list[idx] = op;
  else list.push(op);
  return saveFiscalConfig({ ...cfg, relatedParties: list });
}

export function deleteRelatedParty(id: string): boolean {
  const cfg = loadFiscalConfig();
  return saveFiscalConfig({
    ...cfg,
    relatedParties: cfg.relatedParties.filter((x) => x.id !== id),
  });
}

export function upsertForeignAsset(a: ForeignAsset): boolean {
  const cfg = loadFiscalConfig();
  const idx = cfg.foreignAssets.findIndex((x) => x.id === a.id);
  const list = [...cfg.foreignAssets];
  if (idx >= 0) list[idx] = a;
  else list.push(a);
  return saveFiscalConfig({ ...cfg, foreignAssets: list });
}

export function deleteForeignAsset(id: string): boolean {
  const cfg = loadFiscalConfig();
  return saveFiscalConfig({
    ...cfg,
    foreignAssets: cfg.foreignAssets.filter((x) => x.id !== id),
  });
}

export function updateModelo202(patch: Partial<FiscalConfig["modelo202"]>): boolean {
  const cfg = loadFiscalConfig();
  return saveFiscalConfig({ ...cfg, modelo202: { ...cfg.modelo202, ...patch } });
}

export function updateOss(patch: Partial<FiscalConfig["oss"]>): boolean {
  const cfg = loadFiscalConfig();
  return saveFiscalConfig({ ...cfg, oss: { ...cfg.oss, ...patch } });
}

export function updateIntrastat(patch: Partial<FiscalConfig["intrastat"]>): boolean {
  const cfg = loadFiscalConfig();
  return saveFiscalConfig({ ...cfg, intrastat: { ...cfg.intrastat, ...patch } });
}

// ─── Tareas pendientes ──────────────────────────────────────────────────────

export function addPendingTask(task: Omit<PendingFiscalTask, "id" | "createdAt"> & { id?: string }): boolean {
  const cfg = loadFiscalConfig();
  const id = task.id ?? `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const newTask: PendingFiscalTask = {
    ...task,
    id,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  return saveFiscalConfig({ ...cfg, pendingTasks: [...cfg.pendingTasks, newTask] });
}

export function resolvePendingTask(id: string): boolean {
  const cfg = loadFiscalConfig();
  const today = new Date().toISOString().slice(0, 10);
  return saveFiscalConfig({
    ...cfg,
    pendingTasks: cfg.pendingTasks.map((t) =>
      t.id === id ? { ...t, resolvedAt: today } : t,
    ),
  });
}

export function reopenPendingTask(id: string): boolean {
  const cfg = loadFiscalConfig();
  return saveFiscalConfig({
    ...cfg,
    pendingTasks: cfg.pendingTasks.map((t) =>
      t.id === id ? { ...t, resolvedAt: undefined } : t,
    ),
  });
}

export function deletePendingTask(id: string): boolean {
  const cfg = loadFiscalConfig();
  return saveFiscalConfig({
    ...cfg,
    pendingTasks: cfg.pendingTasks.filter((t) => t.id !== id),
  });
}

// ─── Siembra inicial (idempotente) ──────────────────────────────────────────

/**
 * Aplica los datos confirmados por el usuario el 25-04-2026:
 * - SL constituida hacia marzo 2026 → tipo reducido IS 15% para 2026-2027
 * - Sin recargo de equivalencia
 * - Aún sin facturar (lastYearTurnover=0)
 * - Modelo 202 método cuota con lastIsCuota=0 (no hay 200 previo)
 * - Adrián 75% admin / Luri 25% — operación vinculada con Adrián
 *
 * Crea las tareas pendientes que el admin tiene que rellenar más adelante.
 *
 * Idempotente: solo siembra si `seeded === false`. Si el usuario ya tocó la
 * configuración, no se sobreescribe nada.
 */
export function seedKnownStateIfMissing(): boolean {
  const cfg = loadFiscalConfig();
  if (cfg.seeded) return false;

  const today = new Date().toISOString().slice(0, 10);

  const seededRelatedParties: RelatedPartyOperation[] =
    cfg.relatedParties.length > 0
      ? cfg.relatedParties
      : [
          {
            id: "rp_adrian",
            relationship: "administrador",
            nif: "",
            name: "Adrián (administrador, 75%)",
            annualAmount: 0,
            opType: "servicio",
            fiscalYear: 2026,
            notes: "Socio mayoritario 75% + administrador único. NIF pendiente.",
          },
          {
            id: "rp_luri",
            relationship: "socio",
            nif: "",
            name: "Luri (socio 25%)",
            annualAmount: 0,
            opType: "otra",
            fiscalYear: 2026,
            notes: "Socio minoritario 25%. Responsable fiscal/contable de la web.",
          },
        ];

  const seededTasks: PendingFiscalTask[] = [
    {
      id: "seed_nif_adrian",
      title: "NIF de Adrián",
      description:
        "Necesario para Modelo 232 (operaciones vinculadas) y para retenciones IRPF en 111/190.",
      priority: "high",
      createdAt: today,
      category: "estructura",
    },
    {
      id: "seed_admin_retribution",
      title: "¿Adrián cobra ya como administrador?",
      description:
        "Si cobra: retención IRPF 35% (o 19% si CN<100k€). Activa Modelo 111 trimestral + 190 anual. Si también factura como autónomo → operaciones vinculadas a precio de mercado.",
      priority: "high",
      createdAt: today,
      category: "estructura",
    },
    {
      id: "seed_local_alquilado",
      title: "Datos del local alquilado",
      description:
        "Para 115 trimestral + 180 anual: NIF y nombre del arrendador, dirección + referencia catastral, renta mensual base (sin IVA), IVA 21%, retención 19%, fecha inicio contrato.",
      priority: "high",
      createdAt: today,
      category: "alquiler",
    },
    {
      id: "seed_oss_registration",
      title: "OSS — ¿registrados / vais a vender B2C UE?",
      description:
        "Si vais a vender más de 10.000€/año a particulares de otros países UE, hay que registrarse en OSS (modelo 035) y declarar trimestralmente con modelo 369.",
      priority: "medium",
      createdAt: today,
      category: "oss",
    },
    {
      id: "seed_foreign_assets",
      title: "Bienes en el extranjero (>50.000€)",
      description:
        "Si tenéis cuentas/valores/inmuebles fuera de España por bloque >50.000€ a 31-12-2026, hay que presentar Modelo 720 antes del 31 marzo 2027.",
      priority: "low",
      createdAt: today,
      category: "720",
    },
    {
      id: "seed_fiscal_year_end",
      title: "Confirmar cierre fiscal (31-12 por defecto)",
      description:
        "Por defecto se asume cierre 31 diciembre. Si los estatutos de la SL marcan otro, indicarlo para recalcular plazos del 200.",
      priority: "low",
      createdAt: today,
      category: "estructura",
    },
  ];

  const seededDone: PendingFiscalTask[] = [
    {
      id: "seed_done_036",
      title: "Modelo 036 — alta censal",
      description: "Confirmado por el usuario el 25-04-2026.",
      priority: "high",
      createdAt: today,
      resolvedAt: today,
      category: "estructura",
    },
    {
      id: "seed_done_re",
      title: "Régimen IVA — sin recargo de equivalencia",
      description: "Confirmado por el usuario el 25-04-2026. 303 normal, sin casillas RE.",
      priority: "medium",
      createdAt: today,
      resolvedAt: today,
      category: "estructura",
    },
    {
      id: "seed_done_structure",
      title: "Estructura societaria registrada",
      description:
        "Adrián 75% (administrador único, autónomo) — Luri 25%. Confirmado el 25-04-2026.",
      priority: "high",
      createdAt: today,
      resolvedAt: today,
      category: "estructura",
    },
  ];

  return saveFiscalConfig({
    ...cfg,
    company: {
      ...cfg.company,
      yearOfIncorporation: cfg.company.yearOfIncorporation ?? 2026,
      tipoReducidoIS: true,
      lastYearTurnover: cfg.company.lastYearTurnover ?? 0,
      recargoEquivalencia: false,
      fiscalYearEnd: cfg.company.fiscalYearEnd || "12-31",
    },
    modelo202: {
      method: cfg.modelo202.method ?? "cuota",
      lastIsCuota: cfg.modelo202.lastIsCuota ?? 0,
      lastIsYear: cfg.modelo202.lastIsYear,
      basePercentage: cfg.modelo202.basePercentage,
    },
    relatedParties: seededRelatedParties,
    pendingTasks: [...seededTasks, ...seededDone, ...cfg.pendingTasks],
    seeded: true,
  });
}
