import type { Metadata } from "next";
import Link from "next/link";
import {
  Package2,
  ArrowRight,
  MapPin,
  Boxes,
  Wrench,
  Banknote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SITE_CONFIG } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: "Máquinas vending de cartas TCG | TCG Academy",
  description:
    "Instalamos máquinas vending de sobres TCG (Pokémon, Magic, Yu-Gi-Oh, One Piece) en centros comerciales, salones recreativos, tiendas y eventos. Reposición, mantenimiento y reparto de ingresos llave en mano.",
  alternates: { canonical: "/mayoristas/vending" },
};

const BENEFITS = [
  {
    icon: Boxes,
    title: "Producto que vende solo",
    desc: "Sobres oficiales de Pokémon, Magic, Yu-Gi-Oh y One Piece. Producto de impulso con margen alto y rotación demostrada en zonas con público joven y familiar.",
  },
  {
    icon: Wrench,
    title: "Mantenimiento incluido",
    desc: "Nosotros llevamos la máquina, la reposición de stock, la limpieza y el servicio técnico. Tú solo cedes la ubicación y cobras tu parte del beneficio.",
  },
  {
    icon: Banknote,
    title: "Reparto transparente",
    desc: "Liquidación mensual con dashboard en tiempo real: ventas por máquina, stock restante y comisión devengada. Sin sorpresas, sin asteriscos.",
  },
  {
    icon: Sparkles,
    title: "Imagen cuidada",
    desc: "Vinilos personalizables, iluminación LED y diseño anti-vandalismo. La máquina suma a la estética del local, no le resta.",
  },
  {
    icon: ShieldCheck,
    title: "Producto oficial garantizado",
    desc: "Cero falsificaciones, todo trazable. Cumplimos con la normativa de máquinas expendedoras y emitimos factura legal por cada operación.",
  },
  {
    icon: Package2,
    title: "Sin inversión inicial",
    desc: "Modelo de cesión: pones el espacio y la corriente, nosotros ponemos la máquina y el stock. Comisión sobre ventas desde el primer sobre vendido.",
  },
];

const UBICACIONES = [
  "Centros comerciales con flujo familiar",
  "Salones recreativos, boleras y cines",
  "Tiendas de cómics, manga o juguetería",
  "Hostelería con público joven (cafeterías gaming, kebabs cerca de institutos)",
  "Eventos puntuales: ferias TCG, comic-cons, torneos",
];

export default function VendingLandingPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-br from-[#f5f3ff] to-white py-14 sm:py-20">
        <div className="mx-auto max-w-[1100px] px-6 text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#7c3aed]">
            <Package2 size={12} /> Vending TCG
          </span>
          <h1 className="mb-4 text-3xl font-bold text-gray-900 md:text-5xl">
            Máquinas vending de sobres TCG
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base text-gray-600 sm:text-lg">
            {SITE_CONFIG.legalName} instala máquinas vending de cartas
            coleccionables en tu local o evento. Producto oficial, reposición
            llave en mano y reparto transparente de ingresos. Tú aportas la
            ubicación, nosotros el resto.
          </p>
          <Link
            href="/mayoristas/vending/solicitar"
            className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-6 py-3 font-bold text-white transition hover:bg-[#6d28d9]"
          >
            Proponer ubicación <ArrowRight size={18} />
          </Link>
          <p className="mt-3 text-xs text-gray-500">
            Estudiamos cada propuesta y te respondemos en 5-7 días laborables.
          </p>
        </div>
      </section>

      {/* Beneficios */}
      <section className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
            Cómo funciona el modelo vending
          </h2>
          <p className="text-gray-500">
            Ingreso pasivo real. Sin stock que gestionar, sin caja que cuadrar.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-6"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-[#7c3aed]">
                <Icon size={20} />
              </div>
              <h3 className="mb-1.5 font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ubicaciones objetivo */}
      <section className="border-y border-gray-100 bg-gray-50 py-14">
        <div className="mx-auto max-w-[800px] px-6">
          <h2 className="mb-4 text-center text-2xl font-bold text-gray-900">
            Qué ubicaciones nos interesan
          </h2>
          <p className="mb-6 text-center text-sm text-gray-500">
            Buscamos espacios con tráfico de público objetivo TCG: jóvenes,
            familias y aficionados al gaming.
          </p>
          <ul className="space-y-3">
            {UBICACIONES.map((u) => (
              <li
                key={u}
                className="flex items-start gap-3 rounded-xl bg-white p-4"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-[#7c3aed]">
                  <MapPin size={12} />
                </span>
                <span className="text-sm text-gray-700">{u}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-[800px] px-6 py-16 text-center">
        <h2 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">
          ¿Tienes una buena ubicación?
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-gray-600">
          Cuéntanos qué espacio propones, qué tipo de público pasa por ahí y
          cuántas horas abre al día. Si la ubicación encaja, vamos a verla y te
          presentamos la propuesta económica concreta.
        </p>
        <Link
          href="/mayoristas/vending/solicitar"
          className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-6 py-3 font-bold text-white transition hover:bg-[#6d28d9]"
        >
          Ir al formulario <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
