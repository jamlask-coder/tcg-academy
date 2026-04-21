"use client";
import Link from "next/link";
import { ArrowRight, Truck, Shield, Store } from "lucide-react";
import { SITE_CONFIG } from "@/config/siteConfig";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import {
  MOBILE_GAMES,
  MOBILE_GAMES_SPRITE_SRC,
  MOBILE_GAMES_SPRITE_H,
} from "@/data/mobileGames";

export default function HomePage() {
  return (
    <div className="bg-[#0a0f1a]">
      {/* ══════════════════════════════════════════════════════════════════
          FOLD 1 — "Stage" principal:
          Carrusel promo full-width (50% superior visual) con un grid de
          juegos TCG que se solapa sobre el borde inferior (mitad inferior
          visual + encima de las imágenes).
         ══════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-[#0a0f1a]">
        {/* Carrusel promocional.
            Nota: el escudo TCG Academy ya NO se superpone como elemento
            fijo sobre el hero — se integra directamente en cada slide
            (ej. Strixhaven: escudo "quemado" top-right con halo ámbar por
            el script scripts/build-strixhaven-hero.mjs). La marca común
            sigue apareciendo en la navbar. */}
        <HeroCarousel />

        {/* Degradado inferior del carrusel — funde la imagen con el fondo de
            las tarjetas de juegos, dando profundidad y lectura sin tapar */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-[#0a0f1a]/60 to-[#0a0f1a]"
        />

        {/* Grid de juegos TCG — MÓVIL (12 juegos, 3 cols, mismos logos que drawer) */}
        <div className="relative z-10 pt-0 pb-2 sm:hidden">
          <div className="relative mx-auto w-full max-w-[1400px] px-3">
            {/* "Elige tu juego" — misma tipografía que 'TCG Academy' del header
                con efecto shimmer dorado atravesando el texto cada pocos
                segundos (clásico estilo foil/premium). */}
            <div className="mb-1 text-center">
              <h2 className="home-shimmer inline-block text-lg font-black tracking-tight text-amber-300">
                Elige tu juego
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {MOBILE_GAMES.map((game, idx) => {
                // Altura renderizada por defecto 48px, pero los sprites muy
                // anchos (Pokémon, Yu-Gi-Oh!) declaran `renderH` más pequeña
                // para no desbordar el ancho de la tarjeta en móvil.
                const renderH = game.sprite?.renderH ?? 48;
                const spriteScale = game.sprite
                  ? renderH / MOBILE_GAMES_SPRITE_H
                  : 1;
                const spriteW = game.sprite
                  ? game.sprite.origW * spriteScale
                  : 0;
                const spriteX = game.sprite
                  ? game.sprite.origX * spriteScale
                  : 0;
                return (
                  <Link
                    key={game.slug}
                    href={`/${game.slug}`}
                    aria-label={game.label}
                    className="game-card group relative flex items-center justify-center overflow-hidden rounded-xl px-2 py-2 shadow-sm transition-all duration-200 active:scale-[0.97]"
                    style={{
                      WebkitTapHighlightColor: "transparent",
                      background: game.bg,
                      minHeight: 64,
                      animationDelay: `${(idx % 6) * 0.8}s`,
                    }}
                  >
                    {game.sprite ? (
                      <div
                        role="img"
                        aria-label={game.label}
                        style={{
                          width: spriteW,
                          height: renderH,
                          maxWidth: "96%",
                          backgroundImage: `url(${MOBILE_GAMES_SPRITE_SRC})`,
                          backgroundSize: `auto ${renderH}px`,
                          backgroundPosition: `-${spriteX}px 0`,
                          backgroundRepeat: "no-repeat",
                          filter: game.sprite.filter ?? undefined,
                        }}
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={game.logo}
                        alt={game.label}
                        loading="lazy"
                        className="w-auto object-contain"
                        style={{
                          maxHeight: 48,
                          maxWidth: "92%",
                          filter: game.filter ?? undefined,
                          mixBlendMode: game.blend ? "multiply" : undefined,
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Shimmer "foil" atravesando 'Elige tu juego' cada 4s.
              Uso una máscara: el gradiente sólo afecta al texto. */}
          <style>{`
            .home-shimmer {
              background: linear-gradient(
                100deg,
                #fcd34d 0%,
                #fcd34d 40%,
                #fff7d6 50%,
                #fcd34d 60%,
                #fcd34d 100%
              );
              background-size: 220% 100%;
              background-position: 100% 0;
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: homeShimmer 4s ease-in-out infinite;
            }
            @keyframes homeShimmer {
              0%   { background-position: 200% 0; }
              60%  { background-position: -100% 0; }
              100% { background-position: -100% 0; }
            }
            @media (prefers-reduced-motion: reduce) {
              .home-shimmer { animation: none; background: none; -webkit-text-fill-color: currentColor; }
            }

            /* Game cards — ring sutil + shine diagonal continuo escalonado.
               El sheen (brillo) pasa cada 5s con un delay distinto por card
               (0s, 0.8s, 1.6s…) para que el ojo perciba movimiento sin
               saturar la pantalla. Desactivado con prefers-reduced-motion. */
            .game-card {
              box-shadow:
                inset 0 0 0 1px rgba(255, 255, 255, 0.14),
                0 2px 8px rgba(0, 0, 0, 0.25),
                0 0 18px rgba(251, 191, 36, 0.08);
            }
            .game-card::after {
              content: "";
              position: absolute;
              inset: 0;
              pointer-events: none;
              background: linear-gradient(
                115deg,
                transparent 35%,
                rgba(255, 255, 255, 0.28) 50%,
                transparent 65%
              );
              transform: translateX(-120%);
              animation: gameShine 4.8s ease-in-out infinite;
              animation-delay: inherit;
            }
            @keyframes gameShine {
              0%, 60%, 100% { transform: translateX(-120%); }
              75%           { transform: translateX(120%); }
            }
            @media (prefers-reduced-motion: reduce) {
              .game-card::after { animation: none; }
            }
          `}</style>
        </div>

        {/* Grid de juegos TCG — DESKTOP.
            Cambios 2026-04-21:
              · 4 por fila fijo (3 filas × 4 = 12 juegos completos).
              · Usa MOBILE_GAMES (mismos logos/sprites que en móvil) para
                que la web y el móvil muestren exactamente lo mismo.
              · Sin label bajo el logo (eliminado por petición del usuario).
              · Solapamiento más suave con el carrusel (-mt-24 / md:-mt-32). */}
        <div className="relative z-10 hidden sm:-mt-24 sm:block sm:pb-12 md:-mt-32 md:pb-16">
          <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6">
            <div className="grid grid-cols-4 gap-5">
              {MOBILE_GAMES.map((game, idx) => {
                // Mismo cálculo sprite que en móvil — único render
                // compartido entre breakpoints. renderH por defecto 56 px
                // (algo mayor que el 48 del móvil porque las tarjetas son
                // más anchas).
                const renderH = game.sprite?.renderH
                  ? Math.round(game.sprite.renderH * 1.4)
                  : 56;
                const spriteScale = game.sprite
                  ? renderH / MOBILE_GAMES_SPRITE_H
                  : 1;
                const spriteW = game.sprite ? game.sprite.origW * spriteScale : 0;
                const spriteX = game.sprite ? game.sprite.origX * spriteScale : 0;
                return (
                  <Link
                    key={game.slug}
                    href={`/${game.slug}`}
                    aria-label={game.label}
                    className="game-card-desktop group relative flex h-28 items-center justify-center overflow-hidden rounded-2xl px-4 py-4 transition-all duration-300 hover:-translate-y-1 md:h-32"
                    style={{
                      background: game.bg,
                      animationDelay: `${(idx % 4) * 0.6}s`,
                    }}
                  >
                    {game.sprite ? (
                      <div
                        role="img"
                        aria-label={game.label}
                        style={{
                          width: spriteW,
                          height: renderH,
                          maxWidth: "92%",
                          backgroundImage: `url(${MOBILE_GAMES_SPRITE_SRC})`,
                          backgroundSize: `auto ${renderH}px`,
                          backgroundPosition: `-${spriteX}px 0`,
                          backgroundRepeat: "no-repeat",
                          filter: game.sprite.filter ?? undefined,
                        }}
                        className="transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={game.logo}
                        alt={game.label}
                        loading="lazy"
                        className="w-auto object-contain transition-transform duration-300 group-hover:scale-110"
                        style={{
                          maxHeight: 68,
                          maxWidth: "88%",
                          filter: game.filter ?? undefined,
                          mixBlendMode: game.blend ? "multiply" : undefined,
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Estilos locales del grid desktop: sheen + wave letter effect. */}
          <style>{`
            .game-card-desktop {
              box-shadow:
                inset 0 0 0 1px rgba(15, 23, 42, 0.06),
                0 4px 14px rgba(0, 0, 0, 0.18),
                0 0 24px rgba(251, 191, 36, 0.05);
            }
            .game-card-desktop::after {
              content: "";
              position: absolute;
              inset: 0;
              pointer-events: none;
              background: linear-gradient(
                115deg,
                transparent 35%,
                rgba(255, 255, 255, 0.55) 50%,
                transparent 65%
              );
              transform: translateX(-120%);
              animation: gameShineDesktop 5.2s ease-in-out infinite;
              animation-delay: inherit;
            }
            @keyframes gameShineDesktop {
              0%, 62%, 100% { transform: translateX(-120%); }
              78%           { transform: translateX(120%); }
            }
            @media (prefers-reduced-motion: reduce) {
              .game-card-desktop::after { animation: none; }
            }
          `}</style>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOLD 2 — Nuestras 4 tiendas físicas
          Móvil: solo encabezado/intro sobre navy (cards ocultas).
          Desktop: sección completa con cards.
         ══════════════════════════════════════════════════════════════════ */}
      <section className="border-y border-white/[0.06] bg-[#0a0f1a] py-5">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end sm:gap-3">
            <div>
              <span className="mb-2 inline-block rounded-full bg-[#2563eb]/25 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-[#93c5fd] uppercase">
                Presencia física
              </span>
              <h2 className="text-2xl font-black text-white sm:text-3xl">
                4 tiendas en España, y creciendo
              </h2>
              <p className="mt-1 text-sm text-white/55 sm:text-base">
                Empezamos con una tienda. Hoy somos cuatro y seguimos expandiéndonos.
              </p>
            </div>
            <Link
              href="/tiendas"
              className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[#60a5fa] hover:gap-2 hover:underline sm:mt-0"
            >
              Ver todas las tiendas <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOLD 3 — Trust bar
          En móvil: fondo navy continuo con el hero (sin corte blanco).
          En desktop: se mantiene el fondo blanco clásico.
         ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-b from-[#0a0f1a] to-[#050810]">
        <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6 sm:py-4">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {[
              [Truck, "Envío gratis", `En pedidos desde ${SITE_CONFIG.shippingThreshold}€`, "#60a5fa"],
              [Shield, "Compra segura", "Pago 100% protegido", "#34d399"],
              [Store, "Mayoristas y minoristas", "Precios especiales B2B", "#c4b5fd"],
            ].map(([Icon, title, sub, color], i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10 transition-colors hover:bg-white/[0.07]"
              >
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${color as string}22`,
                  }}
                >
                  <Icon size={18} style={{ color: color as string }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm leading-tight font-bold text-white">
                    {title as string}
                  </div>
                  <div className="mt-0.5 text-xs leading-tight text-white/55">
                    {sub as string}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
