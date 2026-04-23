"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";

interface Props {
  onClose: () => void;
}

// Iconos amber pixelados — mismos assets que usa el MobileDrawer para
// representar estas 3 soluciones B2B. Estilo coherente móvil ↔ desktop.
const OPTIONS = [
  {
    iconSrc: "/images/logos/b2b-cart-amber.png",
    title: "Hazte distribuidor B2B",
    desc: "Precios exclusivos para empresas y tiendas. Descuentos especiales.",
    href: "/mayoristas",
    color: "#2563eb",
    badge: "Más popular",
  },
  {
    iconSrc: "/images/logos/franquicias-amber.png",
    title: "Monta tu tienda TCG",
    desc: "Acompañamiento integral para abrir tu negocio TCG desde cero.",
    href: "/mayoristas/franquicias",
    color: "#0f766e",
    badge: null,
  },
  {
    iconSrc: "/images/logos/vending-amber.png",
    title: "Máquinas Vending TCG",
    desc: "Lleva el TCG a centros comerciales y zonas de paso. 24h, 7 días.",
    href: "/mayoristas/vending",
    color: "#7c3aed",
    badge: "Próximamente",
  },
];

export function MayoristasMenu({ onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="border-t-2 border-t-[#2563eb] bg-white shadow-xl"
    >
      <Container className="py-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
            Soluciones para profesionales
          </p>
          <Link
            href="/mayoristas"
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:underline"
          >
            Ver todo <ArrowRight size={11} />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {OPTIONS.map(({ iconSrc, title, desc, href, color, badge }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="group relative flex items-start gap-3.5 rounded-xl border border-gray-100 p-4 transition-all hover:border-gray-200 hover:shadow-sm"
            >
              {badge && (
                <span
                  className="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase"
                  style={{ backgroundColor: color }}
                >
                  {badge}
                </span>
              )}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={iconSrc}
                  alt=""
                  className="h-8 w-8 object-contain transition-transform duration-200 group-hover:scale-110"
                />
              </div>
              <div className="min-w-0 pr-14">
                <p className="text-sm leading-tight font-semibold text-gray-800 group-hover:text-gray-900">
                  {title}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-gray-500">
                  {desc}
                </p>
              </div>
            </Link>
          ))}
        </div>

      </Container>
    </motion.div>
  );
}
