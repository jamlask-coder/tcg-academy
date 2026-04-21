"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { DataHub } from "@/lib/dataHub";
import { getHeroImages } from "@/services/heroImageService";

type Slide = {
  src: string;
  /** Imagen específica para breakpoint móvil (<640px). Si se omite, se usa
   *  `src` en ambos. Cuando se indica, el artwork móvil tiene aspect/crop
   *  dedicado para que título y focal elements sean legibles en 16:9. */
  srcMobile?: string;
  alt: string;
  href?: string;
  /** Logo PNG/WebP con transparencia — se pinta arriba del hero. */
  overlayLogo?: string;
  /** Artwork principal con transparencia — se pinta sobre el hero. */
  overlayArt?: string;
  /** Texto del CTA (botón) — si presente, se muestra un pill ámbar. */
  overlayCta?: string;
  /** Clases Tailwind de posición del CTA (top/left/translate). Si falta, usa layout TMNT. */
  ctaPosition?: string;
  /** Clases Tailwind de object-position para la imagen de fondo. Default: object-center. */
  imagePosition?: string;
};

// Defaults cuando no hay imágenes subidas por el admin.
const DEFAULT_SLIDES: Slide[] = [
  {
    src: "/images/hero/slide-1.jpg",
    alt: "Magic: The Gathering x Teenage Mutant Ninja Turtles",
    href: "/catalogo?game=magic&q=Teenage+Mutant+Ninja+Turtles",
    overlayLogo: "/images/hero/tmnt-logo.webp",
    overlayArt: "/images/hero/tmnt-turtles.webp",
    overlayCta: "Ver colección",
  },
  {
    // v3 desktop: generada con scripts/build-strixhaven-hero.mjs desde el
    // arte oficial 1885×597. En lugar de recortar el planeswalker shield
    // (que arriesgaba cortar la "M" de MAGIC), aplica un degradado radial
    // oscuro sobre esa zona → el shield se funde en sombra y el escudo TCG
    // Academy del navbar queda limpio encima. Trim 48px superior para
    // compactar el forest canopy. Resultado 1885×549, aspect 3.434.
    // v5 = imagen POR VIEWPORT con una FRANJA OSCURA DEDICADA inferior
    // donde viven escudo TCG y CTA. El escudo NO se solapa con ningún
    // personaje ni elemento del arte — la franja es creada explícitamente
    // como zona "footer" limpia. Ver scripts/build-strixhaven-hero.mjs.
    //   · Desktop: 1885×725 (aspect 2.6 = match container)
    //   · Mobile : 977×549  (aspect 1.78 = match container 16:9)
    src: "/images/hero/slide-2-strixhaven-v5.webp",
    srcMobile: "/images/hero/slide-2-strixhaven-v5-mobile.webp",
    alt: "Magic: The Gathering — Secrets of Strixhaven",
    href: "/catalogo?game=magic&q=Strixhaven",
    overlayCta: "Ver catálogo",
    // Móvil: CTA en forest floor bajo "STRIXHAVEN". Desktop: bajo la
    // columna del título, alineado izq. Las viñetas del script oscurecen
    // sutilmente ambas zonas para máxima legibilidad del pill ámbar.
    ctaPosition:
      "top-[88%] left-1/2 -translate-x-1/2 sm:top-[86%] sm:left-[8%] sm:translate-x-0",
  },
];

const AUTOPLAY_MS = 5500;
const FADE_MS = 700;

