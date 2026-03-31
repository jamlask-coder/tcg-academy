import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { Header } from "@/components/layout/Header";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://tcgacademy.es"),
  title: {
    default: "TCG Academy — La mejor tienda TCG de España",
    template: "%s | TCG Academy",
  },
  description:
    "Pokémon, Magic, Yu-Gi-Oh!, Naruto, Lorcana y Dragon Ball. Booster Boxes, singles y accesorios. 4 tiendas físicas en España. Envío en 24h.",
  openGraph: {
    siteName: "TCG Academy",
    locale: "es_ES",
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <div className="sticky top-0 z-50">
              <Header />
              <Navbar />
            </div>
            <main className="flex-1 bg-gray-50">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
