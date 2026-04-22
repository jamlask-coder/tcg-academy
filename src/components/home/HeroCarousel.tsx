"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
    // CTA — mobile bajo las tortugas (tortugas viven y=12-66%, CTA a
    // y=86% en la franja libre inferior de cielo/cityscape). Desktop
    // queda en el lateral izquierdo libre bajo el cityscape.
    ctaPosition:
      "top-[86%] left-1/2 -translate-x-1/2 sm:top-[42%] sm:left-[1%] sm:translate-x-0",
  },
  {
    // v6 (2026-04-22) — rehecho por scripts/build-strixhaven-hero.mjs.
    //   · Sin darkening radial feo sobre el logo MAGIC.
    //   · Desktop 1885×725 (aspect 2.6): arte original + extensión
    //     inferior con mirror-blur del follaje (natural, no franja negra).
    //     El TCG shield baked se retira — vive ya en la navbar y las
    //     cards solapaban la zona donde estaba.
    //   · Mobile 977×549 (aspect 1.78): crop horizontal (logo + título +
    //     elfa + búho) con franja inferior dedicada (mirror-blur +
    //     vignette) para alojar el CTA centrado sin pisar nada.
    src: "/images/hero/slide-2-strixhaven-v6.webp",
    srcMobile: "/images/hero/slide-2-strixhaven-v6-mobile.webp",
    alt: "Magic: The Gathering — Secrets of Strixhaven",
    href: "/catalogo?game=magic&q=Strixhaven",
    overlayCta: "Ver catálogo",
    // CTA en zonas libres por viewport:
    //   · Mobile: en la franja oscura inferior dedicada (y≈92 %), no
    //     pisa ni título ni personajes. Cards móvil no solapan el hero.
    //   · Desktop: en la banda vertical libre entre "THE GATHERING"
    //     (≈y 28 %) y "SECRETS OF" (≈y 42 %), lado izq bajo el logo
    //     MAGIC. Queda dentro del 55 % superior visible (cards
    //     solapan el 45 % inferior).
    ctaPosition:
      "top-[86%] left-1/2 -translate-x-1/2 sm:top-[33%] sm:left-[7%] sm:translate-x-0",
  },
];

const AUTOPLAY_MS = 2800;
const FADE_MS = 700;

export function HeroCarousel() {
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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

  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  // Swipe en móvil: umbral 40 px horizontal, ignoramos si el gesto es
  // más vertical que horizontal (para no capturar scroll).
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) next();
    else prev();
  };

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
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
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
                  {/* Móvil: artwork dedicado con aspect 1.93, legible en 16:9.
                      object-fit inline (no solo className) para evitar FOUC:
                      antes de cargar Tailwind, next/image con `fill` y sin
                      object-fit usa el default del navegador (`fill`) que
                      estira la imagen al aspect del contenedor. */}
                  <Image
                    src={slide.srcMobile}
                    alt={slide.alt}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className="object-cover object-center sm:hidden"
                    style={{ objectFit: "cover", objectPosition: "center" }}
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
                    style={{ objectFit: "cover", objectPosition: "center" }}
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
                  style={{ objectFit: "cover", objectPosition: "center" }}
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
              {/* Artwork (tortugas) — CENTRADAS horizontalmente en
                  desktop y grandes para llenar la zona central que
                  antes quedaba vacía. En móvil, arriba-centro. Ambas
                  ancladas al top para que las cabezas vivan en el 55 %
                  superior (el 45 % inferior queda tapado por cards). */}
              {slide.overlayArt && (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-[12%] sm:pt-0">
                  <div className="relative h-[54%] w-[64%] sm:h-[62%] sm:w-[58%]">
                    <Image
                      src={slide.overlayArt}
                      alt=""
                      aria-hidden="true"
                      fill
                      priority={i === 0}
                      sizes="(max-width: 640px) 64vw, 58vw"
                      className="object-contain object-top drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
                      style={{ objectFit: "contain", objectPosition: "top" }}
                    />
                  </div>
                </div>
              )}
              {/* Wrapper con el mismo max-width que el grid de cards
                  (1400 px + padding responsive) — los overlays de logo
                  y CTA se posicionan RELATIVOS a este wrapper, no al
                  viewport. Así en pantallas ≥1400 px ambos quedan
                  alineados con las cards, no pegados a los bordes de
                  la ventana. */}
              <div className="pointer-events-none absolute inset-0 flex justify-center">
                <div className="relative w-full max-w-[1400px] px-4 sm:px-6">
                  {/* Logo Magic × TMNT — arriba-CENTRO en móvil, arriba-
                      DERECHA compacto en desktop (esquina). Aspect ~6.7:1. */}
                  {slide.overlayLogo && (
                    <div className="absolute top-[5%] left-1/2 z-[1] w-[62%] max-w-[280px] -translate-x-1/2 sm:top-[6%] sm:right-[1%] sm:left-auto sm:w-[22%] sm:max-w-[320px] sm:translate-x-0">
                      <div className="relative aspect-[6.7/1] w-full">
                        <Image
                          src={slide.overlayLogo}
                          alt=""
                          aria-hidden="true"
                          fill
                          priority={i === 0}
                          sizes="(max-width: 640px) 62vw, 22vw"
                          className="object-contain drop-shadow-[0_2px_14px_rgba(0,0,0,0.7)]"
                          style={{ objectFit: "contain" }}
                        />
                      </div>
                    </div>
                  )}
                  {/* CTA ámbar — abajo-izquierda (desktop) / centrado (móvil)
                      dentro del wrapper de 1400 px. Lee con contraste
                      máximo sobre zona oscura de cityscape/follaje. */}
                  {slide.overlayCta && (
                    <div
                      className={`absolute z-[2] flex ${
                        slide.ctaPosition ??
                        "top-[58%] left-1/2 -translate-x-1/2 sm:top-[42%] sm:left-[1%] sm:translate-x-0"
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
                </div>
              </div>
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

        {/* Flechas prev/next — solo desktop (>=sm). En móvil navegación
            por swipe gestural. Pegadas a los bordes del viewport con
            fondo sutil semi-transparente + hover glow ámbar (coherente
            con la paleta del CTA). */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Slide anterior"
              className="group absolute top-1/2 left-2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/90 ring-1 ring-white/20 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white hover:ring-amber-300/50 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none sm:left-4 sm:flex"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5 transition-transform group-hover:-translate-x-0.5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 4.293a1 1 0 010 1.414L8.414 10l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Slide siguiente"
              className="group absolute top-1/2 right-2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/90 ring-1 ring-white/20 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white hover:ring-amber-300/50 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none sm:right-4 sm:flex"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 15.707a1 1 0 010-1.414L11.586 10 7.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </>
        )}

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
