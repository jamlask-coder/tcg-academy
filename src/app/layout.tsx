import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/layout/Providers"
import { Header } from "@/components/layout/Header"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "TCG Academy — La mejor tienda TCG de Espana", template: "%s | TCG Academy" },
  description: "Pokemon, Magic, Yu-Gi-Oh!, Naruto, Lorcana y Dragon Ball. 4 tiendas en Espana.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header />
            <Navbar />
            <main className="flex-1 bg-gray-50">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
