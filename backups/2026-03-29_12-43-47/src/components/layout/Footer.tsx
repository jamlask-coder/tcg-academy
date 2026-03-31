import Link from "next/link";

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
  ["Mayoristas B2B", "/mayoristas"],
  ["Franquicias", "/franquicias"],
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
        className="text-sm text-slate-300 hover:text-white transition-colors duration-150"
      >
        {children}
      </Link>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white">
      <div className="max-w-[1180px] mx-auto px-6 py-8">
        {/* Games row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-6 pb-6 border-b border-white/8">
          {GAMES.map(([label, href], i) => (
            <span key={href} className="flex items-center gap-2">
              {i > 0 && <span className="text-white/20 text-xs">·</span>}
              <Link
                href={href}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                {label}
              </Link>
            </span>
          ))}
        </div>

        {/* 3-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-6">
          {/* Col 1: Brand + social + payment */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md">
                <span className="text-[#1a3a5c] font-black text-sm">T</span>
              </div>
              <span className="text-lg font-bold text-white">TCG Academy</span>
            </Link>
            <p className="text-slate-500 text-xs mb-4">
              4 tiendas físicas · Envío en 24h con GLS
            </p>
            <div className="flex gap-1.5 mb-4">
              {SOCIAL_LINKS.map(({ label, href, icon }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/16 transition-colors flex items-center justify-center text-[10px] font-bold text-slate-400 hover:text-white"
                >
                  {icon}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {PAYMENT_METHODS.map((m) => (
                <span
                  key={m}
                  className="text-[10px] font-semibold text-slate-400 bg-white/6 border border-white/8 px-2 py-0.5 rounded-md"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Col 2: Links */}
          <div>
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-white/40 mb-3">
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
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-white/40 mb-3">
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
        <div className="border-t border-white/8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-slate-500 text-xs">
            © 2026 TCG Academy. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-2">
            <div className="bg-[#f7a800] text-black text-[10px] font-black px-2 py-0.5 rounded-md">
              GLS
            </div>
            <span className="text-slate-500 text-xs">Envío con GLS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
