import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar } from "lucide-react";
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
import { GameHero } from "@/components/game/GameHero";
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

// Mock upcoming releases per game
const UPCOMING: Record<string, { name: string; date: string }[]> = {
  magic: [
    { name: "Final Fantasy — Set completo", date: "Junio 2025" },
    { name: "Edge of Eternities", date: "Agosto 2025" },
  ],
  pokemon: [
    { name: "Terastal Festival EX", date: "Mayo 2025" },
    { name: "Stellar Crown 2", date: "Septiembre 2025" },
  ],
  "one-piece": [{ name: "OP-10 — Nuevo arco", date: "Julio 2025" }],
  riftbound: [{ name: "Expansion Pack 2", date: "Verano 2025" }],
  lorcana: [{ name: "Into the Inklands 2", date: "Junio 2025" }],
  "dragon-ball": [{ name: "Fusion World EX-05", date: "Mayo 2025" }],
  yugioh: [{ name: "Legacy of Destruction 2", date: "Q3 2025" }],
  naruto: [{ name: "Konoha Shido Vol.2", date: "Otoño 2025" }],
};

export default async function GamePage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const config = GAME_CONFIG[game];
  if (!config) notFound();

  const { name, color, bgColor: _bgColor, description: _description, emoji } = config;
  const categories = getAllCategories(game);
  const allProducts = getProductsByGame(game);
  const upcoming = UPCOMING[game] ?? [];

  // Exclude card singles from the main grid, sort new products first
  const all = allProducts
    .filter((p) => !CARD_CATEGORIES.has(p.category))
    .sort((a, b) => {
      const aNew = isNewProduct(a) ? 1 : 0;
      const bNew = isNewProduct(b) ? 1 : 0;
      return bNew - aNew;
    });

  return (
    <div>
      {/* Hero con animación de cartas */}
      <GameHero game={game} config={config} />

      {/* Breadcrumb */}
      <div className="mx-auto max-w-[1400px] px-4 pt-4 sm:px-6">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Inicio
          </Link>
          <span>/</span>
          <span className="font-semibold" style={{ color }}>
            {name}
          </span>
        </nav>
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

      {/* Catálogo — novedades primero, con sidebar de filtros */}
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
            <p className="font-medium text-gray-400">
              Catálogo en construcción
            </p>
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

      {/* Próximos lanzamientos */}
      {upcoming.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 pb-10 sm:px-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
            <Calendar size={17} style={{ color }} /> Próximos lanzamientos
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {upcoming.map(({ name: relName, date }) => (
              <div
                key={relName}
                className="flex min-w-[200px] flex-shrink-0 items-center gap-3 rounded-xl border p-3"
                style={{
                  borderColor: `${color}30`,
                  backgroundColor: `${color}06`,
                }}
              >
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className="text-xs leading-tight font-bold text-gray-900">
                    {relName}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold" style={{ color }}>
                    {date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
