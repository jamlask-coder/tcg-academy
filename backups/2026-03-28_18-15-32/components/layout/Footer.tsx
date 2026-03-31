import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-[#1a3a5c] text-white">
      <div className="max-w-[1180px] mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
                <span className="text-[#1a3a5c] font-bold text-sm">T</span>
              </div>
              <span className="text-xl font-bold">TCG Academy</span>
            </div>
            <p className="text-blue-200 text-sm leading-relaxed mb-5">
              La mejor tienda TCG de Espana. Pokemon, Magic, Yu-Gi-Oh!, Naruto, Lorcana y Dragon Ball. Envio 24h a toda Espana.
            </p>
            <div className="flex gap-2">
              {["FB", "IG", "TW", "YT"].map((s) => (
                <div key={s} className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition text-xs font-bold cursor-pointer">
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Games */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider mb-4 text-white/50">Juegos</h3>
            <ul className="space-y-2.5">
              {[
                ["Pokemon", "/pokemon"],
                ["Magic: The Gathering", "/magic"],
                ["Yu-Gi-Oh!", "/yugioh"],
                ["Naruto", "/naruto"],
                ["Lorcana", "/lorcana"],
                ["Dragon Ball Super CG", "/dragon-ball"],
              ].map(([l, h]) => (
                <li key={h}><Link href={h} className="text-blue-200 text-sm hover:text-white transition">{l}</Link></li>
              ))}
            </ul>
          </div>

          {/* Tiendas */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider mb-4 text-white/50">Tiendas Físicas</h3>
            <ul className="space-y-2.5">
              {[
                ["Calpe, Alicante", "/tiendas/calpe"],
                ["Béjar, Salamanca", "/tiendas/bejar"],
                ["Madrid", "/tiendas/madrid"],
                ["Barcelona", "/tiendas/barcelona"],
              ].map(([l, h]) => (
                <li key={h}><Link href={h} className="text-blue-200 text-sm hover:text-white transition">{l}</Link></li>
              ))}
            </ul>
          </div>

          {/* Negocio */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider mb-4 text-white/50">Negocio</h3>
            <ul className="space-y-2.5">
              {[
                ["Mayoristas B2B", "/mayoristas"],
                ["Máquinas Vending TCG", "/vending"],
                ["Monta tu tienda", "/franquicias"],
                ["Contacto", "/contacto"],
              ].map(([l, h]) => (
                <li key={l}><Link href={h} className="text-blue-200 text-sm hover:text-white transition">{l}</Link></li>
              ))}
            </ul>
          </div>

          {/* Info + Newsletter */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider mb-4 text-white/50">Información</h3>
            <ul className="space-y-2.5 mb-6">
              {[
                ["Contacto", "/contacto"],
                ["Mayoristas B2B", "/mayoristas"],
                ["Envíos y devoluciones", "/contacto"],
                ["Política de privacidad", "/cuenta/datos"],
              ].map(([l, h]) => (
                <li key={l}><Link href={h} className="text-blue-200 text-sm hover:text-white transition">{l}</Link></li>
              ))}
            </ul>
            <h3 className="font-bold text-xs uppercase tracking-wider mb-3 text-white/50">Newsletter</h3>
            <form className="flex gap-2 min-w-0">
              <input
                type="email"
                placeholder="tu@email.com"
                className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-blue-300 focus:outline-none focus:border-white/50"
              />
              <button
                type="submit"
                className="bg-white text-[#1a3a5c] font-semibold text-sm px-4 py-2 rounded-lg hover:bg-blue-50 transition flex-shrink-0">
                OK
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/15 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-blue-300 text-xs">2025 TCG Academy. Todos los derechos reservados.</p>
          <div className="flex items-center gap-3 text-blue-300 text-xs">
            {["Visa", "Mastercard", "PayPal", "Bizum", "Transferencia"].map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
