"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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

        {/* Transición suave hero → fondo. NO usamos overlap para que ningún
            CTA del hero quede tapado por las tarjetas de juegos. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#0a0f1a]"
        />

        {/* Grid de juegos TCG — MÓVIL (12 juegos, 3 cols, mismos logos que drawer)
            Sin título "Elige tu juego" — el usuario lo pidió quitado
            (2026-04-22). Las tarjetas hablan por sí solas. */}
        <div className="relative z-10 pt-3 pb-2 sm:hidden">
          <div className="relative mx-auto w-full max-w-[1400px] px-3">
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
                    className="game-card group relative flex items-center justify-center overflow-hidden rounded-xl px-1 py-1 shadow-sm transition-all duration-200 active:scale-[0.97]"
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
                          maxWidth: "98%",
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
                          maxHeight: 58,
                          maxWidth: "98%",
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

          {/* Game cards — ring sutil + shine diagonal continuo escalonado.
              El sheen (brillo) pasa cada 5s con un delay distinto por card
              (0s, 0.8s, 1.6s…) para que el ojo perciba movimiento sin
              saturar la pantalla. Desactivado con prefers-reduced-motion. */}
          <style>{`
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
            Cambios 2026-04-22:
              · Sin brand lockup ni texto intro — usuario quiere ver los
                12 juegos inmediatamente al abrir la home.
              · Solape AGRESIVO sobre el hero: las tarjetas se montan
                ~45 % sobre la altura del hero para que en primer golpe
                de vista se vea arte + marca + tarjetas. Margen negativo
                progresivo por breakpoint (aspect 2.6/1 crece en desktop).
              · El contenido focal del hero (turtles, logo, CTA) vive en
                el 55 % superior para no quedar tapado nunca. */}
        <div className="relative z-10 hidden sm:-mt-24 sm:block sm:pb-10 md:-mt-32 md:pb-14 lg:-mt-44 xl:-mt-52 2xl:-mt-60">
          <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6">
            <div className="grid grid-cols-4 gap-5">
              {MOBILE_GAMES.map((game, idx) => {
                // Logo dominante: llena la tarjeta dejando solo ~8-10 px
                // de margen por cada lado. En tarjetas h-40 (160 px),
                // un logo de 120 px deja 20 px arriba + 20 px abajo.
                //   · Sprites con renderH explícito: × 3.0 (Pokémon 40→120,
                //     Yu-Gi-Oh! 34→102).
                //   · Sprites sin renderH: 104 px.
                //   · Imágenes PNG/SVG: maxHeight 124 px.
                const renderH = game.sprite?.renderH
                  ? Math.round(game.sprite.renderH * 3.0)
                  : 104;
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
                    className="game-card-desktop group relative flex h-36 items-center justify-center overflow-hidden rounded-2xl px-2 py-2 transition-all duration-300 hover:-translate-y-1 md:h-40"
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
                          maxWidth: "94%",
                          backgroundImage: `url(${MOBILE_GAMES_SPRITE_SRC})`,
                          backgroundSize: `auto ${renderH}px`,
                          backgroundPosition: `-${spriteX}px 0`,
                          backgroundRepeat: "no-repeat",
                          filter: game.sprite.filter ?? undefined,
                        }}
                        className="transition-transform duration-300 group-hover:scale-[1.06]"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={game.logo}
                        alt={game.label}
                        loading="lazy"
                        className="w-auto object-contain transition-transform duration-300 group-hover:scale-[1.06]"
                        style={{
                          maxHeight: 124,
                          maxWidth: "94%",
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

    </div>
  );
}
