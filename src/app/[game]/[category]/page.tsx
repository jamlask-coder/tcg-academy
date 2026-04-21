import { notFound } from "next/navigation";
import Link from "next/link";
import {
  GAME_CONFIG,
  CATEGORY_LABELS,
  PRODUCTS,
  ACCESSORY_CATEGORIES,
  getProductsByGameAndCategory,
  getAllCategories,
} from "@/data/products";
import { MEGA_MENU_DATA } from "@/data/megaMenuData";
import { CategoryTags } from "@/components/filters/CategoryTags";
import { CategoryFilteredGrid } from "@/components/filters/CategoryFilteredGrid";
import { breadcrumbJsonLd, jsonLdProps } from "@/lib/seo";
import type { Metadata } from "next";

export function generateStaticParams() {
  const params: { game: string; category: string }[] = [];
  const seen = new Set<string>();
  const gameKeys = Object.keys(GAME_CONFIG);

  // Categories from actual products (including virtual "accesorios")
  for (const game of gameKeys) {
    const cats = [
      ...new Set(
        PRODUCTS.filter((p) => p.game === game).map((p) => p.category),
      ),
    ];
    let hasAccessory = false;
    for (const category of cats) {
      if (ACCESSORY_CATEGORIES.has(category)) { hasAccessory = true; continue; }
      const key = `${game}/${category}`;
      if (!seen.has(key)) {
        seen.add(key);
        params.push({ game, category });
      }
    }
    if (hasAccessory) {
      const key = `${game}/accesorios`;
      if (!seen.has(key)) {
        seen.add(key);
        params.push({ game, category: "accesorios" });
      }
    }
  }

  // Categories from mega menu links (may not have products yet)
  for (const menuGame of MEGA_MENU_DATA) {
    for (const col of menuGame.columns) {
      for (const item of col.items) {
        const parts = item.href.split("/").filter(Boolean);
        if (parts.length >= 2) {
          const key = `${parts[0]}/${parts[1]}`;
          if (!seen.has(key)) {
            seen.add(key);
            params.push({ game: parts[0], category: parts[1] });
          }
        }
      }
    }
  }

  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string; category: string }>;
}): Promise<Metadata> {
  const { game, category } = await params;
  const config = GAME_CONFIG[game];
  const catLabel = CATEGORY_LABELS[category] ?? category;
  if (!config) return { title: "TCG Academy" };
  const title = `${catLabel} — ${config.name} | TCG Academy`;
  const description = `Compra ${catLabel.toLowerCase()} de ${config.name} en TCG Academy. Booster Boxes, singles, sobres y accesorios con envío en 24h. 4 tiendas físicas en España.`;
  const canonical = `/${game}/${category}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${catLabel} — ${config.name}`,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${catLabel} — ${config.name}`,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ game: string; category: string }>;
}) {
  const { game, category } = await params;
  const config = GAME_CONFIG[game];
  if (!config) notFound();

  const { name, color } = config;
  const products = getProductsByGameAndCategory(game, category);
  const allCategories = getAllCategories(game);
  const catLabel = CATEGORY_LABELS[category] ?? category;

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Inicio", url: "/" },
    { name: config.name, url: `/${game}` },
    { name: catLabel, url: `/${game}/${category}` },
  ]);

  return (
    <div>
      <script {...jsonLdProps(breadcrumbLd)} />

      {/* SEO H1 + intro */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {catLabel} de {config.name}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Compra {catLabel.toLowerCase()} de {config.name} con stock real y envío en
            24&nbsp;h. Productos originales, precios con IVA incluido y atención
            especializada desde nuestras tiendas físicas en España.
          </p>
        </div>
      </header>

      {/* Category nav */}
      <div className="sticky-under-nav hidden border-b border-gray-100 bg-white lg:block">
        <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6">
          <CategoryTags
            items={[
              { id: "todo", label: "Todo", href: `/${game}` },
              ...allCategories.map((cat) => ({
                id: cat,
                label: CATEGORY_LABELS[cat] ?? cat,
                href: `/${game}/${cat}`,
              })),
            ]}
            activeId={category}
            color={color}
          />
        </div>
      </div>

      {/* Products with sidebar filters */}
      <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6 sm:py-10">
        {products.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-24 text-center">
            <p className="font-medium text-gray-400">
              No hay productos en esta categoría
            </p>
            <Link
              href={`/${game}`}
              className="mt-2 text-sm hover:underline"
              style={{ color }}
            >
              Ver todo {name}
            </Link>
          </div>
        ) : (
          <CategoryFilteredGrid
            products={products}
            color={color}
            game={game}
            category={category}
            categoryItems={[
              { id: "todo", label: "Todo", href: `/${game}` },
              ...allCategories.map((cat) => ({
                id: cat,
                label: CATEGORY_LABELS[cat] ?? cat,
                href: `/${game}/${cat}`,
              })),
            ]}
          />
        )}
      </div>

      {/* Enlazado interno SEO */}
      <section className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 sm:px-6">
          {allCategories.length > 1 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">
                Otras categorías de {name}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {allCategories
                  .filter((cat) => cat !== category)
                  .map((cat) => (
                    <li key={cat}>
                      <Link
                        href={`/${game}/${cat}`}
                        className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                      >
                        {CATEGORY_LABELS[cat] ?? cat}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">
              {catLabel} en otros juegos
            </h2>
            <ul className="flex flex-wrap gap-2">
              {Object.entries(GAME_CONFIG)
                .filter(([slug]) => slug !== game)
                .map(([slug, cfg]) => (
                  <li key={slug}>
                    <Link
                      href={`/${slug}/${category}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                    >
                      <span aria-hidden="true">{cfg.emoji}</span>
                      {cfg.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
