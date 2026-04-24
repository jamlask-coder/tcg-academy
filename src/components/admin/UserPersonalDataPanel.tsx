"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Pencil,
  Save,
  X,
  AlertTriangle,
  History,
  Lock,
  Info,
} from "lucide-react";
import type { User, Address, BillingInfo } from "@/types/user";
import {
  loadFullUser,
  loadUserChangelog,
  saveUserData,
  formatFieldLabel,
  type UserChangelogEntry,
} from "@/services/userAdminService";
import { loadInvoices } from "@/services/invoiceService";
import { validateSpanishNIF } from "@/lib/validations/nif";

interface UserPersonalDataPanelProps {
  userId: string;
}

type Mode = "collapsed" | "view" | "edit";

// Campo genérico reutilizable
function Field({
  label,
  value,
  editable,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      {editable ? (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
        />
      ) : (
        <div className="min-h-[36px] rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">
          {value || <span className="text-gray-400">—</span>}
        </div>
      )}
    </label>
  );
}

function ensureAddress(a?: Partial<Address>, fallbackId = `addr_${Date.now()}`): Address {
  return {
    id: a?.id ?? fallbackId,
    label: a?.label ?? "Dirección",
    nombre: a?.nombre ?? "",
    apellidos: a?.apellidos ?? "",
    calle: a?.calle ?? "",
    numero: a?.numero ?? "",
    piso: a?.piso ?? "",
    cp: a?.cp ?? "",
    ciudad: a?.ciudad ?? "",
    provincia: a?.provincia ?? "",
    pais: a?.pais ?? "España",
    telefono: a?.telefono ?? "",
    predeterminada: a?.predeterminada ?? false,
  };
}

function ensureBilling(b?: Partial<BillingInfo>): BillingInfo {
  return {
    nif: b?.nif ?? "",
    razonSocial: b?.razonSocial ?? "",
    calle: b?.calle ?? "",
    cp: b?.cp ?? "",
    ciudad: b?.ciudad ?? "",
    provincia: b?.provincia ?? "",
    pais: b?.pais ?? "España",
  };
}

