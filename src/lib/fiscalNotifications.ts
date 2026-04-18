/**
 * Sistema de Notificaciones Fiscales — TCG Academy.
 *
 * Genera alertas automáticas cuando se acercan deadlines fiscales.
 * Solo se muestran a Luri (responsable fiscal).
 *
 * Flujo:
 *   1. Al cargar el panel admin, se ejecuta checkFiscalDeadlines()
 *   2. Compara la fecha actual con el calendario fiscal
 *   3. Genera notificaciones para deadlines próximos (≤30 días)
 *   4. Prepara un borrador del documento (qué datos incluir, dónde presentar)
 *   5. La notificación persiste hasta que Luri pulsa "Visto"
 *
 * Solo Luri ve estas notificaciones (user.id === "admin-luri").
 */

import { generateTaxCalendar } from "@/accounting/advancedAccounting";
import { safeRead, safeWrite } from "@/lib/safeStorage";
import { DataHub } from "@/lib/dataHub";

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface FiscalNotification {
  id: string;
  modelo: string;
  title: string;
  /** Descripción detallada: qué hacer, dónde, plazo */
  body: string;
  /** Instrucciones paso a paso para presentar */
  instructions: string;
  /** URL de la sede electrónica de AEAT para este modelo */
  aeatUrl: string;
  deadline: string;
  daysRemaining: number;
  severity: "info" | "warning" | "urgent" | "overdue";
  /** Datos que el sistema ya ha preparado automáticamente */
  preparedData: string;
  /** Fecha de creación de la notificación */
  createdAt: string;
  /** true si Luri ha pulsado "Visto" */
  acknowledged: boolean;
  acknowledgedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

const NOTIF_KEY = "tcgacademy_fiscal_notifications";
const FISCAL_USER_ID = "admin-luri";

export function loadFiscalNotifications(): FiscalNotification[] {
  return safeRead<FiscalNotification[]>(NOTIF_KEY, []);
}

function saveFiscalNotifications(notifs: FiscalNotification[]): void {
  safeWrite(NOTIF_KEY, notifs);
  // Canonical DataHub event — any UI listening to the unified `notifications`
  // entity (sidebar badge, admin panel) refreshes after fiscal changes.
  DataHub.emit("notifications");
}

/** Comprobar si el usuario actual es el responsable fiscal */
export function isFiscalResponsible(userId: string): boolean {
  return userId === FISCAL_USER_ID;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATOS DE CADA MODELO (dónde presentar, URL, instrucciones)
// ═══════════════════════════════════════════════════════════════════════════════

interface ModeloInfo {
  url: string;
  where: string;
  instructions: string;
  preparedDataDesc: string;
}

const MODELO_INFO: Record<string, ModeloInfo> = {
  "303": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI34.shtml",
    where: "Sede electrónica AEAT → Impuestos → IVA → Modelo 303",
    instructions: "1. Acceder a la sede electrónica con certificado digital o Cl@ve.\n2. Seleccionar período (trimestre).\n3. Rellenar casillas con los datos del informe trimestral.\n4. Firmar y presentar.\n5. Guardar justificante PDF.",
    preparedDataDesc: "El sistema ha preparado automáticamente el desglose de IVA repercutido por tipo (21%, 10%, 4%, 0%), casillas del 01 al 65. Descargable en /admin/fiscal/trimestral.",
  },
  "390": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI35.shtml",
    where: "Sede electrónica AEAT → Impuestos → IVA → Modelo 390",
    instructions: "1. Acceder con certificado digital.\n2. El modelo 390 es un resumen anual de los cuatro 303.\n3. Verificar que los totales coincidan con la suma de trimestres.\n4. Presentar antes del 30 de enero.",
    preparedDataDesc: "Resumen anual generado automáticamente con desglose trimestral y por tipo de IVA. Descargable en /admin/fiscal/anual.",
  },
  "349": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI36.shtml",
    where: "Sede electrónica AEAT → Impuestos → Operaciones intracomunitarias → Modelo 349",
    instructions: "1. Solo si hay operaciones con empresas de otros países UE.\n2. Listar cada operador con su NIF intracomunitario y el importe.\n3. Tipo de operación: E (entrega bienes), S (servicios).",
    preparedDataDesc: "Listado de operaciones intracomunitarias con NIF, país, tipo y desglose trimestral. Descargable en /admin/fiscal/intracomunitario.",
  },
  "347": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI39.shtml",
    where: "Sede electrónica AEAT → Impuestos → Declaraciones informativas → Modelo 347",
    instructions: "1. Declarar cada cliente/proveedor con quien se haya operado >3.005,06€/año.\n2. Indicar NIF y desglose trimestral.\n3. Presentar antes del 28 de febrero.",
    preparedDataDesc: "Listado generado automáticamente de terceros que superan 3.005,06€. Descargable desde el panel de facturas → Exportar avanzado → Modelo 347.",
  },
  "111": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI01.shtml",
    where: "Sede electrónica AEAT → Impuestos → IRPF → Modelo 111",
    instructions: "1. Declarar retenciones practicadas a profesionales (15% IRPF).\n2. Si no hay proveedores profesionales este trimestre, no es necesario presentar.\n3. Mismos plazos que el 303.",
    preparedDataDesc: "Si tienes facturas de proveedores profesionales con retención, el sistema las detectará automáticamente.",
  },
  "190": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI04.shtml",
    where: "Sede electrónica AEAT → Impuestos → IRPF → Modelo 190",
    instructions: "1. Resumen anual de todas las retenciones del año (complementario al 111).\n2. Presentar antes del 31 de enero.",
    preparedDataDesc: "Resumen anual de retenciones generado a partir de los modelos 111 trimestrales.",
  },
  "200": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI21.shtml",
    where: "Sede electrónica AEAT → Impuestos → Sociedades → Modelo 200",
    instructions: "1. Declaración del Impuesto sobre Sociedades.\n2. Base imponible = resultado contable ± ajustes fiscales.\n3. Tipo general: 25% (15% para nuevas empresas los 2 primeros años).\n4. Presentar antes del 25 de julio.",
    preparedDataDesc: "La cuenta de pérdidas y ganancias (P&L) del sistema proporciona el resultado contable base. Descargable en /admin/fiscal/facturas → Cuenta de Resultados.",
  },
  "CCAA": {
    url: "https://www.registradores.org/",
    where: "Registro Mercantil (a través de registradores.org o presencialmente)",
    instructions: "1. Preparar: balance de situación, cuenta de P&G, memoria.\n2. Aprobación en Junta General (dentro de 6 meses desde cierre ejercicio).\n3. Depositar en Registro Mercantil (dentro de 1 mes desde aprobación).\n4. Plazo límite: 30 de julio.",
    preparedDataDesc: "Balance de situación y cuenta de P&G generados automáticamente. Descargables desde el panel de facturas.",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOTOR DE NOTIFICACIONES
// ═══════════════════════════════════════════════════════════════════════════════

function buildNotificationId(modelo: string, period: string): string {
  return `fn_${modelo}_${period.replace(/\s/g, "_")}`;
}

function getSeverity(days: number): FiscalNotification["severity"] {
  if (days < 0) return "overdue";
  if (days <= 5) return "urgent";
  if (days <= 15) return "warning";
  return "info";
}

/**
 * Escanea el calendario fiscal y genera/actualiza notificaciones.
 * Se ejecuta automáticamente al cargar el panel admin (solo para Luri).
 *
 * Reglas:
 *   - Genera notificación si faltan ≤30 días para un deadline
 *   - NO regenera si ya existe y está acknowledged
 *   - Actualiza severidad si cambió (ej: pasó de warning a urgent)
 *   - Marca como overdue si venció
 */
export function checkFiscalDeadlines(): FiscalNotification[] {
  const year = new Date().getFullYear();
  const calendar = [
    ...generateTaxCalendar(year - 1), // Modelos del año anterior que se presentan este año
    ...generateTaxCalendar(year),
  ];

  const existing = loadFiscalNotifications();
  const existingMap = new Map(existing.map((n) => [n.id, n]));
  const updated: FiscalNotification[] = [];

  for (const obligation of calendar) {
    if (obligation.daysRemaining > 30) continue; // Solo los próximos 30 días

    const id = buildNotificationId(obligation.modelo, obligation.period);
    const prev = existingMap.get(id);

    // Si ya fue acknowledged y no ha vencido, mantenerla como está
    if (prev?.acknowledged && obligation.daysRemaining >= 0) {
      updated.push(prev);
      continue;
    }

    // Si venció y estaba acknowledged, re-abrir como overdue
    if (prev?.acknowledged && obligation.daysRemaining < 0) {
      updated.push({
        ...prev,
        severity: "overdue",
        daysRemaining: obligation.daysRemaining,
        acknowledged: false,
        acknowledgedAt: undefined,
      });
      continue;
    }

    const info = MODELO_INFO[obligation.modelo];
    if (!info) continue;

    const severity = getSeverity(obligation.daysRemaining);
    const daysText = obligation.daysRemaining < 0
      ? `VENCIDO hace ${Math.abs(obligation.daysRemaining)} días`
      : obligation.daysRemaining === 0
        ? "HOY es el último día"
        : `Faltan ${obligation.daysRemaining} días`;

    updated.push({
      id,
      modelo: obligation.modelo,
      title: `Modelo ${obligation.modelo} — ${obligation.period}`,
      body: `${obligation.description}. ${daysText}. Fecha límite: ${obligation.deadline}.`,
      instructions: info.instructions,
      aeatUrl: info.url,
      deadline: obligation.deadline,
      daysRemaining: obligation.daysRemaining,
      severity,
      preparedData: info.preparedDataDesc,
      createdAt: prev?.createdAt ?? new Date().toISOString(),
      acknowledged: prev?.acknowledged ?? false,
      acknowledgedAt: prev?.acknowledgedAt,
    });
  }

  // Sort: overdue first, then by days remaining
  updated.sort((a, b) => {
    const sevOrder = { overdue: 0, urgent: 1, warning: 2, info: 3 };
    const sevDiff = sevOrder[a.severity] - sevOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return a.daysRemaining - b.daysRemaining;
  });

  saveFiscalNotifications(updated);
  return updated;
}

/**
 * Marcar una notificación como "Vista" (acknowledged).
 * Solo Luri puede hacer esto.
 */
export function acknowledgeFiscalNotification(notifId: string): void {
  const all = loadFiscalNotifications();
  const notif = all.find((n) => n.id === notifId);
  if (notif) {
    notif.acknowledged = true;
    notif.acknowledgedAt = new Date().toISOString();
    saveFiscalNotifications(all);
  }
}

/**
 * Obtener notificaciones pendientes (no acknowledged) para mostrar como alerta.
 */
export function getPendingFiscalNotifications(): FiscalNotification[] {
  return loadFiscalNotifications().filter((n) => !n.acknowledged);
}

/**
 * Contar notificaciones urgentes (para badge en sidebar).
 */
export function countUrgentFiscalNotifications(): number {
  return getPendingFiscalNotifications().filter(
    (n) => n.severity === "urgent" || n.severity === "overdue",
  ).length;
}
