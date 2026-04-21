import { notFound } from "next/navigation";
import Link from "next/link";
import {
  GAME_CONFIG,
  CATEGORY_LABELS,
  getProductsByGame,
  getAllCategories,
  CARD_CATEGORIES,
  isNewProduct,
} from "@/data/products";
import { CategoryTags, type TagItem } from "@/components/filters/CategoryTags";
import { CategoryFilteredGrid } from "@/components/filters/CategoryFilteredGrid";
import { breadcrumbJsonLd, jsonLdProps } from "@/lib/seo";
import type { Metadata } from "next";

export function generateStaticParams() {
  return Object.keys(GAME_CONFIG).map((game) => ({ game }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}): Promise<Metadata> {
  const { game } = await params;
  const config = GAME_CONFIG[game];
  if (!config) return { title: "TCG Academy" };
  const canonical = `/${game}`;
  const title = `${config.name} — TCG Academy`;
  return {
    title,
    description: config.description,
    alternates: { canonical },
    openGraph: {
      title,
      description: config.description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: config.description,
    },
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const config = GAME_CONFIG[game];
  if (!config) notFound();

  const { color } = config;
  const categories = getAllCategories(game);
  const allProducts = getProductsByGame(game);

  const all = allProducts
    .filter((p) => !CARD_CATEGORIES.has(p.category))
    .sort((a, b) => {
      const aNew = isNewProduct(a) ? 1 : 0;
      const bNew = isNewProduct(b) ? 1 : 0;
      return bNew - aNew;
    });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Inicio", url: "/" },
    { name: config.name, url: `/${game}` },
  ]);

  return (
    <div>
      <script {...jsonLdProps(breadcrumbLd)} />

      {/* SEO H1 + intro */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {config.name} — Cartas, sobres y accesorios
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
            {config.description} Stock real, envío en 24&nbsp;h desde nuestras 4 tiendas
            físicas en España y atención especializada. Precios con IVA incluido.
          </p>
        </div>
      </header>

      {/* Category nav */}
      {categories.length > 0 && (
        <div className="sticky-under-nav hidden border-b border-gray-100 bg-white lg:block">
          <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6">
            <CategoryTags
              items={[
                { id: "todo", label: "Todo", href: `/${game}` } as TagItem,
                ...categories.map((cat) => ({
                  id: cat,
                  label: CATEGORY_LABELS[cat] ?? cat,
                  href: `/${game}/${cat}`,
                })),
              ]}
              activeId="todo"
              color={color}
            />
          </div>
        </div>
      )}

      {/* Catálogo */}
      <section className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6 sm:py-10">
        {all.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-24 text-center">
            <p className="font-medium text-gray-400">Catálogo en construcción</p>
            <p className="mt-1 text-sm text-gray-300">
              Pronto tendrás más productos disponibles
            </p>
          </div>
        ) : (
          <CategoryFilteredGrid
            products={all}
            color={color}
            game={game}
            category="todo"
            categoryItems={[
              { id: "todo", label: "Todo", href: `/${game}` },
              ...categories.map((cat) => ({
                id: cat,
                label: CATEGORY_LABELS[cat] ?? cat,
                href: `/${game}/${cat}`,
              })),
            ]}
          />
        )}
      </section>

      {/* Enlazado interno SEO: otros juegos */}
      <section className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">
            Explorar otros juegos
          </h2>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(GAME_CONFIG)
              .filter(([slug]) => slug !== game)
              .map(([slug, cfg]) => (
                <li key={slug}>
                  <Link
                    href={`/${slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                  >
                    <span aria-hidden="true">{cfg.emoji}</span>
                    {cfg.name}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