export function UserPersonalDataPanel({ userId }: UserPersonalDataPanelProps) {
  const [mode, setMode] = useState<Mode>("collapsed");
  const [baseUser, setBaseUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<User | null>(null);
  const [changelog, setChangelog] = useState<UserChangelogEntry[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [invoiceCount, setInvoiceCount] = useState(0);

  // Carga inicial / refresh cuando cambia userId o al entrar en edit mode
  /* eslint-disable react-hooks/set-state-in-effect -- sync con localStorage (carga bajo demanda, pattern aceptado) */
  useEffect(() => {
    const user = loadFullUser(userId);
    if (user) {
      setBaseUser(user);
      setDraft(user);
    }
    setChangelog(loadUserChangelog(userId));

    // Cuenta de facturas asociadas — para avisar de inmutabilidad
    let count = 0;
    try {
      const all = loadInvoices();
      count = all.filter((inv) => {
        const r = inv.recipient as { email?: string; taxId?: string };
        if (user?.email && r.email && r.email.toLowerCase() === user.email.toLowerCase()) return true;
        if (user?.nif && r.taxId && r.taxId.toUpperCase() === user.nif.toUpperCase()) return true;
        return false;
      }).length;
    } catch {
      count = 0;
    }
    setInvoiceCount(count);
  }, [userId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const hasChanges = useMemo(() => {
    if (!baseUser || !draft) return false;
    return JSON.stringify(baseUser) !== JSON.stringify(draft);
  }, [baseUser, draft]);

  if (!baseUser || !draft) {
    // Renderiza solo los botones deshabilitados hasta que carga
    return (
      <div className="flex items-center gap-2">
        <button
          disabled
          className="flex h-9 items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white/60"
        >
          <Eye size={14} /> Ver datos personales
        </button>
      </div>
    );
  }

  const editing = mode === "edit";
  const expanded = mode === "view" || mode === "edit";

  function updateDraft(patch: Partial<User>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }
  function updateAddress(index: number, patch: Partial<Address>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const addresses = [...(prev.addresses ?? [])];
      addresses[index] = ensureAddress({ ...addresses[index], ...patch });
      return { ...prev, addresses };
    });
  }
  function addAddress() {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = ensureAddress({
        label: `Dirección ${(prev.addresses?.length ?? 0) + 1}`,
        predeterminada: (prev.addresses?.length ?? 0) === 0,
      });
      return { ...prev, addresses: [...(prev.addresses ?? []), next] };
    });
  }
  function removeAddress(index: number) {
    setDraft((prev) => {
      if (!prev) return prev;
      const addresses = [...(prev.addresses ?? [])];
      addresses.splice(index, 1);
      return { ...prev, addresses };
    });
  }
  function updateBilling(patch: Partial<BillingInfo>) {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, billing: ensureBilling({ ...prev.billing, ...patch }) };
    });
  }

  function handleSaveClick() {
    if (hasChanges) setShowConfirm(true);
  }
  function confirmSave() {
    if (!draft) return;
    // Validar NIF/NIE/CIF antes de persistir. `saveUserData` también lanza
    // como defensa de segunda capa, pero aquí damos feedback antes de llegar
    // al servicio — toast limpio en vez de excepción.
    const nifRaw = (draft.nif ?? "").trim();
    if (nifRaw) {
      const v = validateSpanishNIF(nifRaw);
      if (!v.valid) {
        setToast(`NIF/NIE/CIF no válido: ${v.error ?? "formato incorrecto"}`);
        setShowConfirm(false);
        setTimeout(() => setToast(null), 4000);
        return;
      }
    }
    const billingNifRaw = (draft.billing?.nif ?? "").trim();
    if (billingNifRaw) {
      const v = validateSpanishNIF(billingNifRaw);
      if (!v.valid) {
        setToast(`NIF facturación no válido: ${v.error ?? "formato incorrecto"}`);
        setShowConfirm(false);
        setTimeout(() => setToast(null), 4000);
        return;
      }
    }
    try {
      const changes = saveUserData(userId, draft);
      setBaseUser(draft);
      setChangelog(loadUserChangelog(userId));
      setMode("view");
      setShowConfirm(false);
      setToast(
        changes.length === 0
          ? "Sin cambios"
          : `${changes.length} ${changes.length === 1 ? "cambio guardado" : "cambios guardados"}`,
      );
      setTimeout(() => setToast(null), 3500);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Error guardando");
      setShowConfirm(false);
    }
  }
  function cancelEdit() {
    setDraft(baseUser);
    setMode("view");
  }

  const billing = draft.billing ?? ensureBilling();

  return (
    <>
      {/* ── Botones principales ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setMode(mode === "view" ? "collapsed" : "view")}
          aria-expanded={mode !== "collapsed"}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 text-xs font-semibold text-white transition hover:bg-[#1d4ed8]"
        >
          <Eye size={14} />
          {mode === "collapsed" ? "Ver datos personales" : "Ocultar datos"}
        </button>
        <button
          onClick={() => setMode("edit")}
          className={`flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold transition ${
            editing
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "border border-[#2563eb] bg-white text-[#2563eb] hover:bg-blue-50"
          }`}
        >
          <Pencil size={14} /> Editar datos
        </button>
      </div>

      {/* ── Panel expandido ── */}
      {expanded && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 text-gray-800">
          {/* Aviso: facturas inmutables */}
          {invoiceCount > 0 && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <Lock size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <strong>Facturas históricas congeladas.</strong> Este usuario tiene{" "}
                <strong>{invoiceCount}</strong>{" "}
                {invoiceCount === 1 ? "factura emitida" : "facturas emitidas"}. Los cambios que guardes{" "}
                <u>no modificarán</u> los datos ya impresos en esas facturas (requisito fiscal:
                art. 8 RD 1619/2012). Para corregir una factura histórica debes emitir una
                factura rectificativa.
              </div>
            </div>
          )}

          {/* Bloque 1 — Identidad */}
          <section className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
              Identidad
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Nombre" value={draft.name} editable={editing}
                onChange={(v) => updateDraft({ name: v })} />
              <Field label="Apellidos" value={draft.lastName} editable={editing}
                onChange={(v) => updateDraft({ lastName: v })} />
              <Field label="Username" value={draft.username ?? ""} editable={editing}
                onChange={(v) => updateDraft({ username: v || undefined })}
                placeholder="@handle" />
              <Field label="Email" type="email" value={draft.email} editable={editing}
                onChange={(v) => updateDraft({ email: v })} />
              <Field label="Teléfono" type="tel" value={draft.phone} editable={editing}
                onChange={(v) => updateDraft({ phone: v })} />
              <Field label="Fecha de nacimiento" type="date" value={draft.birthDate ?? ""} editable={editing}
                onChange={(v) => updateDraft({ birthDate: v || undefined })} />
              <Field label="NIF / NIE / CIF" value={draft.nif ?? ""} editable={editing}
                onChange={(v) => updateDraft({ nif: v ? v.toUpperCase() : undefined })} />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Género
                </span>
                {editing ? (
                  <select
                    value={draft.gender ?? ""}
                    onChange={(e) =>
                      updateDraft({
                        gender: (e.target.value as User["gender"]) || undefined,
                      })
                    }
                    className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
                  >
                    <option value="">—</option>
                    <option value="M">Varón</option>
                    <option value="F">Mujer</option>
                    <option value="X">Prefiero no decirlo</option>
                  </select>
                ) : (
                  <div className="min-h-[36px] rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">
                    {draft.gender === "M" ? "Varón"
                      : draft.gender === "F" ? "Mujer"
                      : draft.gender === "X" ? "Prefiero no decirlo"
                      : <span className="text-gray-400">—</span>}
                  </div>
                )}
              </label>
              <Field label="Rol" value={draft.role} editable={false} onChange={() => {}} />
            </div>
            {editing && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
                <Info size={12} /> El rol se cambia desde el gestor de roles (panel inferior).
              </p>
            )}
          </section>

          {/* Bloque 2 — Direcciones */}
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Direcciones</h3>
              {editing && (
                <button
                  onClick={addAddress}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-[#2563eb] transition hover:bg-blue-50"
                >
                  + Añadir dirección
                </button>
              )}
            </div>
            {(draft.addresses ?? []).length === 0 ? (
              <p className="text-xs text-gray-400">Sin direcciones registradas.</p>
            ) : (
              <div className="space-y-4">
                {(draft.addresses ?? []).map((addr, i) => (
                  <div key={addr.id ?? i} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-600">
                        #{i + 1} · {addr.label || "Dirección"}
                        {addr.predeterminada && (
                          <span className="ml-2 rounded-full bg-[#2563eb] px-2 py-0.5 text-[10px] text-white">
                            Predeterminada
                          </span>
                        )}
                      </span>
                      {editing && (
                        <button
                          onClick={() => removeAddress(i)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                          aria-label={`Eliminar dirección ${i + 1}`}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Etiqueta" value={addr.label} editable={editing}
                        onChange={(v) => updateAddress(i, { label: v })} />
                      <Field label="Nombre" value={addr.nombre ?? ""} editable={editing}
                        onChange={(v) => updateAddress(i, { nombre: v })} />
                      <Field label="Apellidos" value={addr.apellidos ?? ""} editable={editing}
                        onChange={(v) => updateAddress(i, { apellidos: v })} />
                      <Field label="Calle" value={addr.calle} editable={editing}
                        onChange={(v) => updateAddress(i, { calle: v })} />
                      <Field label="Número" value={addr.numero} editable={editing}
                        onChange={(v) => updateAddress(i, { numero: v })} />
                      <Field label="Piso / Puerta" value={addr.piso ?? ""} editable={editing}
                        onChange={(v) => updateAddress(i, { piso: v })} />
                      <Field label="Código postal" value={addr.cp} editable={editing}
                        onChange={(v) => updateAddress(i, { cp: v })} />
                      <Field label="Ciudad" value={addr.ciudad} editable={editing}
                        onChange={(v) => updateAddress(i, { ciudad: v })} />
                      <Field label="Provincia" value={addr.provincia} editable={editing}
                        onChange={(v) => updateAddress(i, { provincia: v })} />
                      <Field label="País" value={addr.pais} editable={editing}
                        onChange={(v) => updateAddress(i, { pais: v })} />
                      <Field label="Teléfono" value={addr.telefono ?? ""} editable={editing}
                        onChange={(v) => updateAddress(i, { telefono: v })} />
                      {editing && (
                        <label className="flex items-center gap-2 pt-5 text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={addr.predeterminada}
                            onChange={(e) => {
                              // Solo una puede ser predeterminada
                              if (e.target.checked) {
                                setDraft((prev) => {
                                  if (!prev) return prev;
                                  const addresses = (prev.addresses ?? []).map((x, idx) => ({
                                    ...x,
                                    predeterminada: idx === i,
                                  }));
                                  return { ...prev, addresses };
                                });
                              } else {
                                updateAddress(i, { predeterminada: false });
                              }
                            }}
                            className="accent-[#2563eb]"
                          />
                          Predeterminada
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Bloque 3 — Datos de facturación */}
          <section className="mb-6">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Datos de facturación</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="NIF / CIF facturación" value={billing.nif} editable={editing}
                onChange={(v) => updateBilling({ nif: v.toUpperCase() })} />
              <Field label="Razón social" value={billing.razonSocial ?? ""} editable={editing}
                onChange={(v) => updateBilling({ razonSocial: v })} />
              <Field label="Calle" value={billing.calle} editable={editing}
                onChange={(v) => updateBilling({ calle: v })} />
              <Field label="Código postal" value={billing.cp} editable={editing}
                onChange={(v) => updateBilling({ cp: v })} />
              <Field label="Ciudad" value={billing.ciudad} editable={editing}
                onChange={(v) => updateBilling({ ciudad: v })} />
              <Field label="Provincia" value={billing.provincia} editable={editing}
                onChange={(v) => updateBilling({ provincia: v })} />
              <Field label="País" value={billing.pais} editable={editing}
                onChange={(v) => updateBilling({ pais: v })} />
            </div>
          </section>

          {/* Bloque 4 — Empresa (B2B) */}
          {draft.empresa && (
            <section className="mb-6">
              <h3 className="mb-3 text-sm font-bold text-gray-900">Empresa (B2B)</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="CIF" value={draft.empresa.cif} editable={editing}
                  onChange={(v) => draft.empresa && updateDraft({ empresa: { ...draft.empresa, cif: v.toUpperCase() } })} />
                <Field label="Razón social" value={draft.empresa.razonSocial} editable={editing}
                  onChange={(v) => draft.empresa && updateDraft({ empresa: { ...draft.empresa, razonSocial: v } })} />
                <Field label="Dirección fiscal" value={draft.empresa.direccionFiscal} editable={editing}
                  onChange={(v) => draft.empresa && updateDraft({ empresa: { ...draft.empresa, direccionFiscal: v } })} />
                <Field label="Persona contacto" value={draft.empresa.personaContacto} editable={editing}
                  onChange={(v) => draft.empresa && updateDraft({ empresa: { ...draft.empresa, personaContacto: v } })} />
                <Field label="Teléfono empresa" value={draft.empresa.telefonoEmpresa} editable={editing}
                  onChange={(v) => draft.empresa && updateDraft({ empresa: { ...draft.empresa, telefonoEmpresa: v } })} />
                <Field label="Email facturación" value={draft.empresa.emailFacturacion} editable={editing}
                  onChange={(v) => draft.empresa && updateDraft({ empresa: { ...draft.empresa, emailFacturacion: v } })} />
              </div>
            </section>
          )}

          {/* ── Acciones del modo edición ── */}
          {editing && (
            <div className="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-gray-200 bg-white/90 p-3 shadow-sm backdrop-blur">
              <span className="mr-auto text-xs text-gray-500">
                {hasChanges ? "Hay cambios sin guardar" : "Sin cambios"}
              </span>
              <button
                onClick={cancelEdit}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <X size={14} /> Cancelar
              </button>
              <button
                onClick={handleSaveClick}
                disabled={!hasChanges}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 text-xs font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save size={14} /> Guardar
              </button>
            </div>
          )}

          {/* ── Historial de cambios ── */}
          <section className="mt-8 border-t border-gray-100 pt-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
              <History size={14} className="text-gray-400" />
              Historial de cambios ({changelog.length})
            </h3>
            {changelog.length === 0 ? (
              <p className="text-xs text-gray-400">
                Aún no se han registrado cambios sobre este usuario.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-left text-[10px] uppercase text-gray-500">
                      <th className="px-3 py-2 font-semibold">Fecha</th>
                      <th className="px-3 py-2 font-semibold">Campo</th>
                      <th className="px-3 py-2 font-semibold">Antes</th>
                      <th className="px-3 py-2 font-semibold">Después</th>
                      <th className="px-3 py-2 font-semibold">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {changelog.map((e, i) => (
                      <tr key={`${e.timestamp}-${e.field}-${i}`} className="bg-white">
                        <td className="px-3 py-2 font-mono text-[11px] text-gray-500">
                          {new Date(e.timestamp).toLocaleString("es-ES")}
                        </td>
                        <td className="px-3 py-2 font-semibold text-gray-700">
                          {formatFieldLabel(e.field)}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          <span className="block max-w-[240px] truncate" title={e.oldValue ?? ""}>
                            {e.oldValue ?? <em className="text-gray-300">(vacío)</em>}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          <span className="block max-w-[240px] truncate" title={e.newValue ?? ""}>
                            {e.newValue ?? <em className="text-gray-300">(vacío)</em>}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{e.adminId ?? "admin"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Modal confirmación ── */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 id="confirm-title" className="font-bold text-gray-900">
                  ¿Desea guardar los datos?
                </h3>
                <p className="text-xs text-gray-500">
                  Esta acción quedará registrada en el historial del usuario.
                </p>
              </div>
            </div>
            {invoiceCount > 0 && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Recuerda: las {invoiceCount} {invoiceCount === 1 ? "factura ya emitida" : "facturas ya emitidas"}{" "}
                de este usuario <strong>no se modificarán</strong>. Los cambios se aplicarán a partir de
                ahora.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSave}
                className="h-9 rounded-lg bg-[#2563eb] px-4 text-xs font-semibold text-white transition hover:bg-[#1d4ed8]"
              >
                Sí, guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </>
  );
}
