"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

type Slide = {
  src: string;
  alt: string;
  href?: string;
};

const SLIDES: Slide[] = [
  { src: "/images/hero/slide-1.png", alt: "Magic: The Gathering x Teenage Mutant Ninja Turtles", href: "/catalogo?game=magic" },
  { src: "/images/hero/slide-2.png", alt: "Secrets of Strixhaven", href: "/catalogo?game=magic" },
];

const AUTOPLAY_MS = 5500;
const FADE_MS = 700;

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((i: number) => {
    setIndex(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <section
      className="relative w-full overflow-hidden bg-[#0a0f1a]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Novedades destacadas"
    >
      <div className="relative mx-auto aspect-[1133/529] w-full max-w-[1400px]">
        {SLIDES.map((slide, i) => {
          const active = i === index;
          const content = (
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="(max-width: 1400px) 100vw, 1400px"
              className="object-cover"
            />
          );
          return (
            <div
              key={slide.src}
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

        {/* Dots */}
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir a slide ${i + 1}`}
              aria-current={i === index}
              className="h-2 rounded-full bg-white/50 transition-all hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{
                width: i === index ? 28 : 10,
                backgroundColor: i === index ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
