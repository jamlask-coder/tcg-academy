import Link from "next/link";
import type { Metadata } from "next";
import {
  Coins,
  ShieldCheck,
  Clock,
  PackageCheck,
  ArrowRight,
  Sparkles,
  Scale,
  HelpCircle,
} from "lucide-react";
import { SITE_CONFIG } from "@/config/siteConfig";

// BORRADOR — página del servicio de compra de colecciones / cartas sueltas.
// Contenido inventado como punto de partida: tono claro, pasos simples,
// llamadas a la acción hacia /contacto. Pendiente de que el usuario revise
// copys, cifras y condiciones antes de publicar.
export const metadata: Metadata = {
  title: "Compramos tus cartas",
  description:
    "Vendemos y compramos cartas y colecciones TCG. Tasación gratuita, pago rápido y transparente. Magic, Pokémon, Yu-Gi-Oh, One Piece y más.",
  alternates: { canonical: "/compramos-tus-cartas" },
  keywords: [
    "vender cartas TCG",
    "comprar colección Magic",
    "tasación cartas Pokémon",
    "vender cartas Yu-Gi-Oh",
    "tienda compra colecciones",
    "tasación gratuita TCG",
  ],
  openGraph: {
    title: "Compramos tus cartas | TCG Academy",
    description:
      "Tasación gratuita y pago rápido. Magic, Pokémon, Yu-Gi-Oh, One Piece y más.",
    url: "/compramos-tus-cartas",
    type: "article",
  },
  robots: { index: true, follow: true },
};

const STEPS = [
  {
    n: 1,
    title: "Envíanos tu lista",
    body:
      "Mándanos fotos o un Excel con lo que quieres vender. Aceptamos cartas sueltas, decks completos, cajas selladas y colecciones enteras.",
  },
  {
    n: 2,
    title: "Tasación gratuita",
    body:
      "Te enviamos una oferta en menos de 48 h. Precios basados en mercado (Cardmarket + histórico interno), sin compromiso.",
  },
  {
    n: 3,
    title: "Envío o entrega en tienda",
    body:
      "Si aceptas, te damos una etiqueta de envío prepagada o puedes traerlo a cualquiera de nuestras 4 tiendas.",
  },
  {
    n: 4,
    title: "Pago en 24 h",
    body:
      "Una vez recibido y comprobado, te pagamos por transferencia, Bizum o saldo con bonus del 10 % extra para gastar en TCG Academy.",
  },
];

const WHAT_WE_BUY = [
  "Cartas sueltas Magic, Pokémon, Yu-Gi-Oh, One Piece, Lorcana, Dragon Ball Fusion, Riftbound",
  "Colecciones completas y herencias",
  "Cajas selladas (boosters, ETB, bundles, colecciones especiales)",
  "Cartas graded (PSA, BGS, CGC)",
  "Lotes y restos de tienda",
];

const WHY_US = [
  {
    icon: ShieldCheck,
    title: "Tasación honesta",
    body:
      "Usamos precios de mercado actualizados a diario. Te enseñamos los comparables de cada carta.",
  },
  {
    icon: Clock,
    title: "Pago rápido",
    body: "Transferencia o Bizum en menos de 24 h desde la recepción.",
  },
  {
    icon: PackageCheck,
    title: "Envío a nuestro cargo",
    body:
      "A partir de 150 € tasados te enviamos una etiqueta prepagada y asegurada.",
  },
  {
    icon: Sparkles,
    title: "Bonus en tienda",
    body:
      "Elige cobrar en saldo TCG Academy y te añadimos un 10 % extra sobre la tasación.",
  },
];

const FAQ = [
  {
    q: "¿Qué cartas no compráis?",
    a:
      "Cartas con daños severos (rasgaduras, quemaduras, humedad), falsificaciones y lotes cuyos precios individuales no superen 0,10 € por carta.",
  },
  {
    q: "¿Cómo calculáis el precio?",
    a:
      "Tomamos el trend de Cardmarket de los últimos 7 días y le aplicamos un porcentaje según estado y demanda real. Con graded usamos población PSA/BGS y comparables recientes.",
  },
  {
    q: "¿Puedo ver la oferta antes de mandar nada?",
    a:
      "Sí. Siempre hacemos tasación previa con fotos o lista. Si no te convence, no envías nada y listos.",
  },
  {
    q: "¿Acepto ofertas anónimas?",
    a:
      "Por transparencia fiscal (somos una empresa con CIF y obligación de facturar compras > 500 €), necesitamos NIF y nombre. Guardamos tus datos cifrados y no los compartimos con nadie.",
  },
];

