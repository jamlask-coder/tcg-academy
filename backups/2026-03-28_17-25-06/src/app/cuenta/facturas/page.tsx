"use client"
import { useState, useMemo } from "react"
import { Receipt, Download, Search, ChevronDown, X } from "lucide-react"
import { MOCK_INVOICES, type Invoice } from "@/data/mockData"

function StatusBadge({ status }: { status: Invoice["status"] }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
      status === "pagada"
        ? "bg-green-100 text-green-700"
        : "bg-amber-100 text-amber-700"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "pagada" ? "bg-green-500" : "bg-amber-500"}`} />
      {status === "pagada" ? "Pagada" : "Pendiente"}
    </span>
  )
}

function downloadInvoicePlaceholder(invoice: Invoice) {
  // Placeholder: generates a simple text file. Replace with real PDF generation when ready.
  const content = [
    "FACTURA TCG ACADEMY",
    "====================",
    `Nº: ${invoice.id}`,
    `Pedido: ${invoice.orderId}`,
    `Fecha: ${invoice.date}`,
    `Estado: ${invoice.status.toUpperCase()}`,
    "",
    "CONCEPTOS:",
    ...invoice.items.map((i) => `  - ${i.description} x${i.qty} = ${i.total.toFixed(2)}€`),
    "",
    `TOTAL: ${invoice.total.toFixed(2)}€`,
    "",
    "TCG Academy S.L. | CIF: B12345678",
    "Av. Gabriel Miró 42, 03710 Calpe, Alicante",
  ].join("\n")

  const blob = new Blob([content], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${invoice.id}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export default function FacturasPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"" | "pagada" | "pendiente">("")
  const [dateFilter, setDateFilter] = useState("")

  const filtered = useMemo(() => {
    return MOCK_INVOICES.filter((inv) => {
      if (statusFilter && inv.status !== statusFilter) return false
      if (dateFilter && !inv.date.startsWith(dateFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        return inv.id.toLowerCase().includes(q) || inv.orderId.toLowerCase().includes(q)
      }
      return true
    })
  }, [search, statusFilter, dateFilter])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt size={22} className="text-[#1a3a5c]" /> Mis Facturas
        </h1>
        <p className="text-gray-500 text-sm mt-1">Descarga tus facturas y consulta el historial de pagos</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar factura o pedido..."
            className="w-full h-10 pl-8 pr-8 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 pl-3 pr-8 border border-gray-200 rounded-xl text-sm bg-white appearance-none focus:outline-none focus:border-[#1a3a5c] text-gray-700"
          >
            <option value="">Todos los estados</option>
            <option value="pagada">Pagada</option>
            <option value="pendiente">Pendiente</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <input
          type="month"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] text-gray-700"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <Receipt size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">No se encontraron facturas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div key={inv.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition">
              {/* Header row */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{inv.id}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Pedido: <span className="font-medium text-gray-700">{inv.orderId}</span> · {inv.date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-[#1a3a5c]">{inv.total.toFixed(2)}€</span>
                  <button
                    onClick={() => downloadInvoicePlaceholder(inv)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-[#1a3a5c] hover:bg-blue-50 px-3 py-2 rounded-lg transition min-h-[44px]"
                  >
                    <Download size={15} /> Descargar PDF
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                      <th className="px-4 py-2 font-semibold">Concepto</th>
                      <th className="px-4 py-2 font-semibold text-center w-16">Cant.</th>
                      <th className="px-4 py-2 font-semibold text-right w-24">Precio</th>
                      <th className="px-4 py-2 font-semibold text-right w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-2.5 text-gray-700">{item.description}</td>
                        <td className="px-4 py-2.5 text-center text-gray-500">{item.qty}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{item.unitPrice.toFixed(2)}€</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{item.total.toFixed(2)}€</td>
                      </tr>
                    ))}
                    <tr className="bg-white">
                      <td colSpan={3} className="px-4 py-2.5 text-right font-bold text-gray-900">Total (IVA incl.)</td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#1a3a5c] text-base">{inv.total.toFixed(2)}€</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
