"use client";
import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { HeroCard } from "@/data/gameHeroData";

interface Props {
  card: HeroCard;
  color: string;
  emoji?: string;
  width?: number;
  height?: number;
  /** Fan rotation degrees (negative = left tilt) */
  fanRotate?: number;
  /** Horizontal offset from center in px */
  fanX?: number;
  /** Vertical offset from center in px (positive = down) */
  fanY?: number;
  zIndex?: number;
  /** Framer-motion entry delay in seconds */
  entryDelay?: number;
  /** Float animation phase offset 0–1 */
  floatPhase?: number;
  /** True when fewer than 5 cards (mobile 3-card mode) */
  compact?: boolean;
}

export function HoloCard({
  card,
  color,
  emoji = "🃏",
  width = 110,
  height = 154,
  fanRotate = 0,
  fanX = 0,
  fanY = 0,
  zIndex = 1,
  entryDelay = 0,
  floatPhase = 0,
  compact = false,
}: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, sx: 50, sy: 50, active: false });
  const [hovered, setHovered] = useState(false);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!innerRef.current) return;
    const rect = innerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setTilt({ rx: (y - 0.5) * 24, ry: -(x - 0.5) * 24, sx: x * 100, sy: y * 100, active: true });
  }, []);

  const onMouseLeave = useCallback(() => {
    setTilt({ rx: 0, ry: 0, sx: 50, sy: 50, active: false });
    setHovered(false);
  }, []);

  const floatDuration = 3.2 + floatPhase * 0.8;
  const floatDelay = floatPhase * 0.5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 70, x: 0, rotate: 0, scale: 0.75 }}
      animate={{ opacity: 1, y: fanY, x: fanX, rotate: fanRotate, scale: 1 }}
      whileHover={{ y: fanY - (compact ? 12 : 20), rotate: fanRotate * 0.25, scale: compact ? 1.08 : 1.12 }}
      transition={{
        opacity: { duration: 0.5, delay: entryDelay },
        y: { type: "spring", stiffness: 200, damping: 22, delay: entryDelay },
        x: { type: "spring", stiffness: 200, damping: 22, delay: entryDelay },
        rotate: { type: "spring", stiffness: 200, damping: 22, delay: entryDelay },
        scale: { type: "spring", stiffness: 300, damping: 25, delay: entryDelay },
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        marginLeft: -(width / 2),
        marginTop: -(height / 2),
        zIndex: hovered ? 50 : zIndex,
        transformOrigin: "bottom center",
        transition: "z-index 0s",
      }}
    >
      {/* Idle float — CSS animation, paused on hover */}
      <div
        style={{
          animation: hovered
            ? "none"
            : `holoFloat ${floatDuration}s ease-in-out ${floatDelay}s infinite alternate`,
        }}
      >
        {/* 3D perspective space */}
        <div style={{ perspective: 800, perspectiveOrigin: "50% 50%" }}>
          {/* Tiltable card face */}
          <div
            ref={innerRef}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            style={{
              width,
              height,
              borderRadius: 10,
              overflow: "hidden",
              position: "relative",
              border: "2px solid rgba(255,255,255,0.75)",
              cursor: "pointer",
              transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
              transition: tilt.active ? "none" : "transform 0.55s cubic-bezier(0.23,1,0.32,1), box-shadow 0.3s",
              boxShadow: tilt.active
                ? `0 28px 55px rgba(0,0,0,0.45), 0 0 35px ${color}55, inset 0 1px 0 rgba(255,255,255,0.3)`
                : `0 14px 28px rgba(0,0,0,0.28), 0 0 14px ${color}30`,
            }}
          >
            {/* Card content */}
            {card.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.imageUrl}
                alt={card.name}
                loading="lazy"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: `linear-gradient(150deg, ${color}28 0%, ${color}70 50%, ${color}45 100%)`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px",
                  gap: 6,
                }}
              >
                {/* Card art placeholder */}
                <div
                  style={{
                    width: "75%",
                    height: "52%",
                    borderRadius: 6,
                    background: `linear-gradient(135deg, ${color}50, rgba(255,255,255,0.12))`,
                    border: "1px solid rgba(255,255,255,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: compact ? 20 : 26,
                  }}
                >
                  {emoji}
                </div>
                <span
                  style={{
                    fontSize: compact ? 7 : 8,
                    fontWeight: 800,
                    color: "rgba(255,255,255,0.95)",
                    textAlign: "center",
                    lineHeight: 1.3,
                    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                    padding: "0 4px",
                  }}
                >
                  {card.name}
                </span>
                {/* Bottom foil-like stripe */}
                <div
                  style={{
                    height: 3,
                    width: "85%",
                    borderRadius: 2,
                    background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)`,
                  }}
                />
              </div>
            )}

            {/* Spotlight — white radial at cursor, no blend mode to avoid color artifacts */}
            {tilt.active && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(ellipse 55% 42% at ${tilt.sx}% ${tilt.sy}%, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.14) 42%, transparent 72%)`,
                  pointerEvents: "none",
                }}
              />
            )}
            {/* Silver sheen band — diagonal white stripe that follows tilt angle */}
            {tilt.active && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(
                    ${-20 + tilt.sx * 0.4}deg,
                    transparent 0%,
                    transparent 28%,
                    rgba(255,255,255,0.10) 38%,
                    rgba(255,255,255,0.22) 48%,
                    rgba(255,255,255,0.10) 58%,
                    transparent 68%,
                    transparent 100%
                  )`,
                  pointerEvents: "none",
                }}
              />
            )}
            {/* Edge gloss */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.06) 100%)`,
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
