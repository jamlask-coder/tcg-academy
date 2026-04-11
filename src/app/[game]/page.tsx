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
  const logoSrc = menuGame?.logoSrc;
  const abbrev = menuGame?.abbrev ?? name.slice(0, 3).toUpperCase();

  // Games that use the Cardmarket sprite sheet in the navbar — use same source here
  const CM_SPRITE = "/images/ssGamesBig.png";
  const SPRITE_SHEET_H = 140;
  const SHEET_ORIG_W = 6295;
  const HERO_SPRITE_DATA: Record<string, [number, number, string?]> = {
    magic: [408, 0],
    "one-piece": [482, 4642, "brightness(0) invert(1) drop-shadow(0 0 6px rgba(0,0,0,0.95)) drop-shadow(0 0 12px rgba(0,0,0,0.8))"],
  };
  const spriteEntry = HERO_SPRITE_DATA[game];

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
        <div className="relative mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
          <nav
            className="mb-4 flex items-center gap-2 text-sm opacity-70"
            style={{ color }}
          >
            <Link href="/" className="hover:opacity-100">
              Inicio
            </Link>
            <span>/</span>
            <span className="font-semibold">{name}</span>
          </nav>

          <div className="flex items-center gap-4">
            {spriteEntry ? (() => {
              const [origW, origX, cssFilter] = spriteEntry;
              const targetH = 48;
              const targetW = 140;
              const scale = Math.min(targetW / origW, targetH / SPRITE_SHEET_H);
              const displayW = Math.round(origW * scale);
              const displayH = Math.round(SPRITE_SHEET_H * scale);
              const sheetW = Math.round(SHEET_ORIG_W * scale);
              const bgX = (-origX * scale).toFixed(1);
              return (
                <span
                  aria-label={name}
                  style={{
                    display: "inline-block",
                    width: displayW,
                    height: displayH,
                    backgroundImage: `url('${CM_SPRITE}')`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${sheetW}px ${displayH}px`,
                    backgroundPosition: `${bgX}px 0px`,
                    filter: cssFilter,
                    flexShrink: 0,
                  }}
                />
              );
            })() : logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={name}
                width={140}
                height={48}
                className="h-10 w-auto max-w-[140px] object-contain md:h-12"
                style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.18))" }}
              />
            ) : (
              <div
                className="flex h-10 items-center rounded-lg px-3 text-xs font-black text-white md:h-12"
                style={{ backgroundColor: color }}
              >
                {abbrev}
              </div>
            )}
            <h1 className="text-2xl font-bold md:text-4xl" style={{ color }}>
              {name}
            </h1>
          </div>

          <p className="mt-2 text-gray-600">
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