export default function ComprarCartasPage() {
  return (
    <div>
      {/* Hero */}
      <div className="border-b border-gray-100 bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-[1100px] px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2563eb]/20 bg-[#2563eb]/5 px-3 py-1 text-xs font-bold tracking-widest text-[#2563eb] uppercase">
            <Coins size={14} /> Servicio de compra
          </div>
          <h1 className="mb-4 text-3xl font-bold text-gray-900 md:text-5xl">
            Compramos tus cartas
          </h1>
          <p className="mx-auto max-w-2xl text-base text-gray-600 sm:text-lg">
            Tasación gratuita y sin compromiso. Pago en 24 h o saldo con bonus
            del 10 % extra. Más de{" "}
            <span className="font-black text-gray-900">15 000 € mensuales</span>{" "}
            en compras a coleccionistas de toda España.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/contacto?motivo=comprar-cartas"
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-gray-900 transition hover:bg-amber-300"
            >
              Pedir tasación gratuita <ArrowRight size={16} />
            </Link>
            <Link
              href="/tiendas"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-bold text-gray-700 transition hover:border-[#2563eb] hover:text-[#2563eb]"
            >
              Ir a una tienda
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Borrador — copys y cifras provisionales, pendiente de revisión.
          </p>
        </div>
      </div>

      {/* Pasos */}
      <section className="mx-auto max-w-[1100px] px-6 py-16">
        <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
          Cómo funciona
        </h2>
        <p className="mb-8 text-gray-600">
          Cuatro pasos sencillos. Sin papeleo innecesario, sin letras pequeñas.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#2563eb] hover:shadow-md"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#2563eb] text-sm font-black text-white">
                {s.n}
              </div>
              <h3 className="mb-1 text-base font-bold text-gray-900">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Qué compramos */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-[1100px] px-6">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
            Qué compramos
          </h2>
          <p className="mb-6 text-gray-600">
            Prácticamente cualquier cosa TCG en buen estado. Si tienes dudas,
            escríbenos primero.
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {WHAT_WE_BUY.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <PackageCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-[#2563eb]"
                />
                <span className="text-sm text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Por qué nosotros */}
      <section className="mx-auto max-w-[1100px] px-6 py-16">
        <h2 className="mb-8 text-2xl font-bold text-gray-900 md:text-3xl">
          Por qué vendernos a nosotros
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          {WHY_US.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Icon size={20} />
              </div>
              <div>
                <h3 className="mb-1 text-base font-bold text-gray-900">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-[900px] px-6">
          <div className="mb-8 flex items-center gap-3">
            <HelpCircle size={22} className="text-[#2563eb]" />
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Preguntas frecuentes
            </h2>
          </div>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border border-gray-200 bg-white px-5 py-4 transition open:border-[#2563eb]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-gray-900">
                  <span>{q}</span>
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-gray-400 transition group-open:rotate-90"
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-gradient-to-br from-[#0a1432] to-[#0a1024] py-16 text-white">
        <div className="mx-auto max-w-[900px] px-6 text-center">
          <Scale size={32} className="mx-auto mb-4 text-amber-400" />
          <h2 className="mb-3 text-2xl font-bold md:text-3xl">
            ¿Listo para vender?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-blue-200">
            Envíanos tu lista o fotos. Te respondemos en menos de 48 h con una
            oferta transparente.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/contacto?motivo=comprar-cartas"
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-gray-900 transition hover:bg-amber-300"
            >
              Pedir tasación <ArrowRight size={16} />
            </Link>
            <a
              href={`mailto:${SITE_CONFIG.email}?subject=Quiero%20vender%20cartas`}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Escribir a {SITE_CONFIG.email}
            </a>
          </div>
          <p className="mt-6 text-xs text-blue-300/70">
            TCG Academy · {SITE_CONFIG.cif} · Compras con factura cuando legal
            y fiscalmente procede.
          </p>
        </div>
      </section>
    </div>
  );
}
