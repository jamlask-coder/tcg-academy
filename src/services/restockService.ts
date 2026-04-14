// ── Restock Notification Service ──────────────────────────────────────────────
// Manages "notify me when back in stock" subscriptions.
// Subscriptions are stored in localStorage; when stock is restored,
// emails are triggered via the email service.

import { renderEmailTemplate } from "./emailService";
import { logSentEmail } from "./emailService";
import { openHtmlInNewTab } from "./emailService";

const STORAGE_KEY = "tcga_restock_subs";

export interface RestockSub {
  productId: number;
  productName: string;
  email: string;
  name: string;
  createdAt: string;
}

// ── Read / Write ─────────────────────────────────────────────────────────────

export function getRestockSubs(): RestockSub[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as RestockSub[];
  } catch {
    return [];
  }
}

function saveSubs(subs: RestockSub[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(subs)); } catch {}
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Subscribe to restock notifications for a product. */
export function subscribeRestock(
  productId: number,
  productName: string,
  email: string,
  name: string,
): void {
  const subs = getRestockSubs();
  if (subs.some((s) => s.productId === productId && s.email === email)) return;
  subs.push({ productId, productName, email, name, createdAt: new Date().toISOString() });
  saveSubs(subs);
}

/** Check if an email is already subscribed for a product. */
export function isSubscribed(productId: number, email: string): boolean {
  return getRestockSubs().some((s) => s.productId === productId && s.email === email);
}

/** Remove subscription after notification is sent. */
export function unsubscribeRestock(productId: number, email: string): void {
  saveSubs(getRestockSubs().filter((s) => !(s.productId === productId && s.email === email)));
}

/** Get all subscribers for a product. */
export function getSubsForProduct(productId: number): RestockSub[] {
  return getRestockSubs().filter((s) => s.productId === productId);
}

// ── Trigger restock emails ───────────────────────────────────────────────────

/** Called when a product goes back in stock. Sends emails and clears subs. */
export function triggerRestockEmails(
  productId: number,
  productName: string,
  productUrl: string,
  productImage: string,
): { sent: number } {
  const subs = getSubsForProduct(productId);
  if (subs.length === 0) return { sent: 0 };

  for (const sub of subs) {
    const rendered = renderEmailTemplate("restock_disponible", {
      nombre: sub.name || "cliente",
      producto: productName,
      producto_url: productUrl,
      producto_imagen: productImage,
    });

    if (rendered) {
      // In demo mode, log the email; in production, send via API
      logSentEmail({
        id: `restock_${productId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        to: sub.email,
        toName: sub.name,
        subject: rendered.subject,
        templateId: "restock_disponible",
        sentAt: new Date().toISOString(),
        preview: `Restock: ${productName}`,
      });

      // Demo: open first email in new tab so admin can see it
      if (subs.indexOf(sub) === 0) {
        openHtmlInNewTab(rendered.html);
      }
    }

    unsubscribeRestock(productId, sub.email);
  }

  return { sent: subs.length };
}
