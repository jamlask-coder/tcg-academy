import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import {
  GAME_CONFIG,
  CATEGORY_LABELS,
  getProductsByGame,
  getProductsByGameFeatured,
  getAllCategories,
} from "@/data/products";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import { GameHero } from "@/components/game/GameHero";
import {
  CategoryTags,
  type TagItem,
} from "@/components/filters/CategoryTags";
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

  const { name, color, bgColor, description, emoji } = config;
  const categories = getAllCategories(game);
  const all = getProductsByGame(game);
  const bestsellers = getProductsByGameFeatured(game, 4);
  const newProducts = all.filter((p) => p.isNew).slice(0, 4);
  const upcoming = UPCOMING[game] ?? [];

  return (
    <div>
      {/* Hero */}
      <GameHero
        game={game}
        config={{ name, color, bgColor, description, emoji }}
        featuredProducts={bestsellers}
      />

      {/* Category nav */}
      {categories.length > 0 && (
        <div className="sticky-under-nav border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-[1180px] px-6 py-3">
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

      {/* Lo más vendido */}
      {bestsellers.length > 0 && (
        <section className="mx-auto max-w-[1180px] px-6 py-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Lo más vendido
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Los favoritos de la comunidad
              </p>
            </div>
            <Link
              href={`/${game}`}
              className="flex items-center gap-1 text-sm font-semibold hover:underline"
              style={{ color }}
            >
              Ver todo <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {bestsellers.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Novedades del juego */}
      {newProducts.length > 0 && (
        <section className="mx-auto max-w-[1180px] px-6 pb-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Novedades</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Recién llegados a la tienda
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {newProducts.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Próximos lanzamientos */}
      {upcoming.length > 0 && (
        <section className="mx-auto max-w-[1180px] px-6 pb-10">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
            <Calendar size={20} style={{ color }} /> Próximos lanzamientos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map(({ name: relName, date }) => (
              <div
                key={relName}
                className="flex items-center gap-4 rounded-2xl border-2 border-dashed p-5"
                style={{
                  borderColor: `${color}40`,
                  backgroundColor: `${color}06`,
                }}
              >
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ backgroundColor: `${color}15` }}
                >
                  {emoji}
                </div>
                <div>
                  <p className="text-sm leading-tight font-bold text-gray-900">
                    {relName}
                  </p>
                  <p className="mt-1 text-xs font-semibold" style={{ color }}>
                    {date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catálogo completo */}
      <section className="mx-auto max-w-[1180px] px-6 pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Catálogo completo{" "}
            <span className="text-sm font-normal text-gray-400">
              ({all.length} productos)
            </span>
          </h2>
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {all.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
