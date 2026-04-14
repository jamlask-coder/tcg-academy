import Link from "next/link";
import { Star, Users, ShoppingCart, Gift, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Programa de puntos — TCG Academy",
  description: "Acumula puntos con cada compra y canjéalos por descuentos exclusivos en TCG Academy.",
};

const STEPS = [
  {
    icon: ShoppingCart,
    title: "Compra",
    desc: "Gana 1 punto por cada céntimo que gastes. Una compra de 40€ = 4.000 puntos.",
  },
  {
    icon: Star,
    title: "Acumula",
    desc: "Tus puntos se suman automáticamente en tu cuenta. No caducan mientras tu cuenta esté activa.",
  },
  {
    icon: Gift,
    title: "Canjea",
    desc: "Convierte tus puntos en cupones de descuento para tu próxima compra.",
  },
];

const TIERS = [
  { points: "5.000", reward: "Cupón de 2€", color: "bg-gray-100 text-gray-700" },
  { points: "15.000", reward: "Cupón de 7€", color: "bg-amber-50 text-amber-700" },
  { points: "30.000", reward: "Cupón de 15€", color: "bg-amber-100 text-amber-800" },
  { points: "60.000", reward: "Cupón de 35€ + envío gratis", color: "bg-amber-200 text-amber-900" },
];

export default function PuntosPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
          <Star size={28} className="text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Programa de puntos</h1>
        <p className="mx-auto mt-3 max-w-md text-gray-500">
          Cada compra te acerca a recompensas exclusivas. Gana puntos, acumula y canjea por descuentos reales.
        </p>
      </div>

      {/* How it works */}
      <div className="mb-12 grid gap-6 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <step.icon size={20} className="text-amber-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">{step.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Tiers */}
      <div className="mb-12">
        <h2 className="mb-4 text-center text-lg font-bold text-gray-900">Tabla de recompensas</h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200">
          {TIERS.map((tier, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-5 py-3.5 ${i > 0 ? "border-t border-gray-100" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-amber-400">★</span>
                <span className="text-sm font-bold text-gray-900">{tier.points} puntos</span>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${tier.color}`}>
                {tier.reward}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Groups */}
      <div className="mb-12 rounded-2xl border border-blue-100 bg-blue-50/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <Users size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Grupos de amigos</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
              Crea un grupo e invita a tus amigos. Cuando cualquier miembro del grupo compre,
              <strong> todos ganan puntos bonus</strong>. Cuantos más seáis, más puntos extras
              acumula el grupo. Es la forma más rápida de llegar a las mejores recompensas.
            </p>
            <Link
              href="/cuenta/grupo"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
            >
              Crear o unirme a un grupo <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-8">
        <h2 className="mb-4 text-center text-lg font-bold text-gray-900">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {[
            { q: "¿Cuándo recibo mis puntos?", a: "Los puntos se añaden automáticamente a tu cuenta cuando tu pedido es confirmado." },
            { q: "¿Los puntos caducan?", a: "No, tus puntos no caducan mientras tu cuenta esté activa." },
            { q: "¿Puedo usar puntos y un cupón a la vez?", a: "Sí. Los puntos se convierten en cupones, y puedes combinarlos con promociones activas." },
            { q: "¿Cómo funcionan los puntos de grupo?", a: "Cada compra de un miembro del grupo otorga un bonus de puntos a todos los miembros. El bonus depende del tamaño del grupo." },
          ].map((item, i) => (
            <details key={i} className="group rounded-xl border border-gray-200 bg-white">
              <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-gray-900">
                {item.q}
              </summary>
              <p className="border-t border-gray-100 px-5 py-3 text-sm text-gray-500">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
        >
          <ShoppingCart size={16} /> Empezar a acumular puntos
        </Link>
      </div>
    </div>
  );
}
