"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ensureReferralCode,
  loadPoints,
  getAssociations,
  getMyPointsAttribution,
  getPointsHistory,
  pointsToEuros,
  MAX_ASSOCIATIONS,
  REFERRAL_ASSOC_PTS_PER_100,
  POINTS_PER_EURO,
  type AssociationRecord,
  type HistoryEntry,
} from "@/services/pointsService";
import {
  sendInvitation,
  acceptInvitation,
  declineInvitation,
  getPendingInvitationsFor,
  getSentInvitationsFrom,
  removeAssociation,
  canChangeAssociation,
  getUserDisplayInfo,
  ASSOC_CHANGE_COOLDOWN_MS,
  type AssocInvitation,
} from "@/services/associationService";
import {
  Users,
  Check,
  Info,
  ShoppingCart,
  UserPlus,
  X,
  Clock,
  AlertTriangle,
  Trash2,
  Bell,
  RotateCcw,
  TrendingUp,
  ArrowDown,
  Trophy,
  Medal,
} from "lucide-react";
import Link from "next/link";
import { AccountTabs } from "@/components/cuenta/AccountTabs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Custom 4-people icon (lucide has max 3 — Users/UsersRound show 2 silhouettes).
function FourUsersIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* 4 heads in a 2×2 layout */}
      <circle cx="7" cy="7" r="2.2" />
      <circle cx="17" cy="7" r="2.2" />
      <circle cx="7" cy="16" r="2.2" />
      <circle cx="17" cy="16" r="2.2" />
      {/* Shoulder arcs */}
      <path d="M3 12c0-1.5 1.8-2.5 4-2.5s4 1 4 2.5" />
      <path d="M13 12c0-1.5 1.8-2.5 4-2.5s4 1 4 2.5" />
      <path d="M3 21c0-1.5 1.8-2.5 4-2.5s4 1 4 2.5" />
      <path d="M13 21c0-1.5 1.8-2.5 4-2.5s4 1 4 2.5" />
    </svg>
  );
}

const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#16a34a", "#e11d48"];

function avatarBg(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  initials,
  color,
  size = 44,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full font-black text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </div>
  );
}

// ─── Invite modal ─────────────────────────────────────────────────────────────

