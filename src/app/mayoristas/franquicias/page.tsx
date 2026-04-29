import type { Metadata } from "next";
import Link from "next/link";
import {
  Store,
  ArrowRight,
  MapPin,
  Megaphone,
  GraduationCap,
  Boxes,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { SITE_CONFIG } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: "Abre tu tienda TCG en franquicia | TCG Academy",
  description:
    "Abre una tienda física TCG Academy en tu ciudad: marca consolidada, formación, suministro garantizado, software de tienda y campañas locales. Modelo de franquicia para emprendedores del sector cartas coleccionables.",
  alternates: { canonical: "/mayoristas/franquicias" },
};

const BENEFITS = [
  {
    icon: Store,
    title: "Marca consolidada",
    desc: "Aprovecha el reconocimiento de TCG Academy desde el día 1: identidad visual, manual de marca, escaparate físico estandarizado y comunidad activa online.",
  },
  {
    icon: Boxes,
    title: "Suministro prioritario",
    desc: "Acceso al catálogo completo (Magic, Pokémon, Yu-Gi-Oh, One Piece, Lorcana, Riftbound) con tarifas mejores que B2B y reservas anticipadas de novedades.",
  },
  {
    icon: GraduationCap,
    title: "Formación incluida",
    desc: "Onboarding de 2 semanas: gestión de stock, organización de torneos sancionados, atención experta al jugador y peritaje de cartas singles.",
  },
  {
    icon: Megaphone,
    title: "Marketing local",
    desc: "Campañas de captación geolocalizada, presencia en buscador de tiendas oficial, soporte en redes sociales y kit de eventos para lanzamientos.",
  },
  {
    icon: TrendingUp,
    title: "Software de tienda",
    desc: "TPV, inventario sincronizado con web, libro de torneos, peritaje de singles y conexión directa con la central. Cero papel, todo trazable.",
  },
  {
    icon: ShieldCheck,
    title: "Exclusividad por zona",
    desc: "Asignamos área de protección territorial. No abrimos otra franquicia en tu radio mientras la tuya esté activa y cumpla los estándares.",
  },
];

const PERFIL = [
  "Emprendedor con conocimiento del sector TCG (jugador activo, organizador de torneos, ex-empleado de tienda, coleccionista avanzado…)",
  "Capacidad de inversión inicial entre 35.000 € y 60.000 € (local, mobiliario, stock inicial, canon de entrada)",
  "Local comercial a pie de calle de 60-150 m² en ciudad de más de 30.000 habitantes (o área metropolitana)",
  "Disponibilidad para abrir torneos semanales y eventos de lanzamiento de producto",
];

export default function FranquiciasLandingPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-br from-[#ecfdf5] to-white py-14 sm:py-20">
        <div className="mx-auto max-w-[1100px] px-6 text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0f766e]">
            <Store size={12} /> Franquicia TCG
          </span>
          <h1 className="mb-4 text-3xl font-bold text-gray-900 md:text-5xl">
            Abre tu tienda TCG con la marca de referencia
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base text-gray-600 sm:text-lg">
            {SITE_CONFIG.legalName} licencia su modelo de tienda física a
            emprendedores del sector cartas coleccionables. Marca, suministro,
            formación, software y exclusividad territorial — para que abrir
            tienda no sea empezar de cero.
          </p>
          <Link
            href="/mayoristas/franquicias/solicitar"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-6 py-3 font-bold text-white transition hover:bg-[#115e59]"
          >
            Solicitar información <ArrowRight size={18} />
          </Link>
          <p className="mt-3 text-xs text-gray-500">
            Te respondemos por email y, si encajamos, agendamos una visita
            comercial sin compromiso.
          </p>
        </div>
      </section>

      {/* Beneficios */}
      <section className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
            Qué te aporta ser franquicia TCG Academy
          </h2>
          <p className="text-gray-500">
            Todo lo que tardarías años en construir solo, ya hecho.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-6"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-[#0f766e]">
                <Icon size={20} />
              </div>
              <h3 className="mb-1.5 font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Perfil candidato */}
      <section className="border-y border-gray-100 bg-gray-50 py-14">
        <div className="mx-auto max-w-[800px] px-6">
          <h2 className="mb-4 text-center text-2xl font-bold text-gray-900">
            Perfil del franquiciado
          </h2>
          <p className="mb-6 text-center text-sm text-gray-500">
            Buscamos personas que conozcan el sector y quieran convertir su
            pasión en una tienda profesional.
          </p>
          <ul className="space-y-3">
            {PERFIL.map((r) => (
              <li
                key={r}
                className="flex items-start gap-3 rounded-xl bg-white p-4"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-[#0f766e]">
                  <MapPin size={12} />
                </span>
                <span className="text-sm text-gray-700">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-[800px] px-6 py-16 text-center">
        <h2 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">
          ¿Te encaja el modelo?
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-gray-600">
          Cuéntanos quién eres, en qué ciudad piensas abrir y por qué crees que
          tu zona necesita una tienda TCG. Si encajamos, te enviamos el dossier
          completo con cifras, royalties y plan de apertura.
        </p>
        <Link
          href="/mayoristas/franquicias/solicitar"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-6 py-3 font-bold text-white transition hover:bg-[#115e59]"
        >
          Ir al formulario <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
