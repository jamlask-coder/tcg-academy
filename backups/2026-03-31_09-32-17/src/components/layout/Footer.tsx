import Link from "next/link";
import { Container } from "@/components/ui/Container";

const SOCIAL_LINKS = [
  { label: "Instagram", href: "#", icon: "IG" },
  { label: "YouTube", href: "#", icon: "YT" },
  { label: "TikTok", href: "#", icon: "TK" },
  { label: "Discord", href: "#", icon: "DC" },
  { label: "X", href: "#", icon: "X" },
];

const PAYMENT_METHODS = [
  "Visa",
  "Mastercard",
  "PayPal",
  "Bizum",
  "Transferencia",
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
                <span className="text-sm font-black text-[#1a3a5c]">T</span>
              </div>
              <span className="text-lg font-bold text-white">TCG Academy</span>
            </Link>
            <p className="mb-4 text-xs text-slate-500">
              4 tiendas físicas · Envío en 24h con GLS
            </p>
            <div className="mb-4 flex gap-1.5">
              {SOCIAL_LINKS.map(({ label, href, icon }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-[10px] font-bold text-slate-400 transition-colors hover:bg-white/16 hover:text-white"
                >
                  {icon}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {PAYMENT_METHODS.map((m) => (
                <span
                  key={m}
                  className="rounded-md border border-white/8 bg-white/6 px-2 py-0.5 text-[10px] font-semibold text-slate-400"
                >
                  {m}
                </span>
              ))}
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
            <div className="rounded-md bg-[#f7a800] px-2 py-0.5 text-[10px] font-black text-black">
              GLS
            </div>
            <span className="text-xs text-slate-500">Envío con GLS</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
