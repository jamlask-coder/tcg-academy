"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Building2,
  Home,
  Coins,
  Calculator,
  Users,
  Globe,
  ShoppingBag,
  Truck,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import {
  loadFiscalConfig,
  saveFiscalConfig,
} from "@/services/fiscalConfigService";
import {
  type FiscalConfig,
  type RentalAgreement,
  type DividendDistribution,
  type RelatedPartyOperation,
  type ForeignAsset,
} from "@/types/fiscalConfig";
import { DataHub } from "@/lib/dataHub";

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function FiscalConfigPage() {
  const [cfg, setCfg] = useState<FiscalConfig | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCfg(loadFiscalConfig());
    return DataHub.on("fiscal_config", () => setCfg(loadFiscalConfig()));
  }, []);

  if (!cfg) return null;

  function persist(next: FiscalConfig) {
    setCfg(next);
    saveFiscalConfig(next);
    setSavedAt(new Date().toLocaleTimeString("es-ES"));
  }

  // ─── Mutadores por sección ─────────────────────────────────────────

  function updateCompany(patch: Partial<FiscalConfig["company"]>) {
    persist({ ...cfg!, company: { ...cfg!.company, ...patch } });
  }
  function update202(patch: Partial<FiscalConfig["modelo202"]>) {
    persist({ ...cfg!, modelo202: { ...cfg!.modelo202, ...patch } });
  }
  function updateOss(patch: Partial<FiscalConfig["oss"]>) {
    persist({ ...cfg!, oss: { ...cfg!.oss, ...patch } });
  }
  function updateIntrastat(patch: Partial<FiscalConfig["intrastat"]>) {
    persist({ ...cfg!, intrastat: { ...cfg!.intrastat, ...patch } });
  }

  function addRental() {
    const nuevo: RentalAgreement = {
      id: genId("rent"),
      arrendadorNif: "",
      arrendadorName: "",
      immuebleDireccion: "",
      rentaMensualBase: 0,
      vatRate: 21,
      retentionRate: 19,
      startDate: new Date().toISOString().slice(0, 10),
    };
    persist({ ...cfg!, rentals: [...cfg!.rentals, nuevo] });
  }

  function updateRental(id: string, patch: Partial<RentalAgreement>) {
    persist({
      ...cfg!,
      rentals: cfg!.rentals.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  }

  function deleteRental(id: string) {
    persist({ ...cfg!, rentals: cfg!.rentals.filter((r) => r.id !== id) });
  }

  function addDividend() {
    const nuevo: DividendDistribution = {
      id: genId("div"),
      date: new Date().toISOString().slice(0, 10),
      recipientNif: "",
      recipientName: "",
      grossAmount: 0,
      retentionRate: 19,
    };
    persist({ ...cfg!, dividends: [...cfg!.dividends, nuevo] });
  }

  function updateDividend(id: string, patch: Partial<DividendDistribution>) {
    persist({
      ...cfg!,
      dividends: cfg!.dividends.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    });
  }

  function deleteDividend(id: string) {
    persist({ ...cfg!, dividends: cfg!.dividends.filter((d) => d.id !== id) });
  }

  function addRelatedParty() {
    const nuevo: RelatedPartyOperation = {
      id: genId("rp"),
      relationship: "socio",
      nif: "",
      name: "",
      annualAmount: 0,
      opType: "venta",
      fiscalYear: new Date().getFullYear(),
    };
    persist({ ...cfg!, relatedParties: [...cfg!.relatedParties, nuevo] });
  }

  function updateRelatedParty(id: string, patch: Partial<RelatedPartyOperation>) {
    persist({
      ...cfg!,
      relatedParties: cfg!.relatedParties.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  }

  function deleteRelatedParty(id: string) {
    persist({
      ...cfg!,
      relatedParties: cfg!.relatedParties.filter((x) => x.id !== id),
    });
  }

  function addForeignAsset() {
    const nuevo: ForeignAsset = {
      id: genId("fa"),
      block: "C",
      country: "",
      identifier: "",
      entity: "",
      yearEndValue: 0,
      fiscalYear: new Date().getFullYear(),
    };
    persist({ ...cfg!, foreignAssets: [...cfg!.foreignAssets, nuevo] });
  }

  function updateForeignAsset(id: string, patch: Partial<ForeignAsset>) {
    persist({
      ...cfg!,
      foreignAssets: cfg!.foreignAssets.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    });
  }

  function deleteForeignAsset(id: string) {
    persist({
      ...cfg!,
      foreignAssets: cfg!.foreignAssets.filter((x) => x.id !== id),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Settings size={24} className="text-[#2563eb]" />
            Configuración fiscal
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Datos que el sistema usa para auto-generar borradores de modelos AEAT.
          </p>
        </div>
        {savedAt && (
          <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            <Save size={12} /> Guardado {savedAt}
          </span>
        )}
      </div>

      {/* ─── Datos de la empresa ─── */}
      <Section title="Datos de la empresa" icon={<Building2 size={18} />}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Cierre fiscal (MM-DD)">
            <input
              type="text"
              defaultValue={cfg.company.fiscalYearEnd}
              onBlur={(e) => updateCompany({ fiscalYearEnd: e.target.value })}
              placeholder="12-31"
              className="input"
            />
          </Field>
          <Field label="Año de constitución">
            <input
              type="number"
              defaultValue={cfg.company.yearOfIncorporation ?? ""}
              onBlur={(e) =>
                updateCompany({
                  yearOfIncorporation: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              className="input"
            />
          </Field>
          <Field label="Cifra de negocios año anterior (€)">
            <input
              type="number"
              step="0.01"
              defaultValue={cfg.company.lastYearTurnover ?? ""}
              onBlur={(e) =>
                updateCompany({
                  lastYearTurnover: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              className="input"
            />
          </Field>
          <div className="flex flex-col gap-2 pt-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cfg.company.tipoReducidoIS}
                onChange={(e) =>
                  updateCompany({ tipoReducidoIS: e.target.checked })
                }
              />
              Tipo reducido IS (15% nuevas, 2 primeros años)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cfg.company.recargoEquivalencia}
                onChange={(e) =>
                  updateCompany({ recargoEquivalencia: e.target.checked })
                }
              />
              Acogido a recargo de equivalencia
            </label>
          </div>
        </div>
      </Section>

      {/* ─── Alquileres (115/180) ─── */}
      <Section
        title={`Alquileres con retención (${cfg.rentals.length}) — Modelo 115 / 180`}
        icon={<Home size={18} />}
        action={
          <button onClick={addRental} className="btn-add">
            <Plus size={14} /> Añadir alquiler
          </button>
        }
      >
        {cfg.rentals.length === 0 ? (
          <p className="text-sm text-gray-400">
            Sin contratos registrados. Si tenéis local alquilado, añadid el contrato aquí para que el sistema genere automáticamente los modelos 115 trimestrales y el 180 anual.
          </p>
        ) : (
          <div className="space-y-3">
            {cfg.rentals.map((r) => (
              <div
                key={r.id}
                className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 md:grid-cols-2 lg:grid-cols-4"
              >
                <Field label="NIF arrendador">
                  <input
                    type="text"
                    defaultValue={r.arrendadorNif}
                    onBlur={(e) =>
                      updateRental(r.id, { arrendadorNif: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Nombre arrendador">
                  <input
                    type="text"
                    defaultValue={r.arrendadorName}
                    onBlur={(e) =>
                      updateRental(r.id, { arrendadorName: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Dirección inmueble">
                  <input
                    type="text"
                    defaultValue={r.immuebleDireccion}
                    onBlur={(e) =>
                      updateRental(r.id, { immuebleDireccion: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Ref. catastral">
                  <input
                    type="text"
                    defaultValue={r.refCatastral ?? ""}
                    onBlur={(e) =>
                      updateRental(r.id, { refCatastral: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Renta mensual base (sin IVA, €)">
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={r.rentaMensualBase}
                    onBlur={(e) =>
                      updateRental(r.id, {
                        rentaMensualBase: Number(e.target.value),
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="IVA (%)">
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={r.vatRate}
                    onBlur={(e) =>
                      updateRental(r.id, { vatRate: Number(e.target.value) })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Retención IRPF (%)">
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={r.retentionRate}
                    onBlur={(e) =>
                      updateRental(r.id, {
                        retentionRate: Number(e.target.value),
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Inicio contrato">
                  <input
                    type="date"
                    defaultValue={r.startDate}
                    onBlur={(e) =>
                      updateRental(r.id, { startDate: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Fin contrato (opcional)">
                  <input
                    type="date"
                    defaultValue={r.endDate ?? ""}
                    onBlur={(e) =>
                      updateRental(r.id, {
                        endDate: e.target.value || undefined,
                      })
                    }
                    className="input"
                  />
                </Field>
                <div className="flex items-end gap-3 lg:col-span-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={r.retentionExempt ?? false}
                      onChange={(e) =>
                        updateRental(r.id, {
                          retentionExempt: e.target.checked,
                        })
                      }
                    />
                    Exento de retención (raro)
                  </label>
                  <button
                    onClick={() => deleteRental(r.id)}
                    className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ─── Modelo 202 ─── */}
      <Section title="Modelo 202 — Pago fraccionado IS" icon={<Calculator size={18} />}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Método de cálculo">
            <select
              value={cfg.modelo202.method}
              onChange={(e) =>
                update202({ method: e.target.value as "cuota" | "base" })
              }
              className="input"
            >
              <option value="cuota">Cuota (art. 40.2 LIS — 18% sobre cuota última 200)</option>
              <option value="base">Base (art. 40.3 LIS — % sobre resultado, obligatorio si CN &gt;6M€)</option>
            </select>
          </Field>
          {cfg.modelo202.method === "cuota" ? (
            <>
              <Field label="Cuota íntegra último modelo 200 (€)">
                <input
                  type="number"
                  step="0.01"
                  defaultValue={cfg.modelo202.lastIsCuota ?? ""}
                  onBlur={(e) =>
                    update202({
                      lastIsCuota: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="input"
                />
              </Field>
              <Field label="Año del último 200">
                <input
                  type="number"
                  defaultValue={cfg.modelo202.lastIsYear ?? ""}
                  onBlur={(e) =>
                    update202({
                      lastIsYear: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="input"
                />
              </Field>
            </>
          ) : (
            <Field label="% aplicable (17% general)">
              <input
                type="number"
                step="0.1"
                defaultValue={cfg.modelo202.basePercentage ?? 17}
                onBlur={(e) =>
                  update202({ basePercentage: Number(e.target.value) })
                }
                className="input"
              />
            </Field>
          )}
        </div>
      </Section>

      {/* ─── Dividendos (123/193) ─── */}
      <Section
        title={`Dividendos / capital mobiliario (${cfg.dividends.length}) — Modelo 123 / 193`}
        icon={<Coins size={18} />}
        action={
          <button onClick={addDividend} className="btn-add">
            <Plus size={14} /> Añadir reparto
          </button>
        }
      >
        {cfg.dividends.length === 0 ? (
          <p className="text-sm text-gray-400">
            Sin repartos registrados. Solo aplica si la sociedad reparte dividendos a socios o paga intereses.
          </p>
        ) : (
          <div className="space-y-3">
            {cfg.dividends.map((d) => (
              <div
                key={d.id}
                className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 md:grid-cols-2 lg:grid-cols-4"
              >
                <Field label="Fecha">
                  <input
                    type="date"
                    defaultValue={d.date}
                    onBlur={(e) =>
                      updateDividend(d.id, { date: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="NIF beneficiario">
                  <input
                    type="text"
                    defaultValue={d.recipientNif}
                    onBlur={(e) =>
                      updateDividend(d.id, { recipientNif: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Nombre beneficiario">
                  <input
                    type="text"
                    defaultValue={d.recipientName}
                    onBlur={(e) =>
                      updateDividend(d.id, { recipientName: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Importe bruto (€)">
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={d.grossAmount}
                    onBlur={(e) =>
                      updateDividend(d.id, {
                        grossAmount: Number(e.target.value),
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Retención (%)">
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={d.retentionRate}
                    onBlur={(e) =>
                      updateDividend(d.id, {
                        retentionRate: Number(e.target.value),
                      })
                    }
                    className="input"
                  />
                </Field>
                <div className="flex items-end lg:col-span-3">
                  <button
                    onClick={() => deleteDividend(d.id)}
                    className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ─── Operaciones vinculadas (232) ─── */}
      <Section
        title={`Operaciones vinculadas (${cfg.relatedParties.length}) — Modelo 232`}
        icon={<Users size={18} />}
        action={
          <button onClick={addRelatedParty} className="btn-add">
            <Plus size={14} /> Añadir operación
          </button>
        }
      >
        {cfg.relatedParties.length === 0 ? (
          <p className="text-sm text-gray-400">
            Sin operaciones vinculadas. Solo aplica si hay operaciones con socios, administradores, sociedades del grupo o paraísos fiscales.
          </p>
        ) : (
          <div className="space-y-3">
            {cfg.relatedParties.map((op) => (
              <div
                key={op.id}
                className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 md:grid-cols-2 lg:grid-cols-4"
              >
                <Field label="Tipo de relación">
                  <select
                    value={op.relationship}
                    onChange={(e) =>
                      updateRelatedParty(op.id, {
                        relationship: e.target.value as RelatedPartyOperation["relationship"],
                      })
                    }
                    className="input"
                  >
                    <option value="socio">Socio</option>
                    <option value="administrador">Administrador</option>
                    <option value="grupo">Sociedad del grupo</option>
                    <option value="paraiso">Paraíso fiscal</option>
                    <option value="otra">Otra</option>
                  </select>
                </Field>
                <Field label="NIF">
                  <input
                    type="text"
                    defaultValue={op.nif}
                    onBlur={(e) =>
                      updateRelatedParty(op.id, { nif: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Nombre">
                  <input
                    type="text"
                    defaultValue={op.name}
                    onBlur={(e) =>
                      updateRelatedParty(op.id, { name: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Tipo de operación">
                  <select
                    value={op.opType}
                    onChange={(e) =>
                      updateRelatedParty(op.id, {
                        opType: e.target.value as RelatedPartyOperation["opType"],
                      })
                    }
                    className="input"
                  >
                    <option value="venta">Venta</option>
                    <option value="compra">Compra</option>
                    <option value="servicio">Servicio</option>
                    <option value="prestamo">Préstamo</option>
                    <option value="alquiler">Alquiler</option>
                    <option value="otra">Otra</option>
                  </select>
                </Field>
                <Field label="Importe anual (€)">
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={op.annualAmount}
                    onBlur={(e) =>
                      updateRelatedParty(op.id, {
                        annualAmount: Number(e.target.value),
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Ejercicio fiscal">
                  <input
                    type="number"
                    defaultValue={op.fiscalYear}
                    onBlur={(e) =>
                      updateRelatedParty(op.id, {
                        fiscalYear: Number(e.target.value),
                      })
                    }
                    className="input"
                  />
                </Field>
                <div className="flex items-end lg:col-span-2">
                  <button
                    onClick={() => deleteRelatedParty(op.id)}
                    className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ─── Bienes en el extranjero (720) ─── */}
      <Section
        title={`Bienes en el extranjero (${cfg.foreignAssets.length}) — Modelo 720`}
        icon={<Globe size={18} />}
        action={
          <button onClick={addForeignAsset} className="btn-add">
            <Plus size={14} /> Añadir bien
          </button>
        }
      >
        {cfg.foreignAssets.length === 0 ? (
          <p className="text-sm text-gray-400">
            Sin bienes en el extranjero. Solo aplica si la sociedad tiene cuentas, valores o inmuebles fuera de España &gt;50.000€.
          </p>
        ) : (
          <div className="space-y-3">
            {cfg.foreignAssets.map((a) => (
              <div
                key={a.id}
                className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 md:grid-cols-2 lg:grid-cols-4"
              >
                <Field label="Bloque">
                  <select
                    value={a.block}
                    onChange={(e) =>
                      updateForeignAsset(a.id, {
                        block: e.target.value as ForeignAsset["block"],
                      })
                    }
                    className="input"
                  >
                    <option value="C">C — Cuentas</option>
                    <option value="V">V — Valores / inversiones</option>
                    <option value="I">I — Inmuebles</option>
                  </select>
                </Field>
                <Field label="País">
                  <input
                    type="text"
                    defaultValue={a.country}
                    onBlur={(e) =>
                      updateForeignAsset(a.id, { country: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Identificador (IBAN/ISIN/dir.)">
                  <input
                    type="text"
                    defaultValue={a.identifier}
                    onBlur={(e) =>
                      updateForeignAsset(a.id, { identifier: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Entidad gestora">
                  <input
                    type="text"
                    defaultValue={a.entity}
                    onBlur={(e) =>
                      updateForeignAsset(a.id, { entity: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Valor a 31-12 (€)">
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={a.yearEndValue}
                    onBlur={(e) =>
                      updateForeignAsset(a.id, {
                        yearEndValue: Number(e.target.value),
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Saldo medio T4 (solo cuentas, €)">
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={a.q4AverageBalance ?? ""}
                    onBlur={(e) =>
                      updateForeignAsset(a.id, {
                        q4AverageBalance: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Ejercicio">
                  <input
                    type="number"
                    defaultValue={a.fiscalYear}
                    onBlur={(e) =>
                      updateForeignAsset(a.id, {
                        fiscalYear: Number(e.target.value),
                      })
                    }
                    className="input"
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    onClick={() => deleteForeignAsset(a.id)}
                    className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ─── OSS (369) ─── */}
      <Section title="OSS Ventanilla Única — Modelo 369" icon={<ShoppingBag size={18} />}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cfg.oss.registered}
              onChange={(e) => updateOss({ registered: e.target.checked })}
            />
            Dado de alta en OSS (modelo 035 presentado)
          </label>
          <Field label="Fecha de alta">
            <input
              type="date"
              defaultValue={cfg.oss.registrationDate ?? ""}
              onBlur={(e) =>
                updateOss({ registrationDate: e.target.value || undefined })
              }
              className="input"
              disabled={!cfg.oss.registered}
            />
          </Field>
          <Field label="Esquema OSS">
            <select
              value={cfg.oss.scheme}
              onChange={(e) =>
                updateOss({
                  scheme: e.target.value as FiscalConfig["oss"]["scheme"],
                })
              }
              className="input"
              disabled={!cfg.oss.registered}
            >
              <option value="union">Régimen UE</option>
              <option value="no-union">Régimen no UE</option>
              <option value="import">Importación</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              checked={cfg.oss.thresholdExceeded}
              onChange={(e) =>
                updateOss({ thresholdExceeded: e.target.checked })
              }
            />
            Umbral 10.000€/año común UE superado
          </label>
        </div>
      </Section>

      {/* ─── Intrastat ─── */}
      <Section title="Intrastat" icon={<Truck size={18} />}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cfg.intrastat.thresholdIntroducciones}
              onChange={(e) =>
                updateIntrastat({ thresholdIntroducciones: e.target.checked })
              }
            />
            Umbral introducciones (compras UE) superado
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cfg.intrastat.thresholdExpediciones}
              onChange={(e) =>
                updateIntrastat({ thresholdExpediciones: e.target.checked })
              }
            />
            Umbral expediciones (ventas UE) superado
          </label>
          <Field label="Código TARIC por defecto (cartas TCG)">
            <input
              type="text"
              defaultValue={cfg.intrastat.defaultTaricCode ?? ""}
              onBlur={(e) =>
                updateIntrastat({
                  defaultTaricCode: e.target.value || undefined,
                })
              }
              placeholder="Ej. 49070090"
              className="input"
            />
          </Field>
        </div>
      </Section>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          height: 36px;
          padding: 0 10px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 13px;
          background: white;
        }
        :global(.input:focus) {
          outline: 2px solid #2563eb;
          outline-offset: -1px;
          border-color: transparent;
        }
        :global(.btn-add) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 32px;
          padding: 0 12px;
          background: #2563eb;
          color: white;
          font-size: 12px;
          font-weight: 600;
          border-radius: 8px;
        }
        :global(.btn-add:hover) {
          background: #1d4ed8;
        }
      `}</style>
    </div>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-800">
          <span className="text-[#2563eb]">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-medium text-gray-600">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}
