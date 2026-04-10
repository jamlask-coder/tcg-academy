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


// ─── Payment icons (inline SVG, official-style) ───────────────────────────────

function IconVisa() {
  return (
    <svg viewBox="0 0 52 18" className="h-4" aria-label="Visa">
      <rect x="0" y="0" width="52" height="18" rx="3" fill="#1a1f71"/>
      <text x="6" y="13" fontFamily="Arial,sans-serif" fontWeight="bold" fontStyle="italic" fontSize="13" fill="white" letterSpacing="1">VISA</text>
    </svg>
  );
}

function IconMastercard() {
  return (
    <svg viewBox="0 0 38 24" className="h-5" aria-label="Mastercard">
      <circle cx="14" cy="12" r="10" fill="#eb001b"/>
      <circle cx="24" cy="12" r="10" fill="#f79e1b"/>
      <path d="M19 4.8A10 10 0 0124 12a10 10 0 01-5 7.2A10 10 0 0114 12a10 10 0 015-7.2z" fill="#ff5f00"/>
    </svg>
  );
}

function IconPayPal() {
  return (
    <svg viewBox="0 0 72 20" className="h-4" aria-label="PayPal">
      <text x="0" y="14" fontFamily="Arial,sans-serif" fontWeight="900" fontSize="14" fill="#009cde">Pay</text>
      <text x="27" y="14" fontFamily="Arial,sans-serif" fontWeight="900" fontSize="14" fill="#012169">Pal</text>
    </svg>
  );
}

function IconBizum() {
  return (
    <svg viewBox="0 0 64 20" className="h-4" aria-label="Bizum">
      <rect x="0" y="0" width="64" height="20" rx="4" fill="#00c4a7"/>
      <text x="8" y="14" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="11" fill="white" letterSpacing="0.5">bizum</text>
    </svg>
  );
}

// ─── GLS logo ─────────────────────────────────────────────────────────────────

function IconGLS() {
  return (
    <svg viewBox="0 0 44 18" className="h-4" aria-label="GLS">
      <rect x="0" y="0" width="44" height="18" rx="3" fill="rgba(255,255,255,0.15)" />
      <text x="6" y="13" fontFamily="Arial" fontWeight="900" fontSize="12" fill="#ffffff">GLS</text>
    </svg>
  );
}

const SOCIAL_LINKS = [
  { label: "Instagram", href: "#", Icon: IconInstagram },
  { label: "TikTok", href: "#", Icon: IconTikTok },
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
  ["Política de privacidad", "/privacidad"],
  ["Términos y condiciones", "/terminos"],
  ["Cookies", "/privacidad"],
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-tcg-shield.svg" alt="TCG Academy" style={{ height: 32, width: "auto" }} />
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
