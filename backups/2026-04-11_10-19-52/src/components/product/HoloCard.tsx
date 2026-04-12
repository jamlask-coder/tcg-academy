"use client";
import { useRef, useCallback, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
  intensity?: "subtle" | "full";
  className?: string;
  /** Set false to render a plain wrapper with no effect */
  active?: boolean;
}

export function HoloCard({
  children,
  intensity = "subtle",
  className = "",
  active = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const maxTilt = intensity === "full" ? 10 : 5;

  const applyVars = useCallback(
    (
      rx: number,
      ry: number,
      mx: number,
      my: number,
      angle: number,
      opacity: number,
    ) => {
      const card = cardRef.current;
      if (!card) return;
      card.style.setProperty("--rx", `${rx}deg`);
      card.style.setProperty("--ry", `${ry}deg`);
      card.style.setProperty("--mx", `${mx}%`);
      card.style.setProperty("--my", `${my}%`);
      card.style.setProperty("--angle", `${angle}deg`);
      card.style.setProperty("--opacity", String(opacity));
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      const card = cardRef.current;
      if (!el || !card) return;
      card.style.transition = "transform 0.08s ease-out";
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rx = (x - 0.5) * maxTilt * 2;
      const ry = (y - 0.5) * -maxTilt * 2;
      const angle = Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 135;
      applyVars(rx, ry, x * 100, y * 100, angle, 1);
    },
    [maxTilt, applyVars],
  );

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (card) card.style.transition = "transform 0.5s ease-out";
    applyVars(0, 0, 50, 50, 135, 0);
  }, [applyVars]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      const card = cardRef.current;
      if (!el || !card || !e.touches[0]) return;
      card.style.transition = "transform 0.08s ease-out";
      const rect = el.getBoundingClientRect();
      const x = (e.touches[0].clientX - rect.left) / rect.width;
      const y = (e.touches[0].clientY - rect.top) / rect.height;
      const rx = (x - 0.5) * maxTilt * 2;
      const ry = (y - 0.5) * -maxTilt * 2;
      const angle = Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 135;
      applyVars(rx, ry, x * 100, y * 100, angle, 1);
    },
    [maxTilt, applyVars],
  );

  const handleTouchEnd = useCallback(() => {
    const card = cardRef.current;
    if (card) card.style.transition = "transform 0.5s ease-out";
    applyVars(0, 0, 50, 50, 135, 0);
  }, [applyVars]);

  if (!active) {
    return <div className={className}>{children}</div>;
  }

  return (
    /* Outer container holds perspective — does NOT rotate */
    <div
      ref={containerRef}
      className={`holo-container ${className}`}
      style={{ perspective: "800px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Inner card — rotates in 3D */}
      <div
        ref={cardRef}
        className="holo-card relative"
        style={
          {
            "--rx": "0deg",
            "--ry": "0deg",
            "--mx": "50%",
            "--my": "50%",
            "--angle": "135deg",
            "--opacity": "0",
            transform: "rotateY(var(--rx)) rotateX(var(--ry))",
            transformStyle: "preserve-3d",
            transition: "transform 0.5s ease-out",
            willChange: "transform",
          } as React.CSSProperties
        }
      >
        {children}

        {/* Rainbow holo gradient — moves with mouse angle */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            background:
              "linear-gradient(var(--angle), transparent 0%, rgba(255,0,0,0.12) 20%, rgba(255,255,0,0.12) 40%, rgba(0,255,0,0.12) 60%, rgba(0,0,255,0.12) 80%, transparent 100%)",
            mixBlendMode: "color-dodge",
            opacity: "var(--opacity)" as unknown as number,
            transition: "opacity 0.3s ease-out",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />

        {/* Radial spotlight — follows cursor */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            background:
              "radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,0.35) 0%, transparent 60%)",
            mixBlendMode: "soft-light",
            opacity: "var(--opacity)" as unknown as number,
            transition: "opacity 0.3s ease-out",
            pointerEvents: "none",
            zIndex: 4,
          }}
        />
      </div>
    </div>
  );
}
