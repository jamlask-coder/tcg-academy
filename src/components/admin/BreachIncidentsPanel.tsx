"use client";

/**
 * Panel de brechas de seguridad (RGPD art. 33 + 34).
 *
 * Reglas:
 *   - Cualquier incidente se abre con deadline +72h automático.
 *   - "Notificar AEPD" + "Notificar DPO" dispara los emails vía API servidor.
 *   - Los incidentes no se borran — solo se cierran (el registro es obligatorio).
 *   - El contador muestra cuántas horas quedan del plazo legal.
 */

import { useEffect, useState } from "react";
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, Send } from "lucide-react";
import type { BreachIncident } from "@/lib/backup/types";
import {
  closeBreach,
  listBreaches,
  markReported,
  openBreach,
} from "@/services/breachNotificationService";
import { DataHub } from "@/lib/dataHub";

interface Props {
  onToast: (msg: string) => void;
}

const SEVERITY_STYLES: Record<BreachIncident["severity"], string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<BreachIncident["status"], string> = {
  detected: "Detectado",
  contained: "Contenido",
  reported: "Notificado AEPD",
  closed: "Cerrado",
};

function hoursLeft(deadlineAt: string): number {
  return Math.max(
    0,
    Math.round((new Date(deadlineAt).getTime() - Date.now()) / 3600_000),
  );
}

export function BreachIncidentsPanel({ onToast }: Props) {
  const [items, setItems] = useState<BreachIncident[]>([]);
  const [draft, setDraft] = useState<{
    severity: BreachIncident["severity"];
    affectedSubjects: string;
    categories: string;
    description: string;
    measures: string;
  }>({
    severity: "medium",
    affectedSubjects: "0",
    categories: "",
    description: "",
    measures: "",
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const load = () => setItems(listBreaches());
    load();
    return DataHub.on("breach_incidents", load);
  }, []);

  const handleOpen = () => {
    if (!draft.description.trim()) {
      onToast("Describe el incidente antes de abrir");
      return;
    }
    openBreach({
      severity: draft.severity,
      affectedSubjects: Number(draft.affectedSubjects) || 0,
      dataCategories: draft.categories
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      description: draft.description.trim(),
      measuresTaken: draft.measures.trim(),
    });
    setDraft({
      severity: "medium",
      affectedSubjects: "0",
      categories: "",
      description: "",
      measures: "",
    });
    setShowForm(false);
    onToast("Incidente registrado — tienes 72h para notificar AEPD si procede");
  };

  const handleNotify = async (
    id: string,
    targets: { notifyAepd: boolean; notifyDpo: boolean },
  ) => {
    const updated = await markReported(id, targets);
    if (updated) onToast("Notificado. El incidente queda marcado como reportado.");
  };

  const handleClose = (id: string) => {
    if (!confirm("¿Cerrar incidente? No se podrá reabrir.")) return;
    closeBreach(id);
    onToast("Incidente cerrado");
  };

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-gray-900">
          <ShieldAlert size={18} className="text-red-600" /> Brechas de seguridad (AEPD 72h)
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          <AlertTriangle size={14} /> {showForm ? "Cancelar" : "Abrir incidente"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-gray-700">
              Severidad
              <select
                value={draft.severity}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, severity: e.target.value as BreachIncident["severity"] }))
                }
                className="mt-1 h-9 w-full rounded-lg border border-gray-200 px-2 text-sm"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-700">
              Sujetos afectados
              <input
                type="number"
                min={0}
                value={draft.affectedSubjects}
                onChange={(e) => setDraft((d) => ({ ...d, affectedSubjects: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border border-gray-200 px-2 text-sm"
              />
            </label>
          </div>
          <label className="mt-3 block text-xs font-semibold text-gray-700">
            Categorías de datos afectadas (coma-separadas)
            <input
              placeholder="nombre, email, dirección postal, NIF, historial compras"
              value={draft.categories}
              onChange={(e) => setDraft((d) => ({ ...d, categories: e.target.value }))}
              className="mt-1 h-9 w-full rounded-lg border border-gray-200 px-2 text-sm"
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-gray-700">
            Descripción del incidente
            <textarea
              rows={3}
              placeholder="Qué pasó, cuándo se detectó, cómo se descubrió"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-gray-700">
            Medidas adoptadas
            <textarea
              rows={2}
              placeholder="Qué se hizo para contener + pasos siguientes"
              value={draft.measures}
              onChange={(e) => setDraft((d) => ({ ...d, measures: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
          </label>
          <button
            onClick={handleOpen}
            className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            Registrar incidente
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">
          Sin incidentes registrados. El registro es obligatorio incluso cuando no se
          notifica — abre uno si detectas cualquier acceso no autorizado.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((i) => {
            const left = hoursLeft(i.deadlineAt);
            const urgent = left <= 24 && i.status === "detected";
            return (
              <div
                key={i.id}
                className={`rounded-2xl border p-4 ${urgent ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_STYLES[i.severity]}`}
                      >
                        {i.severity}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                        {STATUS_LABELS[i.status]}
                      </span>
                      {i.status === "detected" && (
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${urgent ? "bg-red-600 text-white" : "bg-amber-100 text-amber-800"}`}
                        >
                          <Clock size={10} /> {left}h restantes
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {i.affectedSubjects} sujetos · {i.dataCategories.join(", ") || "(sin categorías)"}
                    </p>
                    <p className="mt-1 text-xs text-gray-700">{i.description}</p>
                    {i.measuresTaken && (
                      <p className="mt-1 text-xs text-gray-500">
                        <strong>Medidas:</strong> {i.measuresTaken}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-[10px] text-gray-400">
                      {i.id} · detectado {new Date(i.detectedAt).toLocaleString("es-ES")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {i.status !== "closed" && i.status !== "reported" && (
                      <>
                        <button
                          onClick={() => handleNotify(i.id, { notifyAepd: true, notifyDpo: true })}
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-700"
                        >
                          <Send size={11} /> Notificar AEPD + DPO
                        </button>
                        <button
                          onClick={() => handleNotify(i.id, { notifyAepd: false, notifyDpo: true })}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Solo DPO
                        </button>
                      </>
                    )}
                    {i.status !== "closed" && (
                      <button
                        onClick={() => handleClose(i.id)}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <CheckCircle2 size={11} /> Cerrar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