function InviteModal({
  userId,
  onClose,
  onSent,
}: {
  userId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSend = () => {
    setErrMsg(""); setOkMsg("");
    if (!query.trim()) return;
    setBusy(true);
    const result = sendInvitation(userId, query.trim());
    setBusy(false);
    if (result.ok) {
      setOkMsg("Invitación enviada. El otro usuario deberá aceptarla.");
      setQuery("");
      onSent();
      setTimeout(onClose, 2000);
    } else {
      setErrMsg(result.error ?? "Error al enviar");
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Invitar al grupo</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-500">
          Introduce el <strong>correo electrónico</strong> o el{" "}
          <strong>nombre de usuario</strong> de la persona que quieres añadir a tu grupo.
          Recibirá una invitación que deberá aceptar.
        </p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="correo@ejemplo.com o @usuario"
          autoFocus
          className="mb-3 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm placeholder-gray-300 focus:border-[#2563eb] focus:outline-none"
        />

        {errMsg && (
          <p className="mb-2 flex items-center gap-1 text-xs text-red-500">
            <AlertTriangle size={11} /> {errMsg}
          </p>
        )}
        {okMsg && (
          <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-green-600">
            <Check size={12} /> {okMsg}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={busy || !query.trim()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2563eb] py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            <UserPlus size={15} />
            {busy ? "Enviando…" : "Enviar invitación"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pending invitation card ──────────────────────────────────────────────────

function PendingInviteCard({
  invite,
  userId,
  onUpdate,
}: {
  invite: AssocInvitation;
  userId: string;
  onUpdate: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const info = getUserDisplayInfo(invite.fromUserId);
  // eslint-disable-next-line react-hooks/purity
  const hoursAgo = Math.floor((Date.now() - invite.sentAt) / (60 * 60 * 1000));

  const handle = (accept: boolean) => {
    setBusy(true);
    const result = accept
      ? acceptInvitation(invite.id, userId)
      : declineInvitation(invite.id, userId);
    setBusy(false);
    if (!result.ok) setErrMsg(result.error ?? "Error");
    else onUpdate();
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <Avatar initials={info.initials} color="#f59e0b" size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-gray-900">{info.name}</p>
        {info.username && (
          <p className="text-[10px] text-gray-400">@{info.username}</p>
        )}
        <p className="text-[10px] text-gray-500">
          Hace {hoursAgo < 1 ? "menos de 1 h" : `${hoursAgo} h`}
        </p>
        {errMsg && <p className="text-[10px] text-red-500">{errMsg}</p>}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handle(true)}
          disabled={busy}
          aria-label="Aceptar invitación"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500 text-white transition hover:bg-green-400 disabled:opacity-50"
        >
          <Check size={16} />
        </button>
        <button
          onClick={() => handle(false)}
          disabled={busy}
          aria-label="Rechazar invitación"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-200 text-gray-600 transition hover:bg-gray-300 disabled:opacity-50"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Donut chart — % contribution per member ──────────────────────────────────

function DonutChart({
  segments,
  centerLabel,
}: {
  segments: { label: string; pts: number; color: string }[];
  centerLabel: string;
}) {
  const r = 50;
  const cx = 64;
  const cy = 64;
  const strokeWidth = 16;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.pts, 0);

  const segs = segments.map((seg, i) => {
    const pct = total > 0 ? seg.pts / total : 0;
    const len = pct * circ;
    const prevAcc = segments
      .slice(0, i)
      .reduce((s, x) => s + (total > 0 ? x.pts / total : 0) * circ, 0);
    const offset = circ - prevAcc;
    return { ...seg, pct, len, offset };
  });

  if (total === 0) return null;

  return (
    <div className="flex items-center gap-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="relative flex-shrink-0">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
            {segs.map((s, i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${s.len} ${circ - s.len}`}
                strokeDashoffset={s.offset}
              />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">grupo</p>
          <p className="text-sm font-black leading-tight text-gray-900">{centerLabel}</p>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
          % aportado al grupo
        </p>
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-700">
              {s.label}
            </span>
            <span className="text-xs font-black tabular-nums" style={{ color: s.color }}>
              {Math.round(s.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Points attribution table ─────────────────────────────────────────────────

function PointsTable({
  associations,
  attribution,
  history,
}: {
  associations: AssociationRecord[];
  attribution: Record<string, number>;
  history: HistoryEntry[];
}) {
  // Snapshot del "ahora" en montaje (para cálculo de pendientes/madurados sin
  // violar react-hooks/purity). Se refresca cada vez que el padre re-renderiza
  // por DataHub events.
  const [nowTs] = useState(() => Date.now());
  const totalFromAssocs = Object.values(attribution).reduce((s, v) => s + v, 0);
  const assocHistory = history.filter((h) => h.type === "asociacion" || h.type === "devolucion");

  const HISTORY_TYPE_CFG: Record<string, { label: string; color: string }> = {
    compra:     { label: "Compra propia",   color: "#2563eb" },
    devolucion: { label: "Devolución",      color: "#dc2626" },
    bienvenida: { label: "Bienvenida",      color: "#16a34a" },
    asociacion: { label: "Del grupo",        color: "#16a34a" },
  };

  return (
    <div className="space-y-4">
      {/* Attribution per associate */}
      {associations.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {/* Header with total */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-green-50 px-5 py-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total recibido del grupo</p>
              <p className="mt-0.5 text-2xl font-black text-green-600">
                +{totalFromAssocs} pts
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Equivalencia en descuento</p>
              <p className="text-2xl font-black text-green-700">
                €{(totalFromAssocs / 100).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Donut chart */}
          {totalFromAssocs > 0 && (
            <div className="border-b border-gray-100 px-5 py-4">
              <DonutChart
                segments={associations.map((assoc, i) => ({
                  label: getUserDisplayInfo(assoc.referrerId).name,
                  pts: attribution[assoc.referrerId] ?? 0,
                  color: avatarBg(i),
                }))}
                centerLabel={`${totalFromAssocs} pts`}
              />
            </div>
          )}

          {/* Per member rows */}
          <div className="divide-y divide-gray-50">
            {associations.map((assoc, i) => {
              const info = getUserDisplayInfo(assoc.referrerId);
              const pts = attribution[assoc.referrerId] ?? 0;
              const euros = pointsToEuros(pts);
              const pct = totalFromAssocs > 0 ? (pts / totalFromAssocs) * 100 : 0;
              return (
                <div key={assoc.referrerId} className="flex items-center gap-3 px-5 py-4">
                  <Avatar initials={info.initials} color={avatarBg(i)} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800">{info.name}</p>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-green-400 transition-all"
                        style={{ width: `${Math.max(pts > 0 ? 4 : 0, Math.min(100, pct))}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-2 text-right">
                    {pts > 0 ? (
                      <>
                        <p className="text-base font-black text-green-600">+{pts} pts</p>
                        <p className="text-sm font-bold text-green-700">= €{euros.toFixed(2)}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-300">0 pts</p>
                        <p className="text-xs text-gray-300">= €0.00</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {totalFromAssocs === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">
                Cuando los miembros de tu grupo compren, verás aquí los puntos que te generan.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recent history */}
      {assocHistory.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3.5">
            <h3 className="font-bold text-gray-900">Historial reciente de puntos</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {assocHistory.slice(0, 10).map((entry) => {
              const cfg = HISTORY_TYPE_CFG[entry.type] ?? { label: entry.type, color: "#6b7280" };
              const sourceInfo = entry.sourceUserId
                ? getUserDisplayInfo(entry.sourceUserId)
                : null;
              const isPending =
                entry.type === "asociacion" &&
                typeof entry.availableAt === "number" &&
                !entry.released &&
                !entry.cancelled &&
                entry.availableAt > nowTs;
              const isCancelled = entry.cancelled === true;
              return (
                <div key={entry.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-800">
                      {sourceInfo ? sourceInfo.name : entry.desc}
                    </p>
                    <p className="text-[10px] text-gray-400">{formatDateTime(entry.ts)}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    {isPending && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Pendiente
                      </span>
                    )}
                    {isCancelled && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                        Anulado
                      </span>
                    )}
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ color: cfg.color, backgroundColor: `${cfg.color}15` }}
                    >
                      {cfg.label}
                    </span>
                    <span
                      className={`font-black ${
                        isCancelled
                          ? "text-gray-400 line-through"
                          : isPending
                          ? "text-amber-600"
                          : entry.pts < 0
                          ? "text-red-500"
                          : "text-green-600"
                      }`}
                    >
                      {entry.pts > 0 ? "+" : ""}{entry.pts}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ranking (points generated by each group member) ─────────────────────────

function GroupRanking({
  associations,
  attribution,
}: {
  associations: AssociationRecord[];
  attribution: Record<string, number>;
}) {
  const rows = associations
    .map((assoc) => ({
      referrerId: assoc.referrerId,
      info: getUserDisplayInfo(assoc.referrerId),
      pts: attribution[assoc.referrerId] ?? 0,
    }))
    .sort((a, b) => b.pts - a.pts);

  const total = rows.reduce((s, r) => s + r.pts, 0);

  const POSITION_STYLES: Record<number, { bg: string; border: string; text: string; icon: React.ElementType; medalColor: string; label: string }> = {
    0: { bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-600", icon: Trophy, medalColor: "#f59e0b", label: "1º" },
    1: { bg: "bg-gray-50",   border: "border-gray-300",   text: "text-gray-500",  icon: Medal,  medalColor: "#9ca3af", label: "2º" },
    2: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-600",icon: Medal,  medalColor: "#c2410c", label: "3º" },
  };

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
        <Trophy size={18} className="text-amber-500" /> Ranking de tu grupo
      </h2>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Puntos que te ha generado cada miembro
          </p>
          <p className="text-sm font-black text-green-600">
            +{total.toLocaleString("es-ES")} pts
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {rows.map((row, i) => {
            const style = POSITION_STYLES[i] ?? {
              bg: "bg-white",
              border: "border-gray-200",
              text: "text-gray-400",
              icon: Medal,
              medalColor: "#d1d5db",
              label: `${i + 1}º`,
            };
            const Icon = style.icon;
            const euros = pointsToEuros(row.pts);
            const pct = total > 0 ? (row.pts / total) * 100 : 0;
            return (
              <div
                key={row.referrerId}
                className="flex items-center gap-3 px-5 py-3.5"
              >
                {/* Position badge */}
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 ${style.border} ${style.bg}`}
                >
                  <Icon size={15} style={{ color: style.medalColor }} />
                </div>
                <span className={`w-5 flex-shrink-0 text-sm font-black ${style.text}`}>
                  {style.label}
                </span>

                {/* Avatar + name + bar */}
                <Avatar initials={row.info.initials} color={avatarBg(associations.findIndex((a) => a.referrerId === row.referrerId))} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {row.info.name}
                  </p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${Math.max(row.pts > 0 ? 4 : 0, Math.min(100, pct))}%` }}
                    />
                  </div>
                </div>

                {/* Points */}
                <div className="ml-2 flex-shrink-0 text-right">
                  {row.pts > 0 ? (
                    <>
                      <p className="text-sm font-black text-green-600">
                        +{row.pts.toLocaleString("es-ES")}
                      </p>
                      <p className="text-[10px] font-bold text-green-700">
                        = €{euros.toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-300">0 pts</p>
                      <p className="text-[10px] text-gray-300">= €0,00</p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Visual organigram (group structure) ─────────────────────────────────────

function OrgNode({
  assoc,
  index,
  pts,
  userId,
  cooldownOk,
  cooldownNextAt,
  onUpdate,
}: {
  assoc: AssociationRecord;
  index: number;
  pts: number;
  userId: string;
  cooldownOk: boolean;
  cooldownNextAt: number | null;
  onUpdate: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const info = getUserDisplayInfo(assoc.referrerId);
  const daysLeft = cooldownNextAt
    // eslint-disable-next-line react-hooks/purity
    ? Math.ceil((cooldownNextAt - Date.now()) / (24 * 60 * 60 * 1000))
    : 0;

  const handleRemove = () => {
    const result = removeAssociation(userId, assoc.referrerId);
    if (!result.ok) {
      setErrMsg(result.error ?? "Error");
      setConfirm(false);
    } else {
      onUpdate();
    }
  };

  return (
    <div
      className="relative flex flex-col items-center rounded-2xl border-2 border-green-200 bg-green-50 p-3 text-center"
      style={{ minWidth: 90 }}
    >
      {/* Remove button */}
      {!confirm ? (
        <button
          onClick={() => {
            if (!cooldownOk) {
              setErrMsg(
                `Espera ${daysLeft} día${daysLeft !== 1 ? "s" : ""} para cambiar`,
              );
              return;
            }
            setConfirm(true);
          }}
          aria-label={`Eliminar a ${info.name} del grupo`}
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-gray-300 transition hover:bg-red-100 hover:text-red-400"
        >
          <Trash2 size={11} />
        </button>
      ) : (
        <div className="absolute right-1 top-1 flex gap-0.5">
          <button
            onClick={handleRemove}
            className="rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white"
          >
            OK
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      <Avatar initials={info.initials} color={avatarBg(index)} size={40} />
      <p className="mt-1.5 text-[11px] font-bold text-gray-800 leading-tight">
        {info.name}
      </p>
      <div className="mt-1.5 rounded-lg bg-white px-2 py-1 shadow-sm">
        <p className="text-[9px] text-gray-400">Generado</p>
        <p className="font-black text-green-600 text-sm">+{pts}</p>
        <p className="text-[9px] text-green-500">pts</p>
      </div>
      {errMsg && (
        <p className="mt-1 text-[9px] text-red-500 leading-tight">{errMsg}</p>
      )}
    </div>
  );
}

function GroupOrganigram({
  associations,
  attribution,
  userId,
  cooldownOk,
  cooldownNextAt,
  onAdd,
  onUpdate,
}: {
  associations: AssociationRecord[];
  attribution: Record<string, number>;
  userId: string;
  cooldownOk: boolean;
  cooldownNextAt: number | null;
  onAdd?: () => void;
  onUpdate: () => void;
}) {
  const totalPts = Object.values(attribution).reduce((s, v) => s + v, 0);

  return (
    <div className="flex flex-col items-center py-2">
      {/* Me */}
      <div className="flex flex-col items-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#2563eb] bg-[#2563eb] text-lg font-black text-white shadow-lg">
          YO
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-black text-white">
            TÚ
          </span>
        </div>
        {totalPts > 0 && (
          <span className="mt-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold text-green-700">
            +{totalPts} pts de la red
          </span>
        )}
      </div>

      {/* Connector */}
      <div className="my-3 flex flex-col items-center gap-1">
        <div className="h-6 w-0.5 bg-gray-300" />
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-semibold text-gray-400">
          {associations.length} miembro{associations.length !== 1 ? "s" : ""}
          {" · "}máximo {MAX_ASSOCIATIONS}
        </span>
        <div className="h-3 w-0.5 bg-gray-300" />
      </div>

      {/* Members + empty slots */}
      <div className="flex flex-wrap justify-center gap-3">
        {associations.map((assoc, i) => (
          <OrgNode
            key={assoc.referrerId}
            assoc={assoc}
            index={i}
            pts={attribution[assoc.referrerId] ?? 0}
            userId={userId}
            cooldownOk={cooldownOk}
            cooldownNextAt={cooldownNextAt}
            onUpdate={onUpdate}
          />
        ))}
        {Array.from({ length: MAX_ASSOCIATIONS - associations.length }).map((_, i) => (
          <button
            key={`empty-${i}`}
            onClick={onAdd}
            disabled={!onAdd}
            aria-label="Añadir asociado"
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-3 text-center transition hover:border-[#2563eb] hover:bg-blue-50 disabled:cursor-default disabled:hover:border-gray-200 disabled:hover:bg-gray-50"
            style={{ minWidth: 90, minHeight: 110 }}
          >
            <UserPlus size={20} className="mx-auto text-gray-400" />
            <p className="mt-1 text-[10px] font-semibold text-gray-400">Añadir</p>
          </button>
        ))}
      </div>

      {/* Cooldown notice */}
      {!cooldownOk && (
        <p className="mt-3 flex items-center gap-1 text-[10px] text-amber-600">
          <Clock size={10} />
          Puedes cambiar una asociación en{" "}
          {cooldownNextAt
            // eslint-disable-next-line react-hooks/purity
            ? Math.ceil((cooldownNextAt - Date.now()) / (24 * 60 * 60 * 1000))
            : 0}{" "}
          días (1 cambio cada 2 meses)
        </p>
      )}
    </div>
  );
}

// ─── How it works (explainer with croquis) ────────────────────────────────────

function HowItWorks() {
  const examples = [25, 50, 100, 200];

  return (
    <div className="space-y-5">
      {/* Flow diagram: "when someone buys" */}
      <div className="overflow-hidden rounded-2xl border-2 border-[#2563eb] bg-gradient-to-br from-blue-50 to-green-50">
        <div className="bg-[#2563eb] px-5 py-3">
          <p className="font-bold text-white text-sm">
            Ejemplo: Carlos (miembro de tu grupo) compra €100
          </p>
        </div>
        <div className="p-5">
          {/* Buyer */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-black text-white shadow">
              CL
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900">Carlos compra €100</p>
              <p className="text-xs text-gray-500">Recibe 100 pts/€1 = 10.000 pts (= €1)</p>
            </div>
            <div className="rounded-xl bg-[#2563eb] px-3 py-1.5 text-center">
              <p className="text-xl font-black text-white">+10.000</p>
              <p className="text-[10px] text-blue-200">pts = €1</p>
            </div>
          </div>

          {/* Arrow */}
          <div className="my-3 flex items-center gap-3 pl-3">
            <ArrowDown size={20} className="flex-shrink-0 text-gray-400" />
            <div>
              <p className="text-[11px] font-semibold text-gray-500">
                Distribuye automáticamente a su grupo (hasta {MAX_ASSOCIATIONS} personas)
              </p>
              <p className="text-[10px] text-gray-400">5.000 pts por cada €100 → 5.000 pts para cada asociado</p>
            </div>
          </div>

          {/* Associates receive */}
          <div className="grid grid-cols-3 gap-2">
            {["TÚ", "Ana", "Luis"].map((name) => (
              <div
                key={name}
                className="flex min-w-0 flex-col items-center rounded-xl border-2 border-green-300 bg-green-50 px-2 py-2 text-center"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-xs font-black text-white">
                  {name[0]}
                </div>
                <p className="mt-1 text-[10px] font-bold text-gray-700">{name}</p>
                <div className="mt-1 rounded-lg bg-white px-2 py-0.5 shadow-sm">
                  <p className="font-black text-green-600 text-base">+5.000</p>
                  <p className="text-[9px] text-gray-400">pts = €0,50</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rates table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="font-bold text-gray-900">Tabla de puntos por compra</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">
                  Importe compra
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-bold text-[#2563eb] uppercase">
                  Comprador gana
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-bold text-green-600 uppercase">
                  Cada asociado gana
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {examples.map((amt) => {
                const buyerPts = amt * POINTS_PER_EURO;
                const assocPts = Math.floor(amt * REFERRAL_ASSOC_PTS_PER_100 / 100);
                return (
                  <tr key={amt} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">€{amt}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-black text-[#2563eb]">+{buyerPts.toLocaleString("es-ES")} pts</span>
                      <span className="ml-1.5 text-[11px] text-gray-400">= €{pointsToEuros(buyerPts).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-black text-green-600">+{assocPts.toLocaleString("es-ES")} pts</span>
                      <span className="ml-1.5 text-[11px] text-gray-400">= €{pointsToEuros(assocPts).toFixed(2)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 text-xs text-gray-500">
          <strong>Regla de oro:</strong> comprador gana 100 pts por €1 · cada asociado gana 5.000 pts por cada €100 (= €0,50) · canje 10.000 pts = €1 de descuento
        </div>
      </div>

      {/* Return policy */}
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
        <RotateCcw size={18} className="mt-0.5 flex-shrink-0 text-red-400" />
        <div>
          <p className="font-semibold text-red-700">Devoluciones</p>
          <p className="mt-0.5 text-sm text-red-600">
            Si devuelves un pedido, los puntos generados por esa compra se descuentan
            automáticamente — tanto los del comprador como los de sus asociados.
          </p>
        </div>
      </div>

    </div>
  );
}

// ─── Rules section ────────────────────────────────────────────────────────────

function Rules() {
  const cooldownDays = Math.round(ASSOC_CHANGE_COOLDOWN_MS / (24 * 60 * 60 * 1000));
  const items = [
    {
      icon: Users,
      color: "#2563eb",
      title: `Máximo ${MAX_ASSOCIATIONS} miembros`,
      desc: `Tu grupo puede tener hasta ${MAX_ASSOCIATIONS} personas. Los primeros en aceptar tu invitación ocupan los huecos disponibles.`,
    },
    {
      icon: Clock,
      color: "#f59e0b",
      title: `1 cambio de miembro cada ${cooldownDays} días`,
      desc: `Para evitar abusos, solo puedes eliminar o añadir 1 miembro cada ${cooldownDays} días (2 meses). Elige bien desde el principio.`,
    },
    {
      icon: RotateCcw,
      color: "#dc2626",
      title: "Puntos y devoluciones",
      desc: "Si se devuelve una compra, los puntos que generó esa compra —tanto para el comprador como para los miembros del grupo— se descuentan automáticamente.",
    },
    {
      icon: TrendingUp,
      color: "#7c3aed",
      title: "Puntos acumulables",
      desc: "Los puntos no tienen fecha límite mientras haya actividad. Se canjean como descuento en el paso de pago al finalizar la compra.",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ icon: Icon, color, title, desc }) => (
        <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div
            className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}18` }}
          >
            <Icon size={18} style={{ color }} />
          </div>
          <p className="font-bold text-gray-900">{title}</p>
          <p className="mt-1 text-sm text-gray-500">{desc}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageState {
  points: number;
  associations: AssociationRecord[];
  attribution: Record<string, number>;
  history: HistoryEntry[];
  pendingInvites: AssocInvitation[];
  sentInvites: AssocInvitation[];
  cooldownOk: boolean;
  cooldownNextAt: number | null;
}

export default function AsociacionesPage() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [state, setState] = useState<PageState>({
    points: 0,
    associations: [],
    attribution: {},
    history: [],
    pendingInvites: [],
    sentInvites: [],
    cooldownOk: true,
    cooldownNextAt: null,
  });

  const refresh = useCallback(() => {
    if (!user) return;
    const coolcheck = canChangeAssociation(user.id);
    ensureReferralCode(user.id); // ensures the code exists for invitation flow
    setState({
      points: loadPoints(user.id),
      associations: getAssociations(user.id),
      attribution: getMyPointsAttribution(user.id),
      history: getPointsHistory(user.id),
      pendingInvites: getPendingInvitationsFor(user.id),
      sentInvites: getSentInvitationsFrom(user.id),
      cooldownOk: coolcheck.ok,
      cooldownNextAt: coolcheck.nextAt,
    });
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const handler = () => refresh();
    window.addEventListener("tcga:assoc:updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("tcga:assoc:updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  if (!user || user.role !== "cliente") {
    return (
      <div>
        <AccountTabs group="recompensas" />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Users size={40} className="mx-auto mb-3 text-amber-400" />
          <p className="font-semibold text-amber-700">
            El programa de grupos es exclusivo para cuentas de cliente.
          </p>
        </div>
      </div>
    );
  }

  const {
    points, associations, attribution, history,
    pendingInvites, cooldownOk, cooldownNextAt,
  } = state;

  const slotsLeft = MAX_ASSOCIATIONS - associations.length;
  const totalFromNetwork = Object.values(attribution).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <AccountTabs group="recompensas" />

      {/* ── Invite modal ── */}
      {modalOpen && (
        <InviteModal
          userId={user.id}
          onClose={() => setModalOpen(false)}
          onSent={refresh}
        />
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-black text-[#2563eb]">
            {associations.length}
            <span className="text-sm font-semibold text-gray-400">/{MAX_ASSOCIATIONS}</span>
          </p>
          <p className="mt-0.5 text-xs font-semibold text-gray-500">Tu grupo</p>
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
          <p className="text-2xl font-black text-green-600">
            +{totalFromNetwork}
          </p>
          <p className="text-xs font-bold text-green-500">
            = €{(totalFromNetwork / 100).toFixed(2)}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-gray-500">Pts recibidos del grupo</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-black text-amber-500">
            {points.toLocaleString("es-ES")}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-gray-500">Mis puntos</p>
        </div>
      </div>

      {/* ── Pending invitations — amber alert ── */}
      {pendingInvites.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-amber-800">
            <Bell size={18} className="text-amber-500" />
            {pendingInvites.length === 1
              ? "Tienes 1 invitación pendiente"
              : `Tienes ${pendingInvites.length} invitaciones pendientes`}
          </h2>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <PendingInviteCard
                key={inv.id}
                invite={inv}
                userId={user.id}
                onUpdate={refresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Points per associate ── shown first so earnings are always visible */}
      {associations.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
            <TrendingUp size={18} className="text-[#2563eb]" /> Puntos generados por tu grupo
          </h2>
          <PointsTable
            associations={associations}
            attribution={attribution}
            history={history}
          />
        </div>
      )}

      {/* ── Organigram ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
          <FourUsersIcon size={18} className="text-[#2563eb]" /> Tu grupo
        </h2>
        <GroupOrganigram
          associations={associations}
          attribution={attribution}
          userId={user.id}
          cooldownOk={cooldownOk}
          cooldownNextAt={cooldownNextAt}
          onAdd={slotsLeft > 0 ? () => setModalOpen(true) : undefined}
          onUpdate={refresh}
        />
      </div>

      {/* ── Ranking of points received from each group member ── */}
      {associations.length > 0 && (
        <GroupRanking associations={associations} attribution={attribution} />
      )}

      {/* ── How it works ── */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
          <ShoppingCart size={18} className="text-[#2563eb]" /> Cómo funciona
        </h2>
        <HowItWorks />
      </div>

      {/* ── Rules ── */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
          <Info size={18} className="text-[#2563eb]" /> Reglas del programa
        </h2>
        <Rules />
      </div>


      {/* ── Info ── */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        <Info size={16} className="mt-0.5 flex-shrink-0 text-blue-400" />
        <p>
          10.000 puntos = €1 · Los puntos se canjean en el{" "}
          <Link href="/cuenta/puntos" className="font-semibold underline">
            panel de puntos
          </Link>{" "}
          o al finalizar la compra. Programa exclusivo para cuentas de cliente.
        </p>
      </div>

      {/* ── Legal link ── */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm text-gray-500">
        <p>
          Al participar en este programa aceptas sus{" "}
          <Link
            href="/condiciones-puntos"
            className="font-semibold text-[#2563eb] underline underline-offset-2 hover:text-[#1d4ed8]"
          >
            bases legales y condiciones
          </Link>
          .
        </p>
        <Link
          href="/condiciones-puntos"
          className="ml-4 flex-shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[#2563eb] hover:text-[#2563eb]"
        >
          Leer condiciones →
        </Link>
      </div>
    </div>
  );
}
