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
        <div className="bg-white border-b border-gray-100 sticky-under-nav">
          <div className="max-w-[1180px] mx-auto px-6">
            <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
              <Link
                href={`/${game}`}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition"
                style={{
                  borderColor: color,
                  backgroundColor: color,
                  color: "white",
                }}
              >
                Todo
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/${game}/${cat}`}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:border-gray-300 transition whitespace-nowrap"
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lo más vendido */}
      {bestsellers.length > 0 && (
        <section className="max-w-[1180px] mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Lo más vendido
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Los favoritos de la comunidad
              </p>
            </div>
            <Link
              href={`/${game}`}
              className="text-sm font-semibold flex items-center gap-1 hover:underline"
              style={{ color }}
            >
              Ver todo <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {bestsellers.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Novedades del juego */}
      {newProducts.length > 0 && (
        <section className="max-w-[1180px] mx-auto px-6 pb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Novedades</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Recién llegados a la tienda
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {newProducts.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Próximos lanzamientos */}
      {upcoming.length > 0 && (
        <section className="max-w-[1180px] mx-auto px-6 pb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar size={20} style={{ color }} /> Próximos lanzamientos
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map(({ name: relName, date }) => (
              <div
                key={relName}
                className="border-2 border-dashed rounded-2xl p-5 flex items-center gap-4"
                style={{
                  borderColor: `${color}40`,
                  backgroundColor: `${color}06`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: `${color}15` }}
                >
                  {emoji}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm leading-tight">
                    {relName}
                  </p>
                  <p className="text-xs font-semibold mt-1" style={{ color }}>
                    {date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catálogo completo */}
      <section className="max-w-[1180px] mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Catálogo completo{" "}
            <span className="text-sm font-normal text-gray-400">
              ({all.length} productos)
            </span>
          </h2>
        </div>
        {all.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-gray-400 font-medium">
              Catálogo en construcción
            </p>
            <p className="text-sm text-gray-300 mt-1">
              Pronto tendrás más productos disponibles
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {all.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
