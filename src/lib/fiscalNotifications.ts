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
import { sendAppEmail } from "@/services/emailService";

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface FiscalNotification {
  id: string;
  modelo: string;
  /** Período exacto (ej. "T1 2026", "Anual 2025", "1P 2026", "03/2026") — usado por generateDraft */
  period: string;
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
const REMINDER_LOG_KEY = "tcgacademy_fiscal_reminder_log";
const FISCAL_USER_ID = "admin-luri";
const FISCAL_USER_EMAIL = "luri@tcgacademy.es";
const FISCAL_USER_NAME = "Luri";

/**
 * Registro de recordatorios ya enviados — evita spam.
 * Estructura: { [notifId]: { urgent?: ISO, overdue?: ISO } }
 * Cada severidad escalable se envía como mucho una vez.
 */
type ReminderLog = Record<string, { urgent?: string; overdue?: string }>;

function loadReminderLog(): ReminderLog {
  return safeRead<ReminderLog>(REMINDER_LOG_KEY, {});
}

function saveReminderLog(log: ReminderLog): void {
  safeWrite(REMINDER_LOG_KEY, log);
}

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
  "115": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI13.shtml",
    where: "Sede electrónica AEAT → Impuestos → IRPF → Modelo 115",
    instructions: "1. Solo si pagáis alquiler de un local/oficina/almacén a un arrendador no exento.\n2. Retención: 19% sobre la base (importe sin IVA).\n3. Listar arrendador (NIF, nombre), base e importe retenido.\n4. Mismos plazos que el 303 (20 enero/abril/julio/octubre).\n5. Si no hay alquiler con retención este trimestre → no presentar.",
    preparedDataDesc: "Si registráis facturas de alquiler con retención, el sistema agrupa por arrendador y calcula la retención total del trimestre.",
  },
  "180": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI17.shtml",
    where: "Sede electrónica AEAT → Impuestos → IRPF → Modelo 180",
    instructions: "1. Resumen anual de los 4 modelos 115 trimestrales.\n2. Listar cada arrendador con totales anuales.\n3. Plazo: hasta el 31 de enero del año siguiente.",
    preparedDataDesc: "Resumen anual generado automáticamente a partir de los modelos 115 trimestrales.",
  },
  "123": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI14.shtml",
    where: "Sede electrónica AEAT → Impuestos → IRPF → Modelo 123",
    instructions: "1. Solo si la sociedad reparte dividendos, intereses u otros rendimientos de capital mobiliario a personas físicas.\n2. Retención: 19% (general).\n3. Si no hay reparto este trimestre → no presentar.",
    preparedDataDesc: "Sólo se rellenará si registráis acuerdos de reparto de dividendos en /admin/fiscal. En caso contrario, el modelo no aplica.",
  },
  "193": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI18.shtml",
    where: "Sede electrónica AEAT → Impuestos → IRPF → Modelo 193",
    instructions: "1. Resumen anual de los modelos 123 trimestrales.\n2. Plazo: hasta el 31 de enero del año siguiente.",
    preparedDataDesc: "Resumen anual generado automáticamente a partir de los modelos 123 trimestrales.",
  },
  "202": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ01.shtml",
    where: "Sede electrónica AEAT → Impuestos → Sociedades → Modelo 202 (Pago fraccionado)",
    instructions: "1. Pago a cuenta del Impuesto de Sociedades (modelo 200) a presentar 3 veces al año:\n   - 1P: hasta 20 abril (resultado enero-marzo)\n   - 2P: hasta 20 octubre (resultado enero-septiembre)\n   - 3P: hasta 20 diciembre (resultado enero-noviembre)\n2. Cálculo método cuota (general): 18% sobre la cuota íntegra del último IS presentado.\n3. Cálculo método base (CN >6M€ o por opción): 17% del resultado del período.\n4. Si el resultado es negativo y se aplica método cuota → presentar a 0 (es obligatorio).",
    preparedDataDesc: "El sistema calcula automáticamente el método cuota a partir del último modelo 200 presentado. Para el método base, lee el resultado contable acumulado del año desde la P&G.",
  },
  "232": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ19.shtml",
    where: "Sede electrónica AEAT → Impuestos → Sociedades → Modelo 232",
    instructions: "1. Declaración informativa de operaciones vinculadas (con socios, administradores, sociedades del grupo) y operaciones con paraísos fiscales.\n2. Obligatorio si:\n   - Operaciones con la misma entidad vinculada >250.000€/año\n   - Operaciones específicas >100.000€/año\n   - Cualquier operación con paraíso fiscal\n3. Plazo: el mes siguiente a los 10 meses posteriores al cierre fiscal (para cierres 31-dic → hasta 30-nov).",
    preparedDataDesc: "Si tenéis operaciones registradas con sociedades vinculadas o socios (a detectar manualmente en el panel), el sistema las marcará para revisión.",
  },
  "369": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH01.shtml",
    where: "Sede electrónica AEAT → IVA → Régimen especial Ventanilla Única (OSS) → Modelo 369",
    instructions: "1. Obligatorio si las ventas B2C a particulares de OTROS países UE superan 10.000€/año (umbral común UE).\n2. Permite ingresar el IVA de TODOS los países UE en una sola declaración a través de AEAT.\n3. Listado: por país, base imponible y tipo de IVA aplicable de ese país.\n4. Plazo: último día del mes siguiente al trimestre (30-abr / 31-jul / 31-oct / 31-ene).\n5. Si NO os habéis dado de alta en OSS y vendéis a UE B2C, hay que registrarse antes vía modelo 035.",
    preparedDataDesc: "El sistema agrupa los pedidos B2C con destino UE por país y tipo de IVA local, calculando la base y cuota a ingresar por país.",
  },
  "720": {
    url: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI22.shtml",
    where: "Sede electrónica AEAT → Declaraciones informativas → Modelo 720",
    instructions: "1. Declaración informativa de bienes y derechos en el extranjero.\n2. Obligatorio si en cualquiera de los 3 bloques se superan los 50.000€:\n   - Cuentas en entidades financieras extranjeras\n   - Valores, derechos, seguros y rentas depositadas/gestionadas en el extranjero\n   - Inmuebles y derechos sobre inmuebles en el extranjero\n3. Plazo: del 1 de enero al 31 de marzo.\n4. NO sustituye al 100% obligaciones fiscales del IRPF/IS — solo informa.",
    preparedDataDesc: "Modelo informativo. Si la sociedad tiene cuentas o inversiones en el extranjero, debe registrarlas manualmente. El sistema no las detecta automáticamente.",
  },
  "INTRASTAT": {
    url: "https://aduanas.serviciosmin.gob.es/intrastat",
    where: "Departamento de Aduanas (no AEAT) — Servicio web Intrastat",
    instructions: "1. Estadística comercial UE (no es un impuesto).\n2. Obligatorio si las introducciones (compras) o expediciones (ventas) intracomunitarias superan el umbral anual (2026: ~400.000€ por flujo).\n3. Mensual: presentación hasta el día 12 del mes siguiente.\n4. Detalle por código TARIC, país, valor estadístico y peso.",
    preparedDataDesc: "El sistema lista pedidos intracomunitarios B2B (con NIF-IVA) y compras a proveedores UE registradas. Falta clasificación TARIC manual antes de presentar.",
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
      period: obligation.period,
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

  // Disparar emails de recordatorio para cualquier notificación que haya
  // entrado por primera vez en estado urgente o vencido. Cada (notifId,
  // severidad) se envía una sola vez — el log persiste en localStorage.
  void dispatchUrgentReminders(updated);

  return updated;
}