export function HeroCarousel() {
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Carga slides del servicio (admin uploads). Si no hay, usa DEFAULT_SLIDES.
  useEffect(() => {
    const load = () => {
      const imgs = getHeroImages();
      if (imgs.length === 0) {
        setSlides(DEFAULT_SLIDES);
      } else {
        setSlides(
          imgs.map((img) => ({
            src: img.dataUrl,
            alt: img.alt,
            href: img.href,
          })),
        );
      }
      setIndex(0);
    };
    load();
    return DataHub.on("heroImages", load);
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const len = slides.length || 1;
      setIndex(((i % len) + len) % len);
    },
    [slides.length],
  );

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  return (
    <section
      className="relative w-full overflow-hidden bg-[#0a0f1a]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Novedades destacadas"
    >
      {/* Aspect ratio FIJA — se aplica siempre, independientemente del
          tamaño del archivo que suba el admin. object-cover recorta cualquier
          imagen al marco fijo para que el visual sea consistente.
          · Móvil: 16/9 (1.78:1) — formato estándar, cabe bien en pantallas
            estrechas sin recortar demasiado.
          · Desktop: 1133/529 (~2.14:1) — panorámico original.
          Resolución mínima recomendada al subir: 1600×900 px (móvil)
          / 1600×750 px (desktop). object-position: center centra el crop. */}
      <div className="relative aspect-[16/9] w-full sm:aspect-[2.6/1]">
        {slides.map((slide, i) => {
          const active = i === index;
          const content = (
            <>
              {slide.srcMobile ? (
                <>
                  {/* Móvil: artwork dedicado con aspect 1.93, legible en 16:9. */}
                  <Image
                    src={slide.srcMobile}
                    alt={slide.alt}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className="object-cover object-center sm:hidden"
                    unoptimized={slide.srcMobile.startsWith("data:")}
                  />
                  {/* Desktop: artwork panorámico. */}
                  <Image
                    src={slide.src}
                    alt=""
                    aria-hidden="true"
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className={`hidden object-cover sm:block ${slide.imagePosition ?? "object-center"}`}
                    unoptimized={slide.src.startsWith("data:")}
                  />
                </>
              ) : (
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className={`object-cover ${slide.imagePosition ?? "object-center"}`}
                  unoptimized={slide.src.startsWith("data:")}
                />
              )}
              {/* Velo sutil para que los overlays (logo/artwork) ganen
                  contraste sobre el fondo fotográfico sin apagarlo. */}
              {(slide.overlayLogo || slide.overlayArt) && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 70% 80% at 35% 55%, rgba(10,15,26,0.35) 0%, rgba(10,15,26,0.15) 55%, transparent 80%)",
                  }}
                />
              )}
              {/* Artwork (tortugas) — dominante a la derecha en desktop,
                  reducido arriba-centro en móvil para dejar zona inferior
                  libre al CTA. object-contain preserva transparencia. */}
              {slide.overlayArt && (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-[14%] sm:items-center sm:justify-end sm:pt-0 sm:pr-[4%]">
                  <div className="relative h-[58%] w-[68%] sm:h-[94%] sm:w-[46%]">
                    <Image
                      src={slide.overlayArt}
                      alt=""
                      aria-hidden="true"
                      fill
                      priority={i === 0}
                      sizes="(max-width: 640px) 68vw, 46vw"
                      className="object-contain object-center drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)] sm:object-right"
                    />
                  </div>
                </div>
              )}
              {/* Logo Magic × TMNT — arriba centrado en móvil, arriba-izq
                  en desktop. Aspect ~6.7:1. */}
              {slide.overlayLogo && (
                <div className="pointer-events-none absolute top-[6%] left-1/2 z-[1] w-[62%] max-w-[280px] -translate-x-1/2 sm:top-[8%] sm:left-[4%] sm:w-[54%] sm:max-w-[760px] sm:translate-x-0">
                  <div className="relative aspect-[6.7/1] w-full">
                    <Image
                      src={slide.overlayLogo}
                      alt=""
                      aria-hidden="true"
                      fill
                      priority={i === 0}
                      sizes="(max-width: 640px) 62vw, 54vw"
                      className="object-contain drop-shadow-[0_2px_14px_rgba(0,0,0,0.7)]"
                    />
                  </div>
                </div>
              )}
              {/* CTA ámbar — bajo el logo, en la zona media del hero.
                  IMPORTANTE: se coloca por encima de la línea donde las
                  tarjetas de juegos se solapan con el hero (aprox. último
                  28% en desktop, último 20% en móvil), para que nunca
                  quede tapado por el recuadro de Pokémon / Magic / etc. */}
              {slide.overlayCta && (
                <div
                  className={`pointer-events-none absolute z-[2] flex ${
                    slide.ctaPosition ??
                    "top-[74%] left-1/2 -translate-x-1/2 sm:top-[42%] sm:left-[7%] sm:translate-x-0"
                  }`}
                >
                  <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 px-3 py-1.5 text-[10px] font-black tracking-wide text-[#0f172a] uppercase shadow-[0_6px_16px_rgba(251,146,60,0.5)] ring-1 ring-amber-300/60 transition-all duration-200 hover:scale-[1.04] hover:from-amber-300 hover:to-orange-400 hover:shadow-[0_10px_28px_rgba(251,146,60,0.7)] sm:gap-2 sm:px-7 sm:py-3.5 sm:text-base">
                    {slide.overlayCta}
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3 w-3 sm:h-5 sm:w-5"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H4a1 1 0 110-2h10.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </div>
              )}
            </>
          );
          return (
            <div
              key={`${slide.src}-${i}`}
              className="absolute inset-0"
              style={{
                opacity: active ? 1 : 0,
                transition: `opacity ${FADE_MS}ms ease-in-out`,
                pointerEvents: active ? "auto" : "none",
              }}
              aria-hidden={!active}
            >
              {slide.href ? (
                <a href={slide.href} className="block h-full w-full" aria-label={slide.alt}>
                  {content}
                </a>
              ) : (
                content
              )}
            </div>
          );
        })}

        {/* Dots — móvil: 2 puntos iguales abajo-derecha pegados a la esquina.
            Desktop: centrados, pill ancho para el activo. */}
        <div className="absolute right-2 bottom-2 z-10 flex gap-1.5 sm:right-auto sm:bottom-5 sm:left-1/2 sm:-translate-x-1/2 sm:gap-2">
          {slides.map((_, i) => {
            const active = i === index;
            return (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir a slide ${i + 1}`}
                aria-current={active}
                className={`h-2 rounded-full transition-all hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  active ? "w-2 sm:w-7" : "w-2 sm:w-2.5"
                }`}
                style={{
                  backgroundColor: active
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.5)",
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
