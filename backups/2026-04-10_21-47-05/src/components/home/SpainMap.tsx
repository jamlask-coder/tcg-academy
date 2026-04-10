"use client";
import Link from "next/link";

interface Store {
  name: string;
  province: string;
  href: string;
  // Approximate position on the SVG viewBox (400 × 340)
  x: number;
  y: number;
  color: string;
}

const STORES: Store[] = [
  { name: "Madrid", province: "Madrid", href: "/tiendas/madrid", x: 195, y: 158, color: "#dc2626" },
  { name: "Barcelona", province: "Barcelona", href: "/tiendas/barcelona", x: 338, y: 80, color: "#7c3aed" },
  { name: "Calpe", province: "Alicante", href: "/tiendas/calpe", x: 318, y: 188, color: "#2563eb" },
  { name: "Béjar", province: "Salamanca", href: "/tiendas/bejar", x: 140, y: 138, color: "#3b82f6" },
];

// Simplified SVG outline of Spain's Iberian Peninsula (mainland only)
const SPAIN_PATH =
  "M 75,32 C 90,18 135,10 185,12 C 220,14 255,16 270,18 L 305,16 C 330,14 355,28 378,52 C 395,72 400,100 396,130 L 388,168 C 382,192 372,215 358,240 L 338,272 C 315,302 285,325 252,334 L 215,340 C 190,342 162,336 138,322 L 105,302 C 78,282 56,254 44,222 C 34,194 34,164 40,136 L 48,100 C 55,70 62,48 75,32 Z";

export function SpainMap() {
  return (
    <div className="flex flex-col items-center gap-6 xl:flex-row xl:items-start xl:gap-10">
      {/* SVG Map */}
      <div className="relative flex-shrink-0">
        <svg
          viewBox="0 0 420 360"
          className="w-full max-w-[340px] xl:max-w-[380px]"
          aria-label="Mapa de España con tiendas TCG Academy"
        >
          {/* Background */}
          <path d={SPAIN_PATH} fill="#1e3a8a" fillOpacity="0.12" stroke="#3b82f6" strokeWidth="1.5" />

          {/* Store dots */}
          {STORES.map((store) => (
            <g key={store.name}>
              {/* Outer pulse ring */}
              <circle
                cx={store.x}
                cy={store.y}
                r="14"
                fill={store.color}
                fillOpacity="0.15"
                className="animate-ping"
                style={{ animationDuration: "2.5s" }}
              />
              {/* Inner dot */}
              <circle
                cx={store.x}
                cy={store.y}
                r="6"
                fill={store.color}
                stroke="white"
                strokeWidth="2"
              />
              {/* City label */}
              <text
                x={store.x}
                y={store.y - 12}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="white"
                className="pointer-events-none select-none"
              >
                {store.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Store cards */}
      <div className="grid w-full grid-cols-2 gap-3 xl:grid-cols-1 xl:max-w-[220px]">
        {STORES.map((store) => (
          <Link
            key={store.href}
            href={store.href}
            className="group rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
          >
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white" style={{ backgroundColor: store.color }}>
              {store.name[0]}
            </div>
            <p className="font-bold text-gray-900">{store.name}</p>
            <p className="text-xs text-gray-400">{store.province}</p>
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold" style={{ color: store.color }}>
              Ver tienda →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
