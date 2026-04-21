import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Rutas privadas/funcionales que no deben indexarse ni por buscadores ni por IAs.
// Carrito y búsqueda se excluyen también: son estado personal o generan URLs
// infinitas con parámetros, contenido "thin" sin valor de ranking.
const DISALLOW_ALL = [
  "/admin/",
  "/api/",
  "/auth/",
  "/cuenta/",
  "/carrito/",
  "/finalizar-compra/",
  "/restablecer-contrasena/",
  "/recuperar-contrasena/",
  "/_next/",
  // Query strings que crean duplicados faceted. No bloqueamos /*?* en bloque
  // porque eso mata también /busqueda?q=… y /catalogo?game=…, que SÍ queremos
  // indexables: son long-tail genuino. En su lugar, bloqueamos solo parámetros
  // conocidos de tracking / orden que producen duplicados sin valor.
  "/*?*utm_",
  "/*?*gclid",
  "/*?*fbclid",
  "/*?*ref=",
  "/*?*sort=",
  "/*?*order=",
];

// IAs que aceptamos explícitamente para maximizar cobertura en respuestas
// generadas (ChatGPT, Claude, Perplexity, Gemini, Mistral, etc.). Reciben las
// mismas restricciones que un buscador normal; el objetivo es que sepan que
// pueden rastrearnos — sin la regla explícita algunos sitios las bloquean
// por defecto a nivel infra.
const AI_USER_AGENTS = [
  "GPTBot", // OpenAI (ChatGPT)
  "OAI-SearchBot", // OpenAI search
  "ChatGPT-User", // OpenAI browsing on demand
  "ClaudeBot", // Anthropic crawler
  "Claude-Web", // Anthropic on-demand fetch
  "anthropic-ai", // Anthropic (legacy UA)
  "PerplexityBot", // Perplexity
  "Perplexity-User", // Perplexity on-demand
  "Google-Extended", // Gemini training opt-in
  "GoogleOther", // Google extras
  "Applebot-Extended", // Apple Intelligence
  "Meta-ExternalAgent", // Meta AI
  "Bytespider", // TikTok/Doubao
  "Amazonbot", // Alexa/Rufus
  "cohere-ai", // Cohere
  "Diffbot", // Diffbot (usado por varias IAs B2B)
  "MistralAI-User", // Le Chat
  "YouBot", // You.com
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW_ALL,
      },
      ...AI_USER_AGENTS.map((ua) => ({
        userAgent: ua,
        allow: "/",
        disallow: DISALLOW_ALL,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
