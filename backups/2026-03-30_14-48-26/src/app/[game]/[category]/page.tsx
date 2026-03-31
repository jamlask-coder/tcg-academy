import { notFound } from "next/navigation";
import Link from "next/link";
import {
  GAME_CONFIG,
  CATEGORY_LABELS,
  PRODUCTS,
  getProductsByGameAndCategory,
  getAllCategories,
} from "@/data/products";
import { CategoryTags } from "@/components/filters/CategoryTags";
import { CategoryFilteredGrid } from "@/components/filters/CategoryFilteredGrid";
import type { Metadata } from "next";

export function generateStaticParams() {
  const params: { game: string; category: string }[] = [];
  const gameKeys = Object.keys(GAME_CONFIG);
  for (const game of gameKeys) {
    const cats = [
      ...new Set(
        PRODUCTS.filter((p) => p.game === game).map((p) => p.category),
      ),
    ];
    for (const category of cats) {
      params.push({ game, category });
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
  return {
    title: config
      ? `${catLabel} — ${config.name} | TCG Academy`
      : "TCG Academy",
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

  const { name, color, bgColor } = config;
  const products = getProductsByGameAndCategory(game, category);
  const allCategories = getAllCategories(game);
  const catLabel = CATEGORY_LABELS[category] ?? category;

  return (
    <div>
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: bgColor }}
      >
        <div className="relative mx-auto max-w-[1400px] px-6 py-10">
          <nav
            className="mb-4 flex items-center gap-2 text-sm opacity-70"
            style={{ color }}
          >
            <Link href="/" className="hover:opacity-100">
              Inicio
            </Link>
            <span>/</span>
            <Link href={`/${game}`} className="hover:opacity-100">
              {name}
            </Link>
            <span>/</span>
            <span className="font-semibold">{catLabel}</span>
          </nav>
          <h1 className="text-2xl font-bold md:text-4xl" style={{ color }}>
            {catLabel}
          </h1>
          <p className="mt-2 text-gray-600">
            {name} — {products.length} productos
          </p>
        </div>
      </div>

      {/* Category nav */}
      <div className="sticky-under-nav border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-3">
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
      <div className="mx-auto max-w-[1400px] px-6 py-10">
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
          />
        )}
      </div>
    </div>
  );
}