/**
 * Envía un email a Luri por cada notificación nueva en estado urgent/overdue.
 * Se llama desde checkFiscalDeadlines tras persistir las notificaciones.
 *
 * Idempotente: usa REMINDER_LOG_KEY para no reenviar.
 * Solo opera en cliente (window definido) — sendAppEmail ya gestiona modo
 * server vía Resend; en modo local solo registra en /admin/emails.
 */
async function dispatchUrgentReminders(
  notifs: FiscalNotification[],
): Promise<void> {
  if (typeof window === "undefined") return;

  const log = loadReminderLog();
  let changed = false;

  for (const n of notifs) {
    if (n.severity !== "urgent" && n.severity !== "overdue") continue;
    const entry = log[n.id] ?? {};
    if (entry[n.severity]) continue; // ya enviado para este nivel

    const sevLabel = n.severity === "overdue" ? "VENCIDO" : "URGENTE";
    const daysText =
      n.daysRemaining < 0
        ? `Vencido hace ${Math.abs(n.daysRemaining)} días`
        : n.daysRemaining === 0
          ? "Hoy es el último día"
          : `Faltan ${n.daysRemaining} días`;

    const info = MODELO_INFO[n.modelo];
    const panelUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/admin/fiscal/calendario`
        : "/admin/fiscal/calendario";

    try {
      await sendAppEmail({
        toEmail: FISCAL_USER_EMAIL,
        toName: FISCAL_USER_NAME,
        templateId: "fiscal_recordatorio",
        vars: {
          nombre: FISCAL_USER_NAME,
          modelo: n.modelo,
          period: n.period,
          dias_texto: daysText,
          deadline: n.deadline,
          severidad_label: sevLabel,
          instrucciones: n.instructions,
          where: info?.where ?? "Sede electrónica AEAT",
          aeat_url: n.aeatUrl,
          panel_url: panelUrl,
        },
        preview: `${sevLabel} — Modelo ${n.modelo} ${n.period}`,
      });
      entry[n.severity] = new Date().toISOString();
      log[n.id] = entry;
      changed = true;
    } catch {
      // En caso de fallo (red caída, plantilla no encontrada), no marcar como
      // enviado — el siguiente check intentará de nuevo. Sin throw para que
      // no rompa la generación de notificaciones en sí.
    }
  }

  if (changed) saveReminderLog(log);
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
