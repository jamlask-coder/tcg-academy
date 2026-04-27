/**
 * GET /api/auth/me
 *
 * Hidrata la sesión del usuario actual desde la cookie JWT (`tcga_session`).
 * Returns 401 si no hay cookie válida; 200 con `{ user }` si la sesión es
 * válida.
 *
 * Lo usa `AuthContext` al montar la app en server mode, en lugar de leer el
 * usuario desde localStorage. La cookie httpOnly es la fuente de verdad —
 * localStorage queda solo como caché optimista para que el header se pinte
 * sin esperar al fetch.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isServerMode = () =>
  (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

export async function GET(req: NextRequest) {
  // En modo local, no hay sesión server-side — devolvemos 204 para que el
  // cliente sepa que debe leer localStorage (rama legacy del AuthContext).
  if (!isServerMode()) {
    return new NextResponse(null, { status: 204 });
  }

  const session = await getSessionFromRequest(req);
  if (!session?.sub) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const db = getDb();
    const user = await db.getUser(session.sub);
    if (!user) {
      // Cookie válida pero el usuario fue eliminado. Forzamos logout.
      return NextResponse.json({ ok: false, error: "user-not-found" }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        nif: user.nif,
        nifType: user.nifType,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        birthDate: user.birthDate,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al hidratar sesión";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
