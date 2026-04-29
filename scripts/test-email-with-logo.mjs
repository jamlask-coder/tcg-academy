/**
 * Envío de prueba del email "recuperar_contrasena" con el logo embebido,
 * para validar que el data URI llega correctamente a Gmail.
 *
 * Uso: node scripts/test-email-with-logo.mjs <destinatario>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Cargar .env.local
for (const line of fs.readFileSync(path.join(repoRoot, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const to = process.argv[2];
if (!to) {
  console.error("Uso: node scripts/test-email-with-logo.mjs <email>");
  process.exit(1);
}

// Leer la plantilla y el logo directamente del FS (sin pasar por TypeScript)
const tplSrc = fs.readFileSync(path.join(repoRoot, "src/data/emailTemplates.ts"), "utf8");
const assetsSrc = fs.readFileSync(path.join(repoRoot, "src/data/emailAssets.ts"), "utf8");

const dataUriMatch = assetsSrc.match(/SHIELD_DATA_URI\s*=\s*"([^"]+)"/);
if (!dataUriMatch) {
  console.error("✘ No se pudo extraer SHIELD_DATA_URI de emailAssets.ts");
  process.exit(1);
}
const shieldDataUri = dataUriMatch[1];
console.log("✓ data URI cargada (longitud:", shieldDataUri.length, "chars)");

// Construir el HTML manualmente (replica wrapEmail + plantilla recuperar_contrasena)
const subject = "Restablece tu contraseña de TCG Academy";
const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>TCG Academy</title>
<style>
body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f7fb; }
.wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
.header { background: #132B5F; padding: 16px 40px 14px; text-align: center; }
.header-shield { display: block; margin: 0 auto 14px; width: 84px; height: 84px; border: 0; outline: none; }
.header-logo { color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
.hero { background: #ffffff; padding: 32px 40px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; }
.hero h1 { color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 6px; }
.hero p { color: #64748b; font-size: 14px; margin: 0 0 18px; }
.hero-accent { display: inline-block; height: 3px; width: 48px; border-radius: 2px; background: #fbbf24; margin: 0 0 14px; }
.content { padding: 32px 40px; }
.content p { color: #334155; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
.btn { display: inline-block; background: #fbbf24; color: #0a1628 !important; font-weight: 800; font-size: 15px; padding: 13px 32px; border-radius: 999px; text-decoration: none; }
.info-box { background: #f4f7fc; border-left: 4px solid #2549a8; padding: 16px 20px; border-radius: 0 12px 12px 0; margin: 20px 0; color: #1e293b; }
.footer { background: #0a1530; padding: 22px 40px 20px; text-align: center; color: #c7d4ef; }
.footer p { color: #c7d4ef; font-size: 12px; margin: 0 0 6px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <img src="${shieldDataUri}" alt="TCG Academy" class="header-shield" width="84" height="84" style="display:block;margin:0 auto 14px;width:84px;height:84px;border:0;outline:none;" />
    <div class="header-logo">TCG Academy</div>
  </div>
  <div class="hero">
    <span class="hero-accent"></span>
    <h1>Recupera tu contraseña</h1>
    <p>Has solicitado restablecer tu contraseña</p>
  </div>
  <div class="content">
    <p>Hola Ricardo,</p>
    <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Si fuiste tú, haz clic en el botón de abajo:</p>
    <p style="text-align:center; margin: 28px 0;">
      <a href="https://tcgacademy.es/restablecer-contrasena?token=demo" class="btn">Restablecer contraseña</a>
    </p>
    <div class="info-box">
      Este enlace caducará en <strong>1 hora</strong>. Si no has solicitado este cambio, ignora este email.
    </div>
    <p>Por seguridad, nunca te pediremos tu contraseña por email.</p>
    <p><strong>El equipo de TCG Academy</strong></p>
  </div>
  <div class="footer">
    <p><strong style="color:#ffffff;">TCG Academy</strong> · hola@tcgacademy.es</p>
    <p>Test del logo embebido — si ves el escudo arriba, el fix funciona.</p>
  </div>
</div>
</body>
</html>`;

console.log("html length:", html.length, "bytes");

const r = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.RESEND_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "TCG Academy <" + (process.env.RESEND_FROM_EMAIL ?? "hola@tcgacademy.es") + ">",
    to: [to],
    subject: "[TEST LOGO] " + subject,
    html,
  }),
});
console.log("POST /emails ->", r.status);
console.log("body:", (await r.text()).slice(0, 500));
