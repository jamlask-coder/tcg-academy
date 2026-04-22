import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/data/guides";
import { breadcrumbJsonLd, jsonLdProps } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Guías TCG: aprende desde cero | TCG Academy",
  description:
    "Guías para empezar en Magic, Pokémon, Yu-Gi-Oh y otros TCG. Cómo abrir un Booster Box, cartas gradeadas, glosario, cuidado de cartas y más.",
  alternates: { canonical: "/guias" },
  openGraph: {
    title: "Guías TCG: aprende desde cero",
    description:
      "Guías para empezar en Magic, Pokémon, Yu-Gi-Oh y otros TCG. Cómo abrir un Booster Box, cartas gradeadas y más.",
    url: "/guias",
    type: "website",
  },
};

export default function GuidesHubPage() {
  const sorted = [...GUIDES].sort((a, b) =>
    (b.updatedAt ?? b.publishedAt).localeCompare(a.updatedAt ?? a.publishedAt),
  );

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Inicio", url: "/" },
    { name: "Guías", url: "/guias" },
  ]);

  return (
    <div>
      <script {...jsonLdProps(breadcrumbLd)} />

      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
          <p className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
            TCG Academy
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Guías TCG: aprende desde cero
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600">
            Todo lo que necesitas para empezar, coleccionar y cuidar tus cartas de Magic,
            Pokémon, Yu-Gi-Oh, One Piece y otros TCG. Explicaciones claras, sin relleno.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6">
        <ul className="grid gap-6 sm:grid-cols-2">
          {sorted.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/guias/${g.slug}`}
                className="group block h-full rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-md"
              >
                <p className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                  {g.tag} · {g.readMinutes} min de lectura
                </p>
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-[#2563eb]">
                  {g.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600">
                  {g.description}
                </p>
                <span className="mt-4 inline-block text-sm font-semibold text-[#2563eb]">
                  Leer guía →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
