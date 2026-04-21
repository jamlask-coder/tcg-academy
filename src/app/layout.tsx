import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { Header } from "@/components/layout/Header";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { CookieConsent } from "@/components/legal/CookieConsent";
import { FiscalDataGuard } from "@/components/auth/FiscalDataGuard";
import {
  SITE_URL,
  jsonLdProps,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TCG Academy — La mejor tienda TCG de España",
    template: "%s | TCG Academy",
  },
  description:
    "Pokémon, Magic, Yu-Gi-Oh!, Naruto, Lorcana y Dragon Ball. Booster Boxes, singles y accesorios. 4 tiendas físicas en España. Envío en 24h.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    siteName: "TCG Academy",
    locale: "es_ES",
    type: "website",
    url: SITE_URL,
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TCG Academy — La mejor tienda TCG de España",
    description:
      "Pokémon, Magic, Yu-Gi-Oh!, Naruto, Lorcana y Dragon Ball. 4 tiendas físicas, envío en 24h.",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
  verification: {
    // Rellenar cuando se verifique propiedad
    // google: "xxxxxxxx",
    // other: { "msvalidate.01": "xxxxxxxx" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <script {...jsonLdProps(organizationJsonLd())} />
        <script {...jsonLdProps(websiteJsonLd())} />
      </head>
      <body className={inter.className}>
        <Providers>
          <ScrollToTop />
          <FiscalDataGuard>
            <div className="flex min-h-screen flex-col">
              <div className="sticky top-0 z-50">
                <Header />
                <Navbar />
              </div>
              <main className="flex-1 bg-gray-50">{children}</main>
              <Footer />
              <CookieConsent />
            </div>
          </FiscalDataGuard>
        </Providers>
      </body>
    </html>
  );
}
