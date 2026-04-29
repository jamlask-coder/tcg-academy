/**
 * Diagnóstico end-to-end del flujo /api/auth reset-password.
 *
 * Read-only — NO modifica BD ni envía emails.
 *
 * Comprueba cada eslabón en orden, así sabemos exactamente cuál falla:
 *
 *   1. .env.local tiene NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   2. .env.local tiene NEXT_PUBLIC_BACKEND_MODE=server
 *   3. .env.local tiene RESEND_API_KEY + RESEND_FROM_EMAIL
 *   4. La tabla `reset_tokens` existe en Supabase
 *   5. La plantilla `recuperar_contrasena` existe en src/data/emailTemplates.ts
 *   6. El email proporcionado existe en `users` (case-insensitive)
 *   7. El dominio del FROM_EMAIL responde a un GET en Resend (verificado)
 *   8. (opcional, --send) ejecuta una llamada real al endpoint local
 *
 * Uso:
 *   node scripts/diagnose-reset-password.mjs <email>
 *   node scripts/diagnose-reset-password.mjs <email> --send       # también dispara endpoint
 *   node scripts/diagnose-reset-password.mjs <email> --base=https://tcgacademy.es
 *
 * Salida: paso a paso con OK/FAIL. Al primer FAIL crítico, sale con código 1.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// ── Args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith("--"));
const sendFlag = args.includes("--send");
const baseArg = args.find((a) => a.startsWith("--base="));
const baseUrl = baseArg ? baseArg.slice("--base=".length) : "http://localhost:3000";

if (!email) {
  console.error("Uso: node scripts/diagnose-reset-password.mjs <email> [--send] [--base=URL]");
  process.exit(1);
}

// ── Load .env.local ─────────────────────────────────────────────────────────
const envPath = path.join(repoRoot, ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("✘ FAIL: .env.local no existe en", envPath);
  process.exit(1);
}
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const ok = (label) => console.log(`✓ ${label}`);
const warn = (label) => console.log(`⚠ ${label}`);
const fail = (label) => {
  console.log(`✘ ${label}`);
  process.exit(1);
};

console.log("════════════════════════════════════════════════════════════════");
console.log("  Diagnóstico reset-password — email:", email);
console.log("════════════════════════════════════════════════════════════════\n");

// ── 1. Supabase env ─────────────────────────────────────────────────────────
const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supaUrl || !supaKey) fail("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
ok("env Supabase presente");

// ── 2. Backend mode ─────────────────────────────────────────────────────────
const mode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";
if (mode !== "server") {
  warn(`NEXT_PUBLIC_BACKEND_MODE="${mode}" — el endpoint reset-password hará early-return en línea 149 de /api/auth y NUNCA enviará el email. Cambiar a "server".`);
} else {
  ok('NEXT_PUBLIC_BACKEND_MODE="server"');
}

// ── 3. Resend env ───────────────────────────────────────────────────────────
const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;
if (!resendKey) {
  warn("RESEND_API_KEY no está configurado — el adapter caerá a LocalEmailAdapter (log a localStorage del navegador, NO se envía nada por SMTP).");
} else {
  ok("RESEND_API_KEY presente");
}
if (!fromEmail) warn("RESEND_FROM_EMAIL no configurado — usará SITE_CONFIG.email como fallback");
else ok(`RESEND_FROM_EMAIL=${fromEmail}`);

// ── 4. Tabla reset_tokens ───────────────────────────────────────────────────
const supa = createClient(supaUrl, supaKey, { auth: { persistSession: false } });
{
  const { error } = await supa.from("reset_tokens").select("id").limit(1);
  if (error) fail(`Tabla reset_tokens NO accesible: ${error.message}`);
  ok("Tabla reset_tokens accesible");
}

// ── 5. Plantilla recuperar_contrasena ──────────────────────────────────────
{
  const tplPath = path.join(repoRoot, "src", "data", "emailTemplates.ts");
  const src = fs.readFileSync(tplPath, "utf8");
  if (!/id:\s*"recuperar_contrasena"/.test(src)) {
    fail("Plantilla 'recuperar_contrasena' NO existe en src/data/emailTemplates.ts → resolveTemplate devuelve null → email no se envía");
  }
  ok("Plantilla 'recuperar_contrasena' presente en SSOT");
}

// ── 6. Usuario existe en BD ────────────────────────────────────────────────
const cleanEmail = email.toLowerCase().trim();
{
  const { data, error } = await supa.from("users").select("id,email,first_name,role").ilike("email", cleanEmail);
  if (error) fail(`Error consultando users: ${error.message}`);
  if (!data || data.length === 0) {
    warn(`Email "${cleanEmail}" NO existe en users — el endpoint hará "if (!user) return" silencioso (anti-enumeración). El cliente verá el mismo mensaje pero NO se enviará nada.`);
  } else if (data.length > 1) {
    warn(`${data.length} usuarios coinciden con .ilike "${cleanEmail}" — Supabase .single() fallará en /api/auth getUserByEmail. Posible bug.`);
    console.log("  Coincidencias:", data.map((u) => `${u.id} (${u.email})`).join(", "));
  } else {
    ok(`Usuario encontrado en BD: id=${data[0].id} role=${data[0].role}`);
  }
}

// ── 7. Verificación dominio Resend (best effort) ───────────────────────────
if (resendKey && fromEmail) {
  const domain = fromEmail.split("@")[1];
  if (domain) {
    try {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${resendKey}` },
      });
      if (!res.ok) {
        warn(`No se pudo consultar dominios en Resend (${res.status}). Verifica manualmente que ${domain} esté verified.`);
      } else {
        const json = await res.json();
        const domains = Array.isArray(json?.data) ? json.data : [];
        const match = domains.find((d) => d?.name === domain);
        if (!match) {
          warn(`El dominio "${domain}" NO aparece en tu cuenta Resend. Si el FROM_EMAIL no está en un dominio verificado, Resend devolverá 403.`);
        } else if (match.status !== "verified") {
          warn(`Dominio "${domain}" estado="${match.status}" — debe ser "verified" para que Resend acepte envíos.`);
        } else {
          ok(`Dominio Resend "${domain}" verified`);
        }
      }
    } catch (err) {
      warn(`Error consultando Resend: ${String(err)}`);
    }
  }
}

// ── 8. Llamada real (opcional) ──────────────────────────────────────────────
if (sendFlag) {
  console.log(`\n→ Disparando POST ${baseUrl}/api/auth reset-password ...`);
  try {
    const res = await fetch(`${baseUrl}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: baseUrl },
      body: JSON.stringify({ action: "reset-password", email: cleanEmail }),
    });
    console.log(`  status=${res.status}`);
    const txt = await res.text();
    console.log(`  body=${txt.slice(0, 240)}`);
    if (res.ok) {
      ok("Endpoint respondió 200 — el trabajo real corre en after() (background). Espera 5-15s y verifica:");
      console.log(`     • Tabla reset_tokens (debe tener una fila nueva con user_id del usuario)`);
      console.log(`     • Logs server (Vercel functions o consola dev) → buscar "[reset-password]"`);
      console.log(`     • Bandeja de entrada del email (incluyendo SPAM)`);

      // Espera y verifica reset_tokens
      console.log("\n  Esperando 6s y verificando reset_tokens...");
      await new Promise((r) => setTimeout(r, 6000));
      const { data: u } = await supa.from("users").select("id").ilike("email", cleanEmail).maybeSingle();
      if (u?.id) {
        const { data: tok } = await supa
          .from("reset_tokens")
          .select("id,created_at,expires_at,used_at")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (tok && tok.length > 0) {
          ok(`Reset token creado a ${tok[0].created_at} — el flujo BD funciona. Si no llega email: revisa Resend dashboard/logs.`);
        } else {
          warn("No se creó reset_token. El after() falló antes del INSERT. Revisa logs server.");
        }
      }
    } else {
      warn(`Endpoint devolvió ${res.status} — revisa logs.`);
    }
  } catch (err) {
    warn(`Error llamando al endpoint: ${String(err)}`);
  }
}

console.log("\n════════════════════════════════════════════════════════════════");
console.log("  Diagnóstico completo. Si todos los pasos son ✓, el problema");
console.log("  está en Resend (dominio no verificado, rate limit, dest. en");
console.log("  blocklist). Mira el dashboard Resend → Logs.");
console.log("════════════════════════════════════════════════════════════════");
