import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Store,
  Package2,
  MapPin,
  Truck,
  Mail,
  Phone,
} from "lucide-react";
import { SITE_CONFIG } from "@/config/siteConfig";
import { STORES } from "@/data/stores";
import { MOBILE_GAMES } from "@/data/mobileGames";

const STORE_LIST = Object.values(STORES);

// 3 líneas reales — subpáginas ya existen en /mayoristas/{b2b,franquicias,vending}.
const SOLUTIONS = [
  {
    icon: Building2,
    title: "Cuenta B2B",
    desc: "Alta como cliente profesional: tarifas para empresas, tiendas y vendedores online.",
    cta: "Solicitar cuenta",
    href: "/mayoristas/b2b",
    color: "#2563eb",
  },
  {
    icon: Store,
    title: "Abre tu tienda TCG",
    desc: "Acompañamiento para montar un punto de venta físico con nuestro catálogo.",
    cta: "Saber más",
    href: "/mayoristas/franquicias",
    color: "#0f766e",
  },
  {
    icon: Package2,
    title: "Máquinas Vending TCG",
    desc: "Venta desatendida en centros comerciales y zonas de paso.",
    cta: "Registrar interés",
    href: "/mayoristas/vending",
    color: "#7c3aed",
    badge: "Próximamente",
  },
];

export default function MayoristasPage() {
  return (
    <div className="bg-white">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-[1400px] px-6 text-center">
          <h1 className="mb-3 text-3xl font-bold text-gray-900 md:text-5xl">
            Profesionales
          </h1>
          <p className="mx-auto max-w-2xl text-base text-gray-600 sm:text-lg">
            {SITE_CONFIG.legalName} ({SITE_CONFIG.cif}) es una tienda
            especializada en juegos de cartas coleccionables con 4 tiendas
            físicas en España. Ofrecemos cuenta B2B para empresas, tiendas y
            vendedores online.
          </p>
        </div>
      </section>

      {/* ── Soluciones (líneas reales) ───────────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
            Líneas para profesionales
          </h2>
          <p className="text-gray-500">
            Tres formas de trabajar con nosotros.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {SOLUTIONS.map(({ icon: Icon, title, desc, cta, href, color, badge }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {badge && (
                <span
                  className="absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide text-white uppercase"
                  style={{ backgroundColor: color }}
                >
                  {badge}
                </span>
              )}
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}14`, color }}
              >
                <Icon size={22} />
              </div>
              <h3 className="mb-2 font-bold text-gray-900">{title}</h3>
              <p className="mb-6 flex-1 text-sm leading-relaxed text-gray-500">
                {desc}
              </p>
              <span
                className="inline-flex items-center gap-1 text-sm font-bold transition-all group-hover:gap-2"
                style={{ color }}
              >
                {cta} <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Logística (datos reales desde SITE_CONFIG) ───────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50 py-14">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
              Logística y envíos
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <Truck size={20} className="mb-3 text-[#2563eb]" />
              <h3 className="mb-1 font-bold text-gray-900">
                Envío con {SITE_CONFIG.carrier}
              </h3>
              <p className="text-sm text-gray-500">
                Pedidos expedidos en menos de {SITE_CONFIG.dispatchHours} h tras
                confirmación.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <Truck size={20} className="mb-3 text-[#16a34a]" />
              <h3 className="mb-1 font-bold text-gray-900">
                Envío gratis desde {SITE_CONFIG.shippingThreshold} €
              </h3>
              <p className="text-sm text-gray-500">
                Umbral único aplicado automáticamente al pasar por caja.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <Building2 size={20} className="mb-3 text-[#7c3aed]" />
              <h3 className="mb-1 font-bold text-gray-900">
                Sede en {SITE_CONFIG.address.split(",").slice(-2, -1)[0]?.trim()}
              </h3>
              <p className="text-sm text-gray-500">
                Operamos desde Calpe (Alicante) para toda España.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Catálogo real (juegos que distribuimos) ──────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
            Juegos que distribuimos
          </h2>
          <p className="text-gray-500">
            Los {MOBILE_GAMES.length} juegos disponibles en nuestro catálogo.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {MOBILE_GAMES.map((g) => (
            <Link
              key={g.slug}
              href={`/${g.slug}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            >
              {g.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Tiendas físicas (datos reales) ───────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50 py-14">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
              Nuestras tiendas físicas
            </h2>
            <p className="text-gray-500">
              {STORE_LIST.length} tiendas en España. Visítanos para ver producto
              o hablar de colaboración.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STORE_LIST.map((store) => (
              <Link
                key={store.id}
                href={`/tiendas/${store.id}`}
                className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md"
              >
                <div
                  className="mb-3 h-1 w-10 rounded-full"
                  style={{ backgroundColor: store.color }}
                />
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="font-bold text-gray-900">{store.name}</h3>
                  {store.comingSoon && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                      style={{
                        backgroundColor: store.bg,
                        color: store.color,
                      }}
                    >
                      Próximamente
                    </span>
                  )}
                </div>
                <p
                  className="mb-3 flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: store.color }}
                >
                  <MapPin size={12} /> {store.city}
                </p>
                <p className="line-clamp-2 text-sm leading-relaxed text-gray-500">
                  {store.shortDesc}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/tiendas"
              className="inline-flex items-center gap-1 text-sm font-bold text-[#2563eb] hover:gap-2 hover:underline"
            >
              Ver todas las tiendas <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Contacto real ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
            ¿Hablamos?
          </h2>
          <p className="mb-6 text-gray-500">
            Escríbenos o llámanos para más información sobre cualquier línea
            profesional.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/mayoristas/b2b"
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
            >
              Solicitar cuenta B2B <ArrowRight size={14} />
            </Link>
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Mail size={14} /> {SITE_CONFIG.email}
            </a>
            <a
              href={`tel:${SITE_CONFIG.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Phone size={14} /> {SITE_CONFIG.phone}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
