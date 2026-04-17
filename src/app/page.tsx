"use client";
import Link from "next/link";
import {
  ArrowRight,
  Truck,
  Shield,
  ShoppingBag,
  Store,
  Zap,
  Building2,
} from "lucide-react";
import { SITE_CONFIG } from "@/config/siteConfig";

export default function HomePage() {
  return (
    <div>
      {/* HERO */}
      <section className="relative flex min-h-[460px] w-full max-w-full items-center overflow-hidden bg-[#0f172a] text-white md:min-h-[580px]">
        {/* Multi-layer gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, #0a0f1a 0%, #1e3a8a 55%, #2563eb 100%)",
          }}
        />
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-0 left-0 h-[600px] w-[600px] rounded-full opacity-30 blur-[100px]"
            style={{
              background:
                "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full opacity-20 blur-[80px]"
            style={{
              background:
                "radial-gradient(circle, #a855f7 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-1/2 left-1/3 h-[300px] w-[300px] rounded-full opacity-15 blur-[60px]"
            style={{
              background:
                "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
            }}
          />
        </div>
        <style>{`
          @keyframes heroLogoFloat {
            0%,100% { transform: translateY(0px) rotate(0deg); }
            35%     { transform: translateY(-18px) rotate(2deg); }
            70%     { transform: translateY(10px) rotate(-1.2deg); }
          }
          @keyframes storeDotPulse {
            0%,100% { box-shadow: 0 0 6px 2px rgba(147,197,253,0.5); }
            50%     { box-shadow: 0 0 14px 5px rgba(147,197,253,0.9); }
          }
          @keyframes storeLineScan {
            0%   { background-position: 0% 0%; }
            100% { background-position: 0% 200%; }
          }
        `}</style>

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 md:py-24">
          <div className="flex flex-col items-start gap-8 xl:flex-row xl:justify-between">
            <div className="w-full max-w-xl flex-1">
              {/* Headline */}
              <h1 className="mb-6 text-3xl leading-[1.08] font-black tracking-tight sm:text-5xl md:text-6xl">
                Tu tienda TCG
                <br />
                <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
                  de confianza
                </span>
              </h1>

              {/* Desktop subtitle */}
              <p className="mb-10 hidden max-w-xl text-lg leading-relaxed text-blue-200/80 md:block md:text-xl">
                Empezamos con una tienda. Hoy somos cuatro, y no paramos.
                <br />
                En plena expansión por toda España.
              </p>

              {/* Mobile: stores grid + B2B pill */}
              <div className="mb-10 md:hidden">
                <p className="mb-3 text-sm font-bold tracking-widest text-white uppercase">Nuestras tiendas</p>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  {[
                    { city: "Madrid", href: "/tiendas/madrid" },
                    { city: "Barcelona", href: "/tiendas/barcelona" },
                    { city: "Calpe", href: "/tiendas/calpe" },
                    { city: "Béjar", href: "/tiendas/bejar" },
                  ].map(({ city, href }) => (
                    <Link
                      key={city}
                      href={href}
                      className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 transition active:bg-white/20"
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-300" aria-hidden="true" />
                      <span className="text-sm font-semibold text-white">{city}</span>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/mayoristas/b2b"
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1.5 text-xs font-bold text-amber-300 transition active:bg-amber-400/30"
                >
                  <Store size={11} />
                  Profesionales B2B — descuentos especiales
                </Link>
              </div>

              {/* CTAs */}
              <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/catalogo"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-7 py-4 font-black text-[#0f172a] shadow-[0_0_40px_rgba(251,191,36,0.25)] transition-all hover:bg-yellow-300 active:scale-[0.98] sm:inline-flex"
                >
                  Explorar catálogo <ArrowRight size={18} />
                </Link>
                <Link
                  href="/catalogo?filter=nuevo"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-7 py-4 font-semibold text-white transition-all hover:bg-white/14 active:scale-[0.98] sm:inline-flex"
                >
                  <Zap size={16} className="text-yellow-400" /> Novedades de la
                  semana
                </Link>
              </div>

            </div>

            {/* ── Center column: TCG Academy shield ───────────────────────── */}
            <div
              className="hidden flex-shrink-0 items-start justify-center xl:flex"
              style={{ width: 500, marginLeft: -40 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-tcg-shield.png"
                alt="TCG Academy"
                style={{
                  width: 700,
                  height: "auto",
                  animation: "heroLogoFloat 9s ease-in-out infinite",
                }}
              />
            </div>

            {/* ── Right column: only cities, shifted down one slot ─────────── */}
            <div
              className="hidden flex-shrink-0 flex-col xl:flex"
              style={{
                width: 360,
                alignSelf: "stretch",
                justifyContent: "flex-start",
              }}
            >
              <p className="mb-4 text-sm font-bold tracking-widest text-white uppercase">Nuestras tiendas</p>
              {/* Stores timeline */}
              <div className="relative pl-10" style={{ paddingTop: 0 }}>
                {/* vertical glowing line */}
                <div
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 6,
                    bottom: 6,
                    width: 1,
                    background:
                      "linear-gradient(to bottom, transparent 0%, rgba(147,197,253,0.7) 20%, rgba(147,197,253,0.7) 80%, transparent 100%)",
                  }}
                />

                {[
                  {
                    city: "Madrid",
                    province: "Madrid",
                    href: "/tiendas/madrid",
                  },
                  {
                    city: "Barcelona",
                    province: "Barcelona",
                    href: "/tiendas/barcelona",
                  },
                  {
                    city: "Calpe",
                    province: "Alicante",
                    href: "/tiendas/calpe",
                  },
                  {
                    city: "Béjar",
                    province: "Salamanca",
                    href: "/tiendas/bejar",
                  },
                ].map(({ city, province, href }, i) => (
                  <Link
                    key={city}
                    href={href}
                    className="group relative flex items-center gap-3"
                    style={{ marginBottom: i < 3 ? 22 : 0, display: "flex" }}
                  >
                    {/* Pulse dot */}
                    <div
                      style={{
                        position: "absolute",
                        left: -16,
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: "rgba(147,197,253,0.25)",
                        border: "1.5px solid rgba(147,197,253,0.8)",
                        animation: `storeDotPulse 2.5s ease-in-out ${i * 0.6}s infinite`,
                        flexShrink: 0,
                      }}
                    />

                    {/* Text */}
                    <div>
                      <div
                        className="transition-colors duration-200 group-hover:text-amber-300"
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.12em",
                          color: "rgba(147,197,253,0.65)",
                          textTransform: "uppercase",
                          marginBottom: 2,
                        }}
                      >
                        TCG Academy · {province}
                      </div>
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 800,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        <span className="text-white transition-colors duration-200 group-hover:text-amber-300">
                          {city}
                        </span>
                      </div>
                    </div>

                  </Link>
                ))}
              </div>
            </div>
            {/* ── End right column ──────────────────────────────────────── */}
          </div>
          {/* end flex row */}
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              [Truck, "Envío gratis", `En pedidos desde ${SITE_CONFIG.shippingThreshold}€`, "#3b82f6"],
              [Shield, "Compra segura", "Pago 100% protegido", "#16a34a"],
              [
                Store,
                "Mayoristas y minoristas",
                "Precios especiales B2B",
                "#7c3aed",
              ],
            ].map(([Icon, title, sub, color], i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100"
              >
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${color}14` }}
                >
                  <Icon size={18} style={{ color: color as string }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm leading-tight font-bold text-gray-800">
                    {title as string}
                  </div>
                  <div className="mt-0.5 text-xs leading-tight text-gray-500">
                    {sub as string}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUSINESS OPPORTUNITIES — 3 columns */}
      <section className="bg-white py-12 sm:py-20">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
              Crece con TCG Academy
            </h2>
            <p className="text-gray-500">
              Tres formas de trabajar con nosotros — encuentra la tuya
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Vending */}
            <Link
              href="/mayoristas/vending"
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#3b82f6] p-7 text-white transition-all hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="pointer-events-none absolute inset-0 opacity-10">
                <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-yellow-400 blur-2xl" />
              </div>
              <div className="relative flex flex-1 flex-col">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                  <ShoppingBag size={22} className="text-yellow-400" />
                </div>
                <span className="mb-3 inline-block w-fit rounded-full bg-yellow-400 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#2563eb] uppercase">
                  Próximamente
                </span>
                <h3 className="mb-2 text-lg font-bold">Máquinas Vending TCG</h3>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-blue-200">
                  Ingresos pasivos 24/7 con nuestras máquinas de cartas
                  coleccionables. Sin personal ni horarios.
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-yellow-400 transition-all group-hover:gap-2">
                  Saber más <ArrowRight size={14} />
                </span>
              </div>
            </Link>

            {/* Franquicias */}
            <Link
              href="/mayoristas/franquicias"
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#0d9488] p-7 text-white transition-all hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="pointer-events-none absolute inset-0 opacity-10">
                <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white blur-2xl" />
              </div>
              <div className="relative flex flex-1 flex-col">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                  <Store size={22} className="text-white" />
                </div>
                <span className="mb-3 inline-block w-fit rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#0f766e] uppercase">
                  Oportunidad de negocio
                </span>
                <h3 className="mb-2 text-lg font-bold">Monta tu tienda TCG</h3>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-teal-100">
                  Abre tu propia tienda TCG con todo el respaldo de TCG Academy:
                  stock, formación, marketing y soporte.
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-white transition-all group-hover:gap-2">
                  Ver el modelo <ArrowRight size={14} />
                </span>
              </div>
            </Link>

            {/* B2B */}
            <Link
              href="/mayoristas/b2b"
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] p-7 text-white transition-all hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="pointer-events-none absolute inset-0 opacity-10">
                <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-amber-300 blur-2xl" />
              </div>
              <div className="relative flex flex-1 flex-col">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                  <Building2 size={22} className="text-amber-300" />
                </div>
                <span className="mb-3 inline-block w-fit rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#7c3aed] uppercase">
                  Para profesionales
                </span>
                <h3 className="mb-2 text-lg font-bold">Zona Profesionales B2B</h3>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-purple-200">
                  Precios especiales para distribuidores y tiendas. Descuentos por
                  volumen. Contacto directo y personalizado.
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-300 transition-all group-hover:gap-2">
                  Solicitar acceso <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
