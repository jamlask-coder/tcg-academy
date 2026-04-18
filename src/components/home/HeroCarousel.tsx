"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { DataHub } from "@/lib/dataHub";
import { getHeroImages } from "@/services/heroImageService";

type Slide = {
  src: string;
  alt: string;
  href?: string;
};

// Defaults cuando no hay imágenes subidas por el admin.
const DEFAULT_SLIDES: Slide[] = [
  { src: "/images/hero/slide-1.png", alt: "Magic: The Gathering x Teenage Mutant Ninja Turtles", href: "/catalogo?game=magic" },
  { src: "/images/hero/slide-2.png", alt: "Secrets of Strixhaven", href: "/catalogo?game=magic" },
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
      <div className="relative mx-auto aspect-[16/9] w-full max-w-[1400px] sm:aspect-[1133/529]">
        {slides.map((slide, i) => {
          const active = i === index;
          const content = (
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="(max-width: 1400px) 100vw, 1400px"
              className="object-cover object-center"
              unoptimized={slide.src.startsWith("data:")}
            />
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
