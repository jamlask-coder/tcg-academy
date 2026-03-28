import Link from "next/link"

const SOCIAL_LINKS = [
  { label: "Instagram", href: "#", icon: "IG" },
  { label: "YouTube",   href: "#", icon: "YT" },
  { label: "TikTok",    href: "#", icon: "TK" },
  { label: "Discord",   href: "#", icon: "DC" },
  { label: "X",         href: "#", icon: "X"  },
]

const PAYMENT_METHODS = ["Visa", "Mastercard", "PayPal", "Bizum", "Transferencia"]

const GAMES = [
  ["Magic: The Gathering", "/magic"],
  ["Pokémon TCG",          "/pokemon"],
  ["One Piece Card Game",  "/one-piece"],
  ["Riftbound",            "/riftbound"],
  ["Topps",                "/topps"],
  ["Disney Lorcana",       "/lorcana"],
  ["Dragon Ball Super CG", "/dragon-ball"],
  ["Yu-Gi-Oh!",            "/yugioh"],
  ["Naruto Mythos",        "/naruto"],
]

const INFORMACION = [
  ["Sobre nosotros",   "/"],
  ["Nuestras tiendas", "/tiendas"],
  ["Eventos",          "/eventos"],
  ["Blog",             "/"],
  ["Contacto",         "/contacto"],
]

const AYUDA = [
  ["Envíos y plazos",          "/contacto"],
  ["Métodos de pago",          "/contacto"],
  ["Política de privacidad",   "/cuenta/datos"],
  ["Términos y condiciones",   "/contacto"],
  ["Cookies",                  "/contacto"],
]

const NEGOCIO = [
  ["Mayoristas B2B",      "/mayoristas"],
  ["Monta tu tienda",     "/franquicias"],
  ["Máquinas Vending",    "/vending"],
  ["Contacto empresas",   "/contacto"],
]

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-bold text-[11px] uppercase tracking-[0.12em] mb-5 text-white/40">
      {children}
    </h3>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-slate-300 hover:text-white transition-colors duration-150 leading-relaxed"
      >
        {children}
      </Link>
    </li>
  )
}

export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white">
      <div className="max-w-[1180px] mx-auto px-6 pt-16 pb-10">

        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-14">

          {/* ── Col 1: Brand ── */}
          <div className="col-span-2 md:col-span-1">
            {/* Logo */}
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-[#1a3a5c] font-black text-base">T</span>
              </div>
              <span className="text-xl font-bold text-white">TCG Academy</span>
            </Link>

            <p className="text-slate-400 text-sm leading-relaxed mb-1">
              La tienda TCG líder en España
            </p>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Pokémon, Magic, One Piece, Riftbound y más.<br />
              4 tiendas físicas · Envío en 24h
            </p>

            {/* Social icons */}
            <div className="flex gap-2 mb-6">
              {SOCIAL_LINKS.map(({ label, href, icon }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl bg-white/8 hover:bg-white/16 transition-colors duration-150 flex items-center justify-center text-[10px] font-bold text-slate-400 hover:text-white"
                >
                  {icon}
                </Link>
              ))}
            </div>

            {/* Payment methods */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Formas de pago</p>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_METHODS.map((method) => (
                  <span
                    key={method}
                    className="text-[10px] font-semibold text-slate-400 bg-white/6 border border-white/8 px-2 py-0.5 rounded-md"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Col 2: Juegos ── */}
          <div>
            <FooterHeading>Juegos</FooterHeading>
            <ul className="space-y-2.5">
              {GAMES.map(([label, href]) => (
                <FooterLink key={href} href={href}>{label}</FooterLink>
              ))}
            </ul>
          </div>

          {/* ── Col 3: Información ── */}
          <div>
            <FooterHeading>Información</FooterHeading>
            <ul className="space-y-2.5">
              {INFORMACION.map(([label, href]) => (
                <FooterLink key={label} href={href}>{label}</FooterLink>
              ))}
            </ul>
          </div>

          {/* ── Col 4: Ayuda ── */}
          <div>
            <FooterHeading>Ayuda</FooterHeading>
            <ul className="space-y-2.5">
              {AYUDA.map(([label, href]) => (
                <FooterLink key={label} href={href}>{label}</FooterLink>
              ))}
            </ul>
          </div>

          {/* ── Col 5: Negocio + Newsletter ── */}
          <div>
            <FooterHeading>Negocio</FooterHeading>
            <ul className="space-y-2.5 mb-8">
              {NEGOCIO.map(([label, href]) => (
                <FooterLink key={label} href={href}>{label}</FooterLink>
              ))}
            </ul>

            <FooterHeading>Newsletter</FooterHeading>
            <form className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="tu@email.com"
                className="h-10 px-3 bg-white/8 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/25 transition"
              />
              <button
                type="submit"
                className="h-10 bg-[#1a3a5c] hover:bg-[#234d7a] text-white font-semibold text-sm rounded-xl transition-colors duration-150"
              >
                Suscribirme
              </button>
            </form>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-xs order-2 sm:order-1">
            © 2026 TCG Academy. Todos los derechos reservados.
          </p>

          {/* GLS badge */}
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <div className="bg-[#f7a800] text-black text-[10px] font-black px-2 py-0.5 rounded-md tracking-wide">
              GLS
            </div>
            <span className="text-slate-500 text-xs">Envío con GLS a toda España</span>
          </div>

          {/* Legal links */}
          <div className="flex items-center gap-4 order-3 text-xs text-slate-600">
            <Link href="/contacto" className="hover:text-slate-400 transition-colors">Privacidad</Link>
            <Link href="/contacto" className="hover:text-slate-400 transition-colors">Términos</Link>
            <Link href="/contacto" className="hover:text-slate-400 transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
