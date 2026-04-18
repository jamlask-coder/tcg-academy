/**
 * POST /api/admin/backup  — subir un snapshot al almacenamiento de servidor.
 * GET  /api/admin/backup  — listar los snapshots almacenados en servidor.
 *
 * Modo "local" (default): las rutas devuelven 501 Not Implemented y el panel
 * sigue usando localStorage — el snapshot ya vive en el navegador y se puede
 * descargar manualmente.
 *
 * Modo "server": se espera que:
 *  - La autenticación del admin se compruebe por token / cookie.
 *  - El payload (cifrado AES-GCM) se almacene en Supabase Storage o S3.
 *  - El registro quede trazado en una tabla `backup_snapshots` con su
 *    checksum original para poder verificar integridad al restaurar.
 *
 * Cómo conectar (cuando se suba a servidor):
 *  1. Implementar `persistSnapshotRemote(payload)` usando Supabase Storage.
 *  2. Implementar `listRemoteSnapshots()` consultando la tabla.
 *  3. Implementar `verifyAdminAuth(req)` con un middleware real.
 *  4. Cambiar `isServerMode()` para que devuelva true según
 *     `process.env.NEXT_PUBLIC_BACKEND_MODE === "server"`.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ─── Config ────────────────────────────────────────────────────────────────

function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

/**
 * Comprobación mínima de autenticación. Cuando el backend sea real,
 * verificar un JWT/cookie de admin. Por ahora se basa en una cabecera
 * `x-admin-token` comparada con un secreto de entorno — suficiente para
 * impedir accesos anónimos al endpoint si ya está desplegado.
 */
function verifyAdminAuth(req: NextRequest): { ok: boolean; reason?: string } {
  const required = process.env.ADMIN_BACKUP_TOKEN;
  if (!required) {
    return { ok: false, reason: "ADMIN_BACKUP_TOKEN no configurado" };
  }
  const provided = req.headers.get("x-admin-token");
  if (!provided) return { ok: false, reason: "Falta cabecera x-admin-token" };
  if (provided !== required) return { ok: false, reason: "Token no válido" };
  return { ok: true };
}

// ─── Tipos compartidos ────────────────────────────────────────────────────

interface RemoteSnapshotMeta {
  id: string;
  createdAt: string;
  size: number;
  checksum: string;
  encrypted: boolean;
  uploadedBy?: string;
  note?: string;
}

// ─── Stubs de persistencia remota ─────────────────────────────────────────

/**
 * STUB: cuando conectemos Supabase, sustituir por:
 *
 *   import { createClient } from "@supabase/supabase-js";
 *   const supabase = createClient(url, serviceRoleKey);
 *   const { error } = await supabase.storage
 *     .from("backups").upload(`${id}.enc.json`, blob);
 *   await supabase.from("backup_snapshots").insert({ id, ... });
 */
async function persistSnapshotRemote(
  _payload: unknown,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  return {
    ok: false,
    error: "Persistencia remota no implementada todavía",
  };
}

async function listRemoteSnapshots(): Promise<RemoteSnapshotMeta[]> {
  return [];
}

// ─── Handlers ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isServerMode()) {
    return NextResponse.json(
      {
        ok: false,
        mode: "local",
        message:
          "Modo local: los snapshots viven en localStorage del navegador. Descárgalos desde /admin/copias.",
      },
      { status: 501 },
    );
  }

  const auth = verifyAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason ?? "No autorizado" },
      { status: 401 },
    );
  }

  try {
    const items = await listRemoteSnapshots();
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Error al listar snapshots",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isServerMode()) {
    return NextResponse.json(
      {
        ok: false,
        mode: "local",
        message:
          "Modo local: no hay servidor para subir el snapshot. El panel ya lo guarda localmente y permite descargar cifrado.",
      },
      { status: 501 },
    );
  }

  const auth = verifyAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason ?? "No autorizado" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 },
    );
  }

  // Validación mínima del payload — se espera un EncryptedPayload o un
  // snapshot en claro con los campos obligatorios.
  const b = body as {
    algo?: string;
    ciphertext?: string;
    data?: unknown;
    checksum?: string;
  } | null;
  const isEncrypted = b?.algo === "AES-GCM" && typeof b.ciphertext === "string";
  const isPlainSnapshot =
    b?.data && typeof b.data === "object" && typeof b.checksum === "string";

  if (!isEncrypted && !isPlainSnapshot) {
    return NextResponse.json(
      { ok: false, error: "El payload no es un snapshot válido" },
      { status: 400 },
    );
  }

  const result = await persistSnapshotRemote(body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Fallo al persistir" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, id: result.id });
}
