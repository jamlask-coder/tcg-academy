import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, getGuideBySlug } from "@/data/guides";
import { GAME_CONFIG } from "@/data/products";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  jsonLdProps,
} from "@/lib/seo";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: "Guía no encontrada | TCG Academy" };
  const canonical = `/guias/${guide.slug}`;
  return {
    title: `${guide.title} | TCG Academy`,
    description: guide.description,
    alternates: { canonical },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: canonical,
      type: "article",
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt ?? guide.publishedAt,
      images: guide.image ? [{ url: guide.image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description,
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const url = `/guias/${guide.slug}`;

  const articleLd = articleJsonLd({
    title: guide.title,
    description: guide.description,
    url,
    image: guide.image,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    type: "BlogPosting",
  });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Inicio", url: "/" },
    { name: "Guías", url: "/guias" },
    { name: guide.title, url },
  ]);

  const related = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);

  return (
    <article>
      <script {...jsonLdProps(articleLd)} />
      <script {...jsonLdProps(breadcrumbLd)} />

      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[760px] px-4 py-8 sm:px-6 sm:py-12">
          <nav className="mb-4 text-xs text-gray-500">
            <Link href="/guias" className="hover:text-gray-700">
              ← Todas las guías
            </Link>
          </nav>
          <p className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
            {guide.tag} · {guide.readMinutes} min de lectura
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {guide.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-gray-600">
            {guide.intro}
          </p>
          <p className="mt-4 text-xs text-gray-400">
            Publicado el{" "}
            <time dateTime={guide.publishedAt}>
              {new Date(guide.publishedAt).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
            {guide.updatedAt && guide.updatedAt !== guide.publishedAt && (
              <>
                {" · Actualizado el "}
                <time dateTime={guide.updatedAt}>
                  {new Date(guide.updatedAt).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              </>
            )}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[760px] px-4 py-10 sm:px-6">
        <div className="space-y-8">
          {guide.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="mb-3 text-xl font-bold text-gray-900 sm:text-2xl">
                {s.heading}
              </h2>
              <p className="text-base leading-relaxed text-gray-700">{s.body}</p>
            </section>
          ))}
        </div>

        {/* Enlazado interno al catálogo */}
        {guide.relatedCategories && guide.relatedCategories.length > 0 && (
          <section className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">
              Productos relacionados
            </h2>
            <ul className="flex flex-wrap gap-2">
              {guide.relatedCategories.map((rc) => (
                <li key={`${rc.game}-${rc.category}`}>
                  <Link
                    href={`/${rc.game}/${rc.category}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-gray-300 hover:bg-white"
                  >
                    <span aria-hidden="true">
                      {GAME_CONFIG[rc.game]?.emoji ?? "🃏"}
                    </span>
                    {rc.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Otras guías */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-500 uppercase">
              Sigue leyendo
            </h2>
            <ul className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/guias/${r.slug}`}
                    className="group block h-full rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
                  >
                    <p className="mb-1 text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                      {r.tag}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-[#2563eb]">
                      {r.title}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
