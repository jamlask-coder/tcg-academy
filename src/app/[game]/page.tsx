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
import { MEGA_MENU_DATA } from "@/data/megaMenuData";
import { CategoryTags, type TagItem } from "@/components/filters/CategoryTags";
import { CategoryFilteredGrid } from "@/components/filters/CategoryFilteredGrid";
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
  return {
    title: config ? `${config.name} — TCG Academy` : "TCG Academy",
    description: config?.description,
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

  const { name, color, bgColor } = config;
  const categories = getAllCategories(game);
  const allProducts = getProductsByGame(game);

  const menuGame = MEGA_MENU_DATA.find((g) => g.slug === game);

  const all = allProducts
    .filter((p) => !CARD_CATEGORIES.has(p.category))
    .sort((a, b) => {
      const aNew = isNewProduct(a) ? 1 : 0;
      const bNew = isNewProduct(b) ? 1 : 0;
      return bNew - aNew;
    });

  return (
    <div>
      {/* Hero compacto — igual que subcategorías */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: bgColor }}
      >
        <div className="relative mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
          <nav
            className="mb-3 flex items-center gap-2 text-sm opacity-70"
            style={{ color }}
          >
            <Link href="/" className="hover:opacity-100">
              Inicio
            </Link>
            <span>/</span>
            <span className="font-semibold">{name}</span>
          </nav>

          <div>
            <h1 className="text-2xl font-bold md:text-4xl" style={{ color }}>
              {name}
            </h1>
          </div>

          <p className="mt-1 text-gray-600">
            {all.length} productos disponibles
          </p>
        </div>
      </div>

      {/* Category nav */}
      {categories.length > 0 && (
        <div className="sticky-under-nav border-b border-gray-100 bg-white">
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
      <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Catálogo{" "}
            <span className="text-sm font-normal text-gray-400">
              ({all.length} productos)
            </span>
          </h2>
          {allProducts.length !== all.length && (
            <Link
              href={`/${game}/singles`}
              className="text-sm font-semibold hover:underline"
              style={{ color }}
            >
              Ver cartas sueltas ({allProducts.length - all.length}) →
            </Link>
          )}
        </div>
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
          />
        )}
      </section>
    </div>
  );
}
