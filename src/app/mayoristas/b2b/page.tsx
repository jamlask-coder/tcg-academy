import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  ArrowRight,
  Receipt,
  Percent,
  Truck,
  Headphones,
  ShieldCheck,
  Boxes,
} from "lucide-react";
import { SITE_CONFIG } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: "Cuenta B2B para tiendas y vendedores online | TCG Academy",
  description:
    "Da de alta tu cuenta profesional con TCG Academy: tarifas mayorista, factura sin recargo, envíos prioritarios y ejecutivo de cuenta dedicado. Catálogo completo Magic, Pokémon, Yu-Gi-Oh, One Piece y más.",
  alternates: { canonical: "/mayoristas/b2b" },
};

const BENEFITS = [
  {
    icon: Percent,
    title: "Tarifas mayorista",
    desc: "Precios escalonados por volumen. Cuanto más compras, mejores condiciones. Visibles en el catálogo en cuanto activamos tu cuenta.",
  },
  {
    icon: Receipt,
    title: "Factura sin recargo",
    desc: "Facturación SII/VeriFactu cumpliendo con la AEAT. Si estás en recargo de equivalencia, indícalo en la solicitud y se aplica automáticamente.",
  },
  {
    icon: Truck,
    title: "Envío prioritario",
    desc: `Pedidos B2B salen en menos de ${SITE_CONFIG.dispatchHours}h con seguimiento ${SITE_CONFIG.carrier}. Embalaje protegido para pedidos grandes y palets.`,
  },
  {
    icon: Headphones,
    title: "Ejecutivo de cuenta",
    desc: "Persona de contacto fija que conoce tu negocio. Reservas anticipadas de novedades, alertas de stock y resolución por WhatsApp/email.",
  },
  {
    icon: Boxes,
    title: "Catálogo completo",
    desc: "Magic, Pokémon, Yu-Gi-Oh, One Piece, Dragon Ball, Lorcana, Riftbound. Sobres sueltos, displays, cajas selladas y reservas de preventa.",
  },
  {
    icon: ShieldCheck,
    title: "Producto oficial",
    desc: "Distribución autorizada por las marcas. Cero falsificaciones, todo trazable. Devolución por defecto de fábrica sin coste.",
  },
];

const REQUISITOS = [
  "CIF de empresa o NIF de autónomo en alta de Hacienda",
  "Actividad económica relacionada (CNAE 4778, 4791, 4719…)",
  "Tienda física, ecommerce activo o canal de venta documentable",
];

export default function B2BLandingPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-br from-[#f0f6ff] to-white py-14 sm:py-20">
        <div className="mx-auto max-w-[1100px] px-6 text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#2563eb]">
            <Building2 size={12} /> Cuenta B2B
          </span>
          <h1 className="mb-4 text-3xl font-bold text-gray-900 md:text-5xl">
            Tu canal mayorista de TCG en España
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base text-gray-600 sm:text-lg">
            {SITE_CONFIG.legalName} ({SITE_CONFIG.cif}) es proveedor B2B de
            cartas coleccionables para tiendas, ecommerce, asociaciones y
            distribuidores. Tarifas profesionales, facturación legal y stock
            fiable.
          </p>
          <Link
            href="/mayoristas/b2b/solicitar"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            Solicitar cuenta B2B <ArrowRight size={18} />
          </Link>
          <p className="mt-3 text-xs text-gray-500">
            Activación en 24-48h laborables tras validación de datos fiscales.
          </p>
        </div>
      </section>

      {/* Beneficios */}
      <section className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
            Qué consigues al ser B2B
          </h2>
          <p className="text-gray-500">
            Lo que tu cliente final no ve: condiciones reales para revender.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-6"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-[#2563eb]">
                <Icon size={20} />
              </div>
              <h3 className="mb-1.5 font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Requisitos */}
      <section className="border-y border-gray-100 bg-gray-50 py-14">
        <div className="mx-auto max-w-[800px] px-6">
          <h2 className="mb-4 text-center text-2xl font-bold text-gray-900">
            Requisitos para activar la cuenta
          </h2>
          <ul className="space-y-3">
            {REQUISITOS.map((r) => (
              <li
                key={r}
                className="flex items-start gap-3 rounded-xl bg-white p-4"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#2563eb]">
                  ✓
                </span>
                <span className="text-sm text-gray-700">{r}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-xs text-gray-500">
            Si tu caso no encaja exactamente, escríbenos a{" "}
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              className="font-semibold text-[#2563eb] hover:underline"
            >
              {SITE_CONFIG.email}
            </a>{" "}
            antes de solicitar.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-[800px] px-6 py-16 text-center">
        <h2 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">
          ¿Listo para empezar?
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-gray-600">
          El formulario tarda unos 5 minutos. Te confirmamos por email en menos
          de 48h laborables y te asignamos un ejecutivo de cuenta.
        </p>
        <Link
          href="/mayoristas/b2b/solicitar"
          className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 font-bold text-white transition hover:bg-[#1d4ed8]"
        >
          Ir al formulario <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
