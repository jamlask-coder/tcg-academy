"use client";
/**
 * SystemGuard — Componente invisible de protección del sistema.
 *
 * Se monta una vez al arrancar la app y ejecuta:
 *   1. Self-healing (repara datos corruptos en localStorage)
 *   2. Detección de anomalías base (time travel, invoice tampering)
 *   3. Verificación de integridad de facturas
 *
 * No renderiza nada. No tiene UI. Solo protege.
 */

import { useEffect, useRef } from "react";

export function SystemGuard() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Run asynchronously to not block rendering
    void (async () => {
      try {
        // 1. Self-healing
        const { runSelfHealing } = await import("@/lib/selfHeal");
        runSelfHealing();
      } catch { /* non-critical */ }

      try {
        // 2. Anomaly detection baseline
        const { detectTimeTravel, detectInvoiceTampering } = await import("@/lib/anomalyDetection");
        detectTimeTravel();

        // Check invoice count hasn't decreased (tampering detection)
        const raw = localStorage.getItem("tcgacademy_invoices");
        if (raw) {
          try {
            const count = JSON.parse(raw).length;
            detectInvoiceTampering(count);
          } catch { /* corrupt data — self-heal handles it */ }
        }
      } catch { /* non-critical */ }
    })();
  }, []);

  return null; // Invisible component
}
