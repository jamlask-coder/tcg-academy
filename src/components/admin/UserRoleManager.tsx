"use client";
import { useState, useEffect } from "react";
import { Shield, Check, AlertTriangle } from "lucide-react";

type UserRole = "cliente" | "mayorista" | "tienda";

const STORAGE_KEY = "tcgacademy_user_role_overrides";

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

interface Props {
  userId: string;
  defaultRole: UserRole;
}

export function UserRoleManager({ userId, defaultRole }: Props) {
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<UserRole | null>(null);

  useEffect(() => {
    const overrides = loadOverrides();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (overrides[userId]) setRole(overrides[userId]);
  }, [userId]);

  function handleChange(newRole: UserRole) {
    if (newRole === role) return;
    setPending(newRole);
  }

  function confirmChange() {
    if (!pending) return;
    setRole(pending);
    const overrides = loadOverrides();
    overrides[userId] = pending;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    setPending(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function cancelChange() {
    setPending(null);
  }

  const current = ROLES.find((r) => r.value === role) ?? ROLES[0];
  const pendingRole = ROLES.find((r) => r.value === pending);

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

        <p className="mt-3 text-[11px] text-gray-400">
          El cambio de rol modifica el nivel de acceso del usuario y requiere confirmación.
        </p>
      </div>
    </>
  );
}
