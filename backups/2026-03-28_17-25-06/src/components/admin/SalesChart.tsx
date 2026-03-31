"use client"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts"
import { MOCK_SALES_7D } from "@/data/mockData"

export function SalesChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={MOCK_SALES_7D} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}€`}
          width={48}
        />
        <Tooltip
          formatter={(value) => [typeof value === "number" ? `${value.toFixed(2)}€` : `${value}€`, "Ventas"]}
          labelStyle={{ fontWeight: 600, color: "#111827" }}
          contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}
        />
        <Bar dataKey="sales" fill="#1a3a5c" radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
