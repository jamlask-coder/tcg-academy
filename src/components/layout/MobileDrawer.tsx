"use client";
import { useState } from "react";
import Link from "next/link";
import { X, User, LogOut, ChevronDown } from "lucide-react";
import { CATEGORY_LABELS, getAllCategories } from "@/data/products";
import {
  MOBILE_GAMES as DRAWER_GAMES,
  MOBILE_GAMES_SPRITE_SRC as SPRITE_SRC,
  MOBILE_GAMES_SPRITE_H as SPRITE_H,
} from "@/data/mobileGames";

interface UserData {
  name: string;
  email?: string;
  role?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  user: UserData | null;
  logout: () => void;
  pathname: string;
}

export function MobileDrawer({ open, onClose, user, logout, pathname }: Props) {
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(105);

  // Measure the real header height to match exactly
  useState(() => {
    if (typeof document === "undefined") return;
    const header = document.querySelector("header");
    if (header) setHeaderHeight(header.offsetHeight);
  });

  const handleClose = () => { setExpandedGame(null); onClose(); };

  return (
    <div className="fixed inset-0 z-[100] lg:hidden" style={{ pointerEvents: open ? "auto" : "none" }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="absolute top-0 left-0 flex h-full w-[88vw] max-w-[380px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out"
        style={{ transform: open ? "translateX(0)" : "translateX(-100%)" }}
      >
        {/* ── HEADER AZUL — con escudo, misma altura que header principal ── */}
        <div
          className="relative flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0a0f1a 0%, #1e3a8a 50%, #2563eb 100%)", minHeight: headerHeight }}
        >
          <button
            onClick={handleClose}
            className="absolute top-2 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
          <div className="flex items-center py-3">
            <div className="flex w-1/2 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-tcg-shield-trimmed.png"
                alt="TCG Academy"
                className="drop-shadow-2xl"
                style={{ width: 107, height: 120, objectFit: "contain", flexShrink: 0 }}
              />
            </div>
            <div className="flex flex-1 flex-col items-center gap-1.5">
              {user ? (
                <>
                  <p className="text-base font-bold text-white">
                    Hola, <span className="text-amber-300">{user.name.split(" ")[0]}</span>
                  </p>
                  <Link
                    href={user.role === "admin" ? "/admin" : "/cuenta/datos"}
                    onClick={handleClose}
                    className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-white/25"
                  >
                    <User size={14} />
                    {user.role === "admin" ? "Panel Admin" : "Mi cuenta"}
                  </Link>
                  <button
                    onClick={() => { logout(); handleClose(); }}
                    className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white active:scale-[0.97]"
                    aria-label="Cerrar sesión"
                  >
                    <LogOut size={13} />
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={handleClose}
                    className="w-full max-w-[160px] rounded-full bg-amber-400 px-5 py-2.5 text-center text-sm font-black text-gray-900 shadow-lg transition hover:bg-amber-300 active:scale-[0.97]"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/registro"
                    onClick={handleClose}
                    className="w-full max-w-[160px] rounded-full border-2 border-white/30 px-5 py-2 text-center text-sm font-bold text-white transition hover:border-white/50 hover:bg-white/10 active:scale-[0.97]"
                  >
                    Registrarse
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Games grid — 2 columns, edge-to-edge, big logos */}
          <div className="px-2 pt-3 pb-4">
            <div className="grid grid-cols-2 gap-1.5">
              {DRAWER_GAMES.map((game) => {
                const { slug, label, bg, logo, filter, blend, maxH, sprite } = game;
                const isExpanded = expandedGame === slug;
                const categories = getAllCategories(slug);

                // Sprite: scale to fit 56px tall
                const spriteScale = sprite ? 56 / SPRITE_H : 1;
                const spriteW = sprite ? sprite.origW * spriteScale : 0;
                const spriteX = sprite ? sprite.origX * spriteScale : 0;

                return (
                  <div key={slug} className={isExpanded ? "col-span-2" : ""}>
                    <button
                      type="button"
                      onClick={() => setExpandedGame(isExpanded ? null : slug)}
                      className="flex w-full items-center justify-center overflow-hidden rounded-xl transition-all duration-200 active:scale-[0.97]"
                      style={{ background: bg, WebkitTapHighlightColor: "transparent" }}
                      aria-label={label}
                    >
                      <div className="flex w-full items-center justify-center px-1.5" style={{ minHeight: 74 }}>
                        {sprite ? (
                          /* Sprite-based logo (same as desktop navbar) */
                          <div
                            role="img"
                            aria-label={label}
                            style={{
                              width: spriteW,
                              height: 56,
                              maxWidth: isExpanded ? "45%" : "90%",
                              backgroundImage: `url(${SPRITE_SRC})`,
                              backgroundSize: `auto ${56}px`,
                              backgroundPosition: `-${spriteX}px 0`,
                              backgroundRepeat: "no-repeat",
                              filter: sprite.filter ?? undefined,
                            }}
                          />
                        ) : (
                          /* Individual logo file */
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={logo}
                            alt={label}
                            className="w-auto object-contain"
                            style={{
                              maxHeight: maxH ?? 56,
                              maxWidth: isExpanded ? "45%" : "92%",
                              filter: filter ?? undefined,
                              mixBlendMode: blend ? "multiply" : undefined,
                            }}
                            onError={(e) => {
                              const t = e.target as HTMLImageElement;
                              t.style.display = "none";
                              const s = document.createElement("span");
                              s.className = "text-sm font-bold text-gray-700";
                              s.textContent = label;
                              t.parentElement?.appendChild(s);
                            }}
                          />
                        )}
                        {isExpanded && (
                          <ChevronDown size={16} className="ml-2 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Categories dropdown */}
                    {isExpanded && categories.length > 0 && (
                      <div
                        className="mt-1.5 mb-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
                        style={{ animation: "mobileSlideDown 0.25s ease-out" }}
                      >
                        <Link
                          href={`/${slug}`}
                          onClick={handleClose}
                          className="flex items-center border-b border-gray-100 px-4 py-2.5 text-sm font-bold text-[#2563eb] transition active:bg-gray-50"
                        >
                          Ver todo {label}
                        </Link>
                        {categories.map((cat, i) => (
                          <Link
                            key={cat}
                            href={`/${slug}/${cat}`}
                            onClick={handleClose}
                            className={`flex items-center px-4 py-2.5 text-sm transition active:bg-gray-50 ${
                              pathname === `/${slug}/${cat}` ? "font-semibold text-[#2563eb]" : "text-gray-600"
                            } ${i < categories.length - 1 ? "border-b border-gray-50" : ""}`}
                          >
                            {CATEGORY_LABELS[cat] ?? cat}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-8" />
        </div>
      </div>

      <style>{`
        @keyframes mobileSlideDown {
          0% { max-height: 0; opacity: 0; }
          100% { max-height: 600px; opacity: 1; }
        }
        @keyframes mobileShimmer {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes mobilePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15) rotate(5deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="mobileShimmer"], [class*="mobilePulse"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
