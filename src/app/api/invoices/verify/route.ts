/**
 * POST /api/invoices/verify — verificación pública de facturas.
 *
 * Endpoint público (sin auth) consumido por /verificar-factura. Permite a
 * un tercero (cliente, gestoría, AEAT en revisión) introducir el código
 * impreso en la factura y comprobar que existe en nuestro sistema.
 *
 * Diseño:
 *  - **Rate limit**: 10 intentos / 5 min por IP. Sin esto un atacante puede
 *    enumerar facturas existentes (hash 16 chars → space ataca-able).
 *  - **No PII en respuesta**: solo número, fecha, total y nombre. NUNCA
 *    email, NIF, dirección o líneas. La verificación responde "existe sí/no",
 *    no es un lookup de datos.
 *  - **Server mode**: consulta Supabase a través de getDb().getInvoices().
 *    En local mode el server no puede leer localStorage, así que devuelve
 *    `found:false` y el cliente sigue haciendo lookup LS como fallback.
 *
 * Cómo se busca match:
 *   1. invoiceNumber exacto (`FAC-2026-0001`)
 *   2. hash exacto (verifactuHash SHA-256 completo)
 *   3. hash por prefijo (≥ 8 chars — usuario suele copiar los primeros)
 *   4. data.csvCode (código corto impreso en PDF)
 *
 * Si nada matchea → 200 con `{ found: false }`. NO 404 — eso filtraría que
 * el endpoint funciona. El cliente trata todo `!found` igual.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { persistentRateLimit } from "@/lib/rateLimitStore";
import { getClientIp } from "@/lib/auth";

interface VerifyBody {
  code?: string;
}

interface VerifyResultFound {
  found: true;
  id: string;
  date: string;
  total: number;
  clientName: string | undefined;
  status: string;
}

type VerifyResult = VerifyResultFound | { found: false };

export async function POST(req: NextRequest) {
  // ── Rate limit (anti-enumeración) ─────────────────────────────────────
  const ip = getClientIp(req);
  const rl = await persistentRateLimit(
    `verify-invoice:${ip}`,
    10,
    5 * 60 * 1000,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  // ── Parse + sanity ────────────────────────────────────────────────────
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  // Filtro defensivo: códigos típicos van de 4 a 64 chars. Fuera de eso
  // ni miramos la BD — evita queries con strings descomunales.
  if (!code || code.length < 4 || code.length > 64) {
    return NextResponse.json({ found: false } satisfies VerifyResult);
  }

  // ── Server mode: lookup en Supabase ──────────────────────────────────
  // En local mode el server no puede leer localStorage; el cliente sigue
  // haciendo el lookup LS como fallback.
  if (process.env.NEXT_PUBLIC_BACKEND_MODE !== "server") {
    return NextResponse.json({ found: false } satisfies VerifyResult);
  }

  try {
    const db = getDb();
    const all = await db.getInvoices();

    const match = all.find((inv) => {
      const num = inv.invoiceNumber?.toUpperCase();
      const hash = inv.hash?.toUpperCase();
      const csvCode = (
        inv.data?.csvCode as string | undefined
      )?.toUpperCase();

      if (num === code) return true;
      if (hash === code) return true;
      if (hash && code.length >= 8 && hash.startsWith(code)) return true;
      if (csvCode === code) return true;
      return false;
    });

    if (!match) {
      return NextResponse.json({ found: false } satisfies VerifyResult);
    }

    return NextResponse.json({
      found: true,
      id: match.invoiceNumber,
      date: match.createdAt,
      total: match.total,
      clientName: match.customerName,
      status: match.status,
    } satisfies VerifyResultFound);
  } catch {
    // Fail-safe: si la BD falla, NO lo confesamos al cliente; respondemos
    // como "no encontrada" para no exponer infraestructura.
    return NextResponse.json({ found: false } satisfies VerifyResult);
  }
}
