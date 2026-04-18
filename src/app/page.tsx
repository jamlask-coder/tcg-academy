"use client";
import Link from "next/link";
import {
  ArrowRight,
  Truck,
  Shield,
  ShoppingBag,
  Store,
  Building2,
  MapPin,
} from "lucide-react";
import { SITE_CONFIG } from "@/config/siteConfig";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { MEGA_MENU_DATA } from "@/data/megaMenuData";

// ─── Tiendas físicas ─────────────────────────────────────────────────────────
const STORES: { city: string; province: string; href: string }[] = [
  { city: "Madrid", province: "Madrid", href: "/tiendas/madrid" },
  { city: "Barcelona", province: "Barcelona", href: "/tiendas/barcelona" },
  { city: "Calpe", province: "Alicante", href: "/tiendas/calpe" },
  { city: "Béjar", province: "Salamanca", href: "/tiendas/bejar" },
];

export default function HomePage() {
  return (
    <div>
      {/* ══════════════════════════════════════════════════════════════════
          FOLD 1 — "Stage" principal:
          Carrusel promo full-width (50% superior visual) con un grid de
          juegos TCG que se solapa sobre el borde inferior (mitad inferior
          visual + encima de las imágenes).
         ══════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-[#0a0f1a]">
        {/* Carrusel promocional */}
        <HeroCarousel />

        {/* Degradado inferior del carrusel — funde la imagen con el fondo de
            las tarjetas de juegos, dando profundidad y lectura sin tapar */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-[#0a0f1a]/60 to-[#0a0f1a]"
        />

        {/* Grid de juegos TCG: se superpone al pie del carrusel */}
        <div className="relative z-10 -mt-14 pb-14 sm:-mt-20 sm:pb-20 md:-mt-28 md:pb-24">
          <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
            {/* Encabezado del portal — sobre las imágenes */}
            <div className="mb-6 text-center sm:mb-8">
              <span className="mb-2 inline-block rounded-full bg-yellow-400/15 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-yellow-300 uppercase backdrop-blur">
                Tu universo TCG
              </span>
              <h2
                className="text-2xl font-black text-white sm:text-3xl md:text-4xl"
                style={{ textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}
              >
                Elige tu juego
              </h2>
            </div>

            {/* Grid de logos — cards glass */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-4 xl:grid-cols-8">
              {MEGA_MENU_DATA.map((game) => (
                <Link
                  key={game.slug}
                  href={game.href}
                  className="group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/95 px-2 py-3 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]"
                >
                  {/* Barra de acento superior en el color del juego */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{ backgroundColor: game.color }}
                  />
                  {/* Glow de color al hover */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(circle at 50% 100%, ${game.color}22 0%, transparent 70%)`,
                    }}
                  />

                  <div className="relative flex h-14 w-full items-center justify-center sm:h-16 md:h-20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={game.logoSrc}
                      alt={game.label}
                      loading="lazy"
                      className="max-h-full max-w-[85%] object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <p
                    className="relative mt-2 text-center text-[11px] font-bold text-gray-700 sm:text-xs"
                    style={{ color: "#334155" }}
                  >
                    {game.label}
                  </p>
                </Link>
              ))}
            </div>

            {/* CTA explorar todo */}
            <div className="mt-8 flex justify-center">
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-6 py-3 text-sm font-black text-[#0f172a] shadow-[0_8px_30px_rgba(251,191,36,0.35)] transition-all hover:-translate-y-0.5 hover:bg-yellow-300"
              >
                Explorar catálogo completo <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOLD 2 — Nuestras 4 tiendas físicas
         ══════════════════════════════════════════════════════════════════ */}
      <section className="border-y border-gray-100 bg-gradient-to-b from-gray-50 to-white py-12 sm:py-16">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <span className="mb-2 inline-block rounded-full bg-[#2563eb]/10 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-[#2563eb] uppercase">
                Presencia física
              </span>
              <h2 className="text-2xl font-black text-gray-900 sm:text-3xl">
                4 tiendas en España, y creciendo
              </h2>
              <p className="mt-1 text-sm text-gray-500 sm:text-base">
                Empezamos con una tienda. Hoy somos cuatro y seguimos expandiéndonos.
              </p>
            </div>
            <Link
              href="/tiendas"
              className="inline-flex items-center gap-1 text-sm font-bold text-[#2563eb] hover:gap-2 hover:underline"
            >
              Ver todas las tiendas <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {STORES.map((store) => (
              <Link
                key={store.city}
                href={store.href}
                className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#2563eb]/30 hover:shadow-lg sm:p-5"
              >
                {/* Acento azul izquierdo */}
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#2563eb] to-[#1e3a8a] opacity-40 transition-opacity group-hover:opacity-100"
                />
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#2563eb]/10 transition-colors group-hover:bg-[#2563eb]/20">
                  <MapPin size={18} className="text-[#2563eb]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                    TCG Academy
                  </p>
                  <p className="truncate text-base font-black text-gray-900 transition-colors group-hover:text-[#2563eb] sm:text-lg">
                    {store.city}
                  </p>
                  <p className="truncate text-[11px] text-gray-500">
                    {store.province}
                  </p>
                </div>
                <ArrowRight
                  size={14}
                  className="flex-shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-[#2563eb]"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOLD 3 — Trust bar
         ══════════════════════════════════════════════════════════════════ */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              [Truck, "Envío gratis", `En pedidos desde ${SITE_CONFIG.shippingThreshold}€`, "#3b82f6"],
              [Shield, "Compra segura", "Pago 100% protegido", "#16a34a"],
              [Store, "Mayoristas y minoristas", "Precios especiales B2B", "#7c3aed"],
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

      {/* ══════════════════════════════════════════════════════════════════
          FOLD 4 — Oportunidades de negocio
         ══════════════════════════════════════════════════════════════════ */}
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
