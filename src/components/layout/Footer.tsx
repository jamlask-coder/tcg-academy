import Link from "next/link";
import { Container } from "@/components/ui/Container";

// ─── Social icons (official brand SVGs, monochrome white) ─────────────────────

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.119 18.1.142 18.11a19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
    </svg>
  );
}

// ─── Payment icons (inline SVG, simplified official-style) ────────────────────

function IconVisa() {
  return (
    <svg viewBox="0 0 48 16" className="h-4" aria-label="Visa">
      <text x="0" y="13" fontFamily="Arial" fontWeight="bold" fontSize="14" fill="white" letterSpacing="0.5">VISA</text>
    </svg>
  );
}

function IconMastercard() {
  return (
    <svg viewBox="0 0 38 24" className="h-5" aria-label="Mastercard">
      <circle cx="14" cy="12" r="10" fill="#eb001b" />
      <circle cx="24" cy="12" r="10" fill="#f79e1b" />
      <path d="M19 4.8A10 10 0 0124 12a10 10 0 01-5 7.2A10 10 0 0114 12a10 10 0 015-7.2z" fill="#ff5f00" />
    </svg>
  );
}

function IconPayPal() {
  return (
    <svg viewBox="0 0 60 18" className="h-4" aria-label="PayPal">
      <text x="0" y="13" fontFamily="Arial" fontWeight="bold" fontSize="13" fill="#009cde">Pay</text>
      <text x="24" y="13" fontFamily="Arial" fontWeight="bold" fontSize="13" fill="white">Pal</text>
    </svg>
  );
}

function IconBizum() {
  return (
    <svg viewBox="0 0 52 18" className="h-4" aria-label="Bizum">
      <rect x="0" y="0" width="52" height="18" rx="3" fill="#00c1a0" />
      <text x="6" y="13" fontFamily="Arial" fontWeight="bold" fontSize="11" fill="white">bizum</text>
    </svg>
  );
}

// ─── GLS logo ─────────────────────────────────────────────────────────────────

function IconGLS() {
  return (
    <svg viewBox="0 0 44 18" className="h-4" aria-label="GLS">
      <rect x="0" y="0" width="44" height="18" rx="3" fill="#f7a800" />
      <text x="6" y="13" fontFamily="Arial" fontWeight="900" fontSize="12" fill="#000">GLS</text>
    </svg>
  );
}

const SOCIAL_LINKS = [
  { label: "Instagram", href: "#", Icon: IconInstagram },
  { label: "YouTube", href: "#", Icon: IconYouTube },
  { label: "TikTok", href: "#", Icon: IconTikTok },
  { label: "Discord", href: "#", Icon: IconDiscord },
  { label: "X", href: "#", Icon: IconX },
];

const GAMES: [string, string][] = [
  ["Magic", "/magic"],
  ["Pokémon", "/pokemon"],
  ["One Piece", "/one-piece"],
  ["Riftbound", "/riftbound"],
  ["Topps", "/topps"],
  ["Lorcana", "/lorcana"],
  ["Dragon Ball", "/dragon-ball"],
  ["Yu-Gi-Oh!", "/yugioh"],
  ["Naruto", "/naruto"],
];

const LINKS: [string, string][] = [
  ["Nuestras tiendas", "/tiendas"],
  ["Eventos", "/eventos"],
  ["Contacto", "/contacto"],
  ["Profesionales B2B", "/mayoristas"],
  ["Abre tu tienda TCG", "/mayoristas/franquicias"],
  ["Vending TCG", "/mayoristas/vending"],
];

const LEGAL: [string, string][] = [
  ["Envíos y plazos", "/contacto"],
  ["Política de privacidad", "/cuenta/datos"],
  ["Términos y condiciones", "/contacto"],
  ["Cookies", "/contacto"],
];

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-slate-300 transition-colors duration-150 hover:text-white"
      >
        {children}
      </Link>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white">
      <Container className="py-8">
        {/* Games row */}
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-white/8 pb-6">
          {GAMES.map(([label, href], i) => (
            <span key={href} className="flex items-center gap-2">
              {i > 0 && <span className="text-xs text-white/20">·</span>}
              <Link
                href={href}
                className="text-xs text-slate-400 transition-colors hover:text-white"
              >
                {label}
              </Link>
            </span>
          ))}
        </div>

        {/* 3-column grid */}
        <div className="mb-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Col 1: Brand + social + payment */}
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-md">
                <span className="text-sm font-black text-[#2563eb]">T</span>
              </div>
              <span className="text-lg font-bold text-white">TCG Academy</span>
            </Link>
            <p className="mb-4 text-xs text-slate-500">
              4 tiendas físicas · Envío en 24h con GLS
            </p>
            {/* Social icons */}
            <div className="mb-4 flex gap-1.5">
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-slate-400 transition-colors hover:bg-white/16 hover:text-white"
                >
                  <Icon />
                </Link>
              ))}
            </div>
            {/* Payment logos */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-7 items-center rounded-md border border-white/10 bg-white/6 px-2.5">
                <IconVisa />
              </span>
              <span className="flex h-7 items-center rounded-md border border-white/10 bg-white/6 px-2">
                <IconMastercard />
              </span>
              <span className="flex h-7 items-center rounded-md border border-white/10 bg-white/6 px-2">
                <IconPayPal />
              </span>
              <span className="flex h-7 items-center rounded-md border border-white/10 bg-white/6 px-2">
                <IconBizum />
              </span>
              <span className="rounded-md border border-white/8 bg-white/6 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                Transferencia
              </span>
            </div>
          </div>

          {/* Col 2: Links */}
          <div>
            <h3 className="mb-3 text-[10px] font-bold tracking-widest text-white/40 uppercase">
              Tienda
            </h3>
            <ul className="space-y-2">
              {LINKS.map(([label, href]) => (
                <FooterLink key={href} href={href}>
                  {label}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* Col 3: Legal */}
          <div>
            <h3 className="mb-3 text-[10px] font-bold tracking-widest text-white/40 uppercase">
              Legal
            </h3>
            <ul className="space-y-2">
              {LEGAL.map(([label, href]) => (
                <FooterLink key={label} href={href}>
                  {label}
                </FooterLink>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-white/8 pt-4 sm:flex-row">
          <p className="text-xs text-slate-500">
            © 2026 TCG Academy. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-2">
            <IconGLS />
            <span className="text-xs text-white">Envío con GLS</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
