import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { CookieSettingsButton } from "@/components/legal/CookieConsent";
import { SITE_CONFIG } from "@/config/siteConfig";

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

const LINKS: [string, string][] = [
  ["Nuestras tiendas", "/tiendas"],
  ["Contacto", "/contacto"],
  ["Vending TCG", "/mayoristas/vending"],
  ["Profesionales B2B", "/mayoristas"],
  ["Abre tu tienda TCG", "/mayoristas/franquicias"],
];

const LEGAL: [string, string][] = [
  ["Aviso legal", "/aviso-legal"],
  ["Política de privacidad", "/privacidad"],
  ["Política de cookies", "/cookies"],
  ["Términos y condiciones", "/terminos"],
  ["Devoluciones y desistimiento", "/devoluciones"],
  ["Reclamaciones", "/reclamaciones"],
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
    <footer className="relative overflow-hidden text-white" style={{ background: "#050810" }}>
      {/* Gradient overlay — lo más claro se concentra en la esquina inferior
          derecha (azul #1e3a8a). La capa superior linear-gradient mantiene el
          borde de arriba al color base para empalmar sin línea con la sección
          anterior. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{
        background: `
          linear-gradient(to bottom, #050810 0%, #050810 80px, rgba(5,8,16,0) 220px),
          radial-gradient(ellipse at 100% 100%, #1e3a8a 0%, transparent 65%),
          radial-gradient(ellipse at 75% 85%, #0c1a3a 0%, transparent 55%),
          radial-gradient(ellipse at 0% 100%, #050810 0%, transparent 60%)
        `,
      }} />

      {/* Shield watermark — sólo móvil. Grande, centrado, muy transparente
          para que el texto se lea bien por encima. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-start justify-center pt-10 sm:hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo-tcg-shield.png"
          alt=""
          className="h-auto w-[115%] max-w-[560px] object-contain opacity-[0.14]"
          style={{ filter: "blur(0.3px)" }}
        />
      </div>
      <Container className="relative z-10 py-8">
{/* Shield watermark is inside the Tienda/Legal section below */}

        {/* Main grid: Brand | Tienda | Legal | Shield */}
        <div className="mb-6 grid gap-8 sm:grid-cols-[2fr_1fr_1fr_auto] sm:gap-12">
          {/* Brand */}
          <div>
            <Link href="/" className="mb-4 hidden items-center gap-2 sm:inline-flex">
              <span className="text-xl font-black tracking-tight text-white">TCG <span className="text-amber-400">Academy</span></span>
            </Link>
            {/* Store socials */}
            <div className="mt-4 space-y-2.5">
              {[
                { store: "Madrid", ig: "tcgacademy.madrid", tt: null },
                { store: "Barcelona", ig: "tcgacademybcn", tt: null },
                { store: "Calpe", ig: "tcgacademycalpe", tt: "tcgacademy" },
                { store: "Béjar", ig: "tcg_academy_bejar", tt: null },
              ].map(({ store, ig, tt }) => (
                <div key={store} className="flex items-center gap-2.5">
                  <span className="w-20 text-xs font-semibold text-slate-400">{store}</span>
                  <a
                    href={`https://instagram.com/${ig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-white/6 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-white/12 hover:text-pink-400"
                  >
                    <IconInstagram /> {ig}
                  </a>
                  {tt && (
                    <a
                      href={`https://tiktok.com/@${tt}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-white/6 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-white/12 hover:text-white"
                    >
                      <IconTikTok /> TikTok
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tienda + Legal — side by side on mobile */}
          <div className="col-span-1 grid grid-cols-2 gap-6 sm:contents">
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
                <li>
                  <CookieSettingsButton />
                </li>
              </ul>
            </div>
          </div>

          {/* Shield + Payment — desktop only (mobile uses watermark) */}
          <div className="hidden flex-col items-center sm:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-tcg-shield.png"
              alt="TCG Academy"
              width={220}
              height={215}
              className="mb-4 opacity-70 transition-opacity hover:opacity-100"
            />
            <div className="flex items-center justify-center gap-3">
              {[
                { src: "/images/payment/bizum.svg", alt: "Bizum", w: 46, h: 16 },
                { src: "/images/payment/visa.svg", alt: "Visa", w: 40, h: 14 },
                { src: "/images/payment/mastercard.svg", alt: "Mastercard", w: 38, h: 24 },
                { src: "/images/payment/paypal.svg", alt: "PayPal", w: 52, h: 16 },
              ].map(({ src, alt, w, h }) => (
                <span key={alt} className="flex h-8 items-center justify-center rounded-md border border-white/10 bg-white px-2">
                  <Image src={src} alt={alt} width={w} height={h} className="object-contain" />
                </span>
              ))}
            </div>
          </div>

          {/* Payment — mobile only (below Tienda/Legal) */}
          <div className="flex items-center justify-center gap-3 sm:hidden">
            {[
              { src: "/images/payment/bizum.svg", alt: "Bizum", w: 46, h: 16 },
              { src: "/images/payment/visa.svg", alt: "Visa", w: 40, h: 14 },
              { src: "/images/payment/mastercard.svg", alt: "Mastercard", w: 38, h: 24 },
              { src: "/images/payment/paypal.svg", alt: "PayPal", w: 52, h: 16 },
            ].map(({ src, alt, w, h }) => (
              <span key={alt} className="flex h-8 items-center justify-center rounded-md border border-white/10 bg-white px-2">
                <Image src={src} alt={alt} width={w} height={h} className="object-contain" />
              </span>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/8 pt-4 text-center">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} {SITE_CONFIG.name}. Todos los derechos reservados.
          </p>
        </div>
      </Container>
    </footer>
  );
}
