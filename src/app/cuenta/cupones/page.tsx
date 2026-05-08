"use client";
import { useEffect, useState } from "react";
import { Gift, Tag, Clock, Check, X, Percent, Euro } from "lucide-react";
import { type Coupon, type CouponStatus } from "@/data/mockData";
import { AccountTabs } from "@/components/cuenta/AccountTabs";
import { useAuth } from "@/context/AuthContext";
import { getUserCoupons, type UserCoupon } from "@/services/couponService";
import { DataHub } from "@/lib/dataHub";

/**
 * Mapea el shape canónico `UserCoupon` (servicio) al shape de UI `Coupon`
 * (mockData). El status se deriva en vivo: usado > caducado > activo. Así, una
 * vez canjeado en checkout (markCouponUsed escribe `usedAt`), aparece en la
 * pestaña "historial" automáticamente.
 */
function toUiCoupon(uc: UserCoupon): Coupon {
  const today = new Date().toISOString().slice(0, 10);
  let status: CouponStatus = "activo";
  if (uc.usedAt) status = "usado";
  else if (!uc.active || uc.expiresAt < today) status = "caducado";

  // El UI sólo soporta percent/fixed; "shipping" no se modela aquí. Los cupones
  // de envío gratis del admin global no llegan a esta vista (van directos al
  // checkout vía AdminCoupon, no como UserCoupon personal).
  const discountType: Coupon["discountType"] =
    uc.discountType === "percent" ? "percent" : "fixed";

  return {
    code: uc.code,
    description: uc.description,
    discountType,
    value: uc.value,
    expiresAt: uc.expiresAt,
    status,
    usedAt: uc.usedAt?.slice(0, 10),
  };
}

function CouponCard({ coupon }: { coupon: Coupon }) {
  const isActive = coupon.status === "activo";
  const isUsed = coupon.status === "usado";
  const isExpired = coupon.status === "caducado";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 transition ${
        isActive
          ? "border-[#2563eb] bg-white shadow-sm hover:shadow-md"
          : "border-gray-200 bg-gray-50 opacity-60"
      }`}
    >
      <div className={`absolute top-0 bottom-0 left-0 w-1 ${isActive ? "bg-[#2563eb]" : isUsed ? "bg-gray-400" : "bg-gray-300"}`} />

      <div className="py-3 pr-4 pl-4">
        {/* Top row: icon + value + status */}
        <div className="flex items-center justify-between gap-2">
          <div className={`flex items-center gap-1.5 ${isActive ? "text-[#2563eb]" : "text-gray-400"}`}>
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-blue-100" : "bg-gray-200"}`}>
              {coupon.discountType === "percent"
                ? <Percent size={15} className={isActive ? "text-[#2563eb]" : "text-gray-400"} />
                : <Euro size={15} className={isActive ? "text-[#2563eb]" : "text-gray-400"} />}
            </div>
            <span className={`text-xl font-black leading-none ${isActive ? "text-[#2563eb]" : "text-gray-400"}`}>
              {coupon.discountType === "percent" ? `${coupon.value}%` : `${coupon.value}€`}
            </span>
          </div>
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isActive ? "bg-green-100 text-green-700" : isUsed ? "bg-gray-200 text-gray-600" : "bg-red-100 text-red-500"
          }`}>
            {isActive && <><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Activo</>}
            {isUsed && <><Check size={9} /> Usado</>}
            {isExpired && <><X size={9} /> Caducado</>}
          </span>
        </div>

        {/* Description */}
        <p className={`mt-2 text-xs font-semibold leading-snug ${isActive ? "text-gray-800" : "text-gray-500"}`}>
          {coupon.description}
        </p>
        {coupon.applicableTo && (
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400">
            <Tag size={9} /> {coupon.applicableTo}
          </p>
        )}

        {/* Code + expiry */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1 ${
            isActive ? "border-dashed border-[#2563eb] bg-blue-50" : "border-gray-200 bg-gray-100"
          }`}>
            <span className={`font-mono text-xs font-bold tracking-wider ${isActive ? "text-[#2563eb]" : "text-gray-400"}`}>
              {coupon.code}
            </span>
            {isActive && (
              <button
                onClick={() => navigator.clipboard?.writeText(coupon.code)}
                className="text-[10px] text-[#2563eb] hover:underline"
              >
                Copiar
              </button>
            )}
          </div>
          <p className={`flex items-center gap-1 text-[10px] ${isActive ? "text-gray-400" : "text-gray-400"}`}>
            <Clock size={9} />
            {isUsed && coupon.usedAt ? `Usado ${coupon.usedAt}` : coupon.expiresAt}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CuponesPage() {
  const { user } = useAuth();
  const [sourceCoupons, setSourceCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    if (!user) return;
    const reload = () => {
      setSourceCoupons(getUserCoupons(user.id).map(toUiCoupon));
    };
    reload();
    // SSOT: cualquier escritura en couponService emite `coupons`. Así,
    // si el admin envía un cupón en otra pestaña o el usuario canjea uno en
    // /finalizar-compra, esta vista se actualiza al instante sin recarga.
    return DataHub.on("coupons", reload);
  }, [user]);

  const activeCoupons = sourceCoupons.filter((c) => c.status === "activo");
  const historialCoupons = sourceCoupons.filter((c) => c.status !== "activo");

  return (
    <div>
      <AccountTabs group="recompensas" />

      {/* Active coupons */}
      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Cupones activos ({activeCoupons.length})
        </h2>
        {activeCoupons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
            <Gift size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-semibold text-gray-500">No dispones de cupones activos</p>
            <p className="mt-1 text-xs text-gray-400">Los cupones que recibas aparecerán aquí</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeCoupons.map((c) => <CouponCard key={c.code} coupon={c} />)}
          </div>
        )}
      </div>

      {/* History */}
      {historialCoupons.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            Historial de cupones
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {historialCoupons.map((c) => <CouponCard key={c.code} coupon={c} />)}
          </div>
        </div>
      )}

      {historialCoupons.length === 0 && activeCoupons.length === 0 && null}
    </div>
  );
}
