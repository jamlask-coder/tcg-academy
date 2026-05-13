"use client";
import { useState, useEffect } from "react";
import { Shield, Check, AlertTriangle, Store } from "lucide-react";
import {
  TPV_STORES,
  TPV_STORE_SLUGS,
  type TpvStoreSlug,
} from "@/config/tpvStores";
import { isTpvSuperUser } from "@/lib/tpvAccess";

type UserRole = "cliente" | "mayorista" | "tienda";

const STORAGE_KEY = "tcgacademy_user_role_overrides";
const STORE_STORAGE_KEY = "tcgacademy_user_tpv_store_overrides";

const ROLES: { value: UserRole; label: string; color: string; bg: string; desc: string }[] = [
  { value: "cliente",   label: "Cliente",    color: "#6b7280", bg: "#f3f4f6", desc: "Cliente particular" },
  { value: "mayorista", label: "Mayorista",  color: "#2563eb", bg: "#dbeafe", desc: "Distribuidor B2B" },
  { value: "tienda",    label: "Tienda TCG", color: "#16a34a", bg: "#dcfce7", desc: "Tienda asociada" },
];

function loadOverrides(): Record<string, UserRole> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function loadStoreOverrides(): Record<string, TpvStoreSlug> {
  try {
    return JSON.parse(localStorage.getItem(STORE_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

interface ConfirmDialogProps {
  from: (typeof ROLES)[number];
  to: (typeof ROLES)[number];
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ from, to, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Cambiar rol de usuario</h3>
            <p className="text-xs text-gray-500">Esta acción modifica el nivel de acceso del usuario</p>
          </div>
        </div>

        <div className="mb-5 rounded-xl bg-gray-50 p-4">
          <div className="flex items-center justify-center gap-3 text-sm">
            <span
              className="rounded-full px-3 py-1 font-bold"
              style={{ color: from.color, backgroundColor: from.bg }}
            >
              {from.label}
            </span>
            <span className="text-gray-400">→</span>
            <span
              className="rounded-full px-3 py-1 font-bold"
              style={{ color: to.color, backgroundColor: to.bg }}
            >
              {to.label}
            </span>
          </div>
          <p className="mt-3 text-center text-xs text-gray-500">
            El usuario pasará a ser <strong>{to.desc}</strong> a partir de su próxima sesión.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: to.color }}
          >
            Confirmar cambio
          </button>
        </div>
      </div>
    </div>
  );
}

interface StorePickerDialogProps {
  initial: TpvStoreSlug | null;
  /** Nombre del usuario para contexto visual */
  userLabel?: string;
  onConfirm: (slug: TpvStoreSlug) => void;
  onCancel: () => void;
}

/**
 * Modal de selección de tienda física. Obligatorio cuando se asigna rol
 * `tienda` a un usuario — un operador de tienda solo puede acceder al TPV
 * que se le indique aquí. No hay opción "todas las tiendas" porque los
 * super-usuarios se configuran por email en `TPV_SUPER_USER_EMAILS` (no
 * desde la UI admin).
 */
function StorePickerDialog({
  initial,
  userLabel,
  onConfirm,
  onCancel,
}: StorePickerDialogProps) {
  const [selected, setSelected] = useState<TpvStoreSlug | null>(initial);
  const stores = Object.values(TPV_STORES);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
            <Store size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Asignar tienda física</h3>
            <p className="text-xs text-gray-500">
              {userLabel
                ? `Selecciona la tienda a la que tendrá acceso ${userLabel}`
                : "Selecciona la tienda a la que tendrá acceso este usuario"}
            </p>
          </div>
        </div>

        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Cada usuario con rol <strong>Tienda</strong> solo puede entrar al TPV
          de la tienda seleccionada. Para cambiar de tienda más adelante,
          modifica esta asignación.
        </p>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stores.map((s) => {
            const active = selected === s.slug;
            return (
              <button
                key={s.slug}
                onClick={() => setSelected(s.slug)}
                className="flex flex-col items-center justify-center rounded-xl border-2 p-4 text-center transition"
                style={{
                  borderColor: active ? "#16a34a" : "#e5e7eb",
                  backgroundColor: active ? "#f0fdf4" : "#fff",
                }}
              >
                <span
                  className="text-xl font-black"
                  style={{ color: active ? "#16a34a" : "#374151" }}
                >
                  {s.invoiceSeriesPrefix}
                </span>
                <span className="mt-1 text-sm font-bold text-gray-800">
                  {s.name}
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
                  {s.sharesWebInvoicing ? "Comparte web" : "Independiente"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: "#16a34a" }}
          >
            Asignar tienda
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  userId: string;
  defaultRole: UserRole;
  /** Email del usuario — necesario para detectar super-usuarios TPV. */
  userEmail?: string;
  /** Nombre del usuario para mostrar en el modal de selección de tienda. */
  userLabel?: string;
  /** Tienda asignada al usuario (si ya tiene una). */
  defaultTpvStoreSlug?: TpvStoreSlug | null;
}

export function UserRoleManager({
  userId,
  defaultRole,
  userEmail,
  userLabel,
  defaultTpvStoreSlug,
}: Props) {
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [tpvStoreSlug, setTpvStoreSlug] = useState<TpvStoreSlug | null>(
    defaultTpvStoreSlug ?? null,
  );
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<UserRole | null>(null);
  const [pickingStoreFor, setPickingStoreFor] = useState<UserRole | null>(null);

  const isSuperUser = isTpvSuperUser(userEmail);

  useEffect(() => {
    const overrides = loadOverrides();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (overrides[userId]) setRole(overrides[userId]);
    const storeOverrides = loadStoreOverrides();
    if (storeOverrides[userId]) {
      setTpvStoreSlug(storeOverrides[userId]);
    }
  }, [userId]);

  function persistRole(nextRole: UserRole) {
    const overrides = loadOverrides();
    overrides[userId] = nextRole;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }

  function persistStoreSlug(slug: TpvStoreSlug | null) {
    const storeOverrides = loadStoreOverrides();
    if (slug) {
      storeOverrides[userId] = slug;
    } else {
      delete storeOverrides[userId];
    }
    localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(storeOverrides));
  }

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleChange(newRole: UserRole) {
    if (newRole === role) return;
    setPending(newRole);
  }

  function confirmChange() {
    if (!pending) return;
    const nextRole = pending;
    setPending(null);

    // Si pasa a `tienda` y NO es super-usuario, abrir picker de tienda.
    // Super-usuarios saltan este paso (acceso a todas igualmente).
    if (nextRole === "tienda" && !isSuperUser) {
      setPickingStoreFor(nextRole);
      return;
    }

    setRole(nextRole);
    persistRole(nextRole);
    // Si pasa a un rol distinto de `tienda`, limpiar asignación TPV stale.
    if (nextRole !== "tienda") {
      setTpvStoreSlug(null);
      persistStoreSlug(null);
    }
    flashSaved();
  }

  function cancelChange() {
    setPending(null);
  }

  function confirmStorePick(slug: TpvStoreSlug) {
    if (!pickingStoreFor) return;
    const nextRole = pickingStoreFor;
    setRole(nextRole);
    persistRole(nextRole);
    setTpvStoreSlug(slug);
    persistStoreSlug(slug);
    setPickingStoreFor(null);
    flashSaved();
  }

  function cancelStorePick() {
    // Si cancela la selección de tienda, NO aplicamos el cambio de rol.
    setPickingStoreFor(null);
  }

  function reopenStorePicker() {
    setPickingStoreFor("tienda");
  }

  const current = ROLES.find((r) => r.value === role) ?? ROLES[0];
  const pendingRole = ROLES.find((r) => r.value === pending);
  const assignedStore =
    tpvStoreSlug && (TPV_STORE_SLUGS as readonly string[]).includes(tpvStoreSlug)
      ? TPV_STORES[tpvStoreSlug]
      : null;

  return (
    <>
      {pending && pendingRole && (
        <ConfirmDialog
          from={current}
          to={pendingRole}
          onConfirm={confirmChange}
          onCancel={cancelChange}
        />
      )}

      {pickingStoreFor && (
        <StorePickerDialog
          initial={tpvStoreSlug}
          userLabel={userLabel}
          onConfirm={confirmStorePick}
          onCancel={cancelStorePick}
        />
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Shield size={15} className="text-[#2563eb]" />
          <h3 className="font-bold text-gray-900">Rol de usuario</h3>
          {saved && (
            <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-green-600">
              <Check size={12} /> Guardado
            </span>
          )}
        </div>

        <div className="space-y-2">
          {ROLES.map((r) => {
            const active = role === r.value;
            return (
              <button
                key={r.value}
                onClick={() => handleChange(r.value)}
                className="flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-sm transition"
                style={{
                  borderColor: active ? r.color : "#e5e7eb",
                  background: active ? r.bg : "#fff",
                }}
              >
                <div>
                  <span className="font-bold" style={{ color: active ? r.color : "#374151" }}>
                    {r.label}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">{r.desc}</span>
                </div>
                {active && <Check size={16} style={{ color: r.color }} className="flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {role === "tienda" && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3">
            <div className="flex items-center gap-2">
              <Store size={14} className="text-green-700" />
              <span className="text-xs font-bold text-green-900">
                Tienda asignada
              </span>
              {isSuperUser ? (
                <span className="ml-auto rounded-full bg-green-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-900">
                  Super-usuario
                </span>
              ) : null}
            </div>
            {isSuperUser ? (
              <p className="mt-1 text-xs text-green-900">
                Este usuario tiene acceso a <strong>todas las tiendas TPV</strong>
                {" "}por estar en la lista de super-usuarios.
              </p>
            ) : assignedStore ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-black text-green-900">
                    {assignedStore.name}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-green-700">
                    {assignedStore.invoiceSeriesPrefix} ·{" "}
                    {assignedStore.sharesWebInvoicing
                      ? "Comparte libro web"
                      : "Libro independiente"}
                  </div>
                </div>
                <button
                  onClick={reopenStorePicker}
                  className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-semibold text-green-800 transition hover:bg-green-100"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-amber-800">
                  Sin tienda asignada — el usuario no podrá entrar al TPV.
                </p>
                <button
                  onClick={reopenStorePicker}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-700"
                >
                  Asignar
                </button>
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-[11px] text-gray-400">
          El cambio de rol modifica el nivel de acceso del usuario y requiere confirmación.
        </p>
      </div>
    </>
  );
}
