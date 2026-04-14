"use client";
import { useRef, useCallback, useState, type ReactNode, Children, isValidElement, cloneElement } from "react";

interface Props {
  children?: ReactNode;
  intensity?: "subtle" | "full";
  className?: string;
  active?: boolean;
}

/**
 * Wraps an image block and adds a holographic tilt + shine effect.
 * The holo shimmer is injected as a pseudo-layer clipped to the actual
 * <img> element inside children, so it never bleeds into white space.
 */
export function HoloCard({
  children,
  intensity = "subtle",
  className = "",
  active = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [vars, setVars] = useState({ mx: 50, my: 50, angle: 135, opacity: 0, rx: 0, ry: 0 });
  const maxTilt = intensity === "full" ? 10 : 5;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setVars({
      mx: x * 100, my: y * 100,
      angle: Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 135,
      opacity: 1,
      rx: (x - 0.5) * maxTilt * 2,
      ry: (y - 0.5) * -maxTilt * 2,
    });
  }, [maxTilt]);

  const handleMouseLeave = useCallback(() => {
    setVars({ mx: 50, my: 50, angle: 135, opacity: 0, rx: 0, ry: 0 });
  }, []);

  if (!active) return <div className={className}>{children}</div>;

  // Find the <img> inside children and wrap it with holo overlay
  function wrapChildren(node: ReactNode): ReactNode {
    return Children.map(node, (child) => {
      if (!isValidElement(child)) return child;

      // If it's an img, wrap it in a relative container with the holo overlay clipped to it
      if (child.type === "img") {
        return (
          <span className="relative inline-block">
            {child}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: "6px",
                background: `linear-gradient(${vars.angle}deg,
                  rgba(255,50,50,0.2) 0%, rgba(255,200,50,0.2) 20%,
                  rgba(50,255,50,0.2) 40%, rgba(50,200,255,0.2) 60%,
                  rgba(150,50,255,0.2) 80%, rgba(255,50,100,0.2) 100%)`,
                mixBlendMode: "color-dodge",
                opacity: vars.opacity,
                transition: "opacity 0.3s",
              }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: "6px",
                background: `radial-gradient(circle at ${vars.mx}% ${vars.my}%, rgba(255,255,255,0.5) 0%, transparent 50%)`,
                mixBlendMode: "overlay",
                opacity: vars.opacity,
                transition: "opacity 0.3s",
              }}
            />
          </span>
        );
      }

      // Recurse into children
      if (child.props && typeof child.props === "object" && "children" in child.props) {
        return cloneElement(child, {}, wrapChildren((child.props as { children?: ReactNode }).children));
      }

      return child;
    });
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ perspective: "800px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div style={{
        transform: `rotateY(${vars.rx}deg) rotateX(${vars.ry}deg)`,
        transformStyle: "preserve-3d",
        transition: vars.opacity ? "transform 0.08s ease-out" : "transform 0.5s ease-out",
      }}>
        {wrapChildren(children)}
      </div>
    </div>
  );
}
