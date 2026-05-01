import type { NextRequest} from "next/server";
import { NextResponse, after } from "next/server";
import { persistentRateLimit } from "@/lib/rateLimitStore";
import { getDb } from "@/lib/db";
import {
  hashPassword,
  isLegacyWpHash,
  verifyPassword,
  simulatePasswordVerify,
  enforceMinDuration,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getClientIp,
  getSessionFromRequest,
} from "@/lib/auth";
import { getEmailService } from "@/lib/email";
import { sanitizeString } from "@/utils/sanitize";
import { authBodySchema, zodMessage } from "@/lib/validations/api";
import { verifyTurnstileToken, isTurnstileConfigured } from "@/lib/turnstile";
import { validateSpanishNIF } from "@/lib/validations/nif";
import { validatePasswordForRole } from "@/lib/passwordPolicy";
import { logger } from "@/lib/logger";
import { generateUniqueUsername, isHandleReserved } from "@/lib/userHandle";

const isServerMode = () => (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

/**
 * Devuelve la URL pública del sitio derivándola, en orden:
 *   1. Header `origin` (lo manda el navegador en POST mismo-origen).
 *   2. `protocol://host` reconstruido desde headers (`x-forwarded-proto` + `host`).
 *   3. NEXT_PUBLIC_APP_URL como último recurso.
 *
 * Esto evita el bug "el reset link apunta a localhost en producción" cuando
 * NEXT_PUBLIC_APP_URL está mal configurada en Vercel — el dominio real lo
 * trae siempre el request, así que es la fuente más fiable.
 */
function resolvePublicUrl(req: NextRequest): string {
  const origin = req.headers.get("origin");
  if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/$/, "");

  const host = req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// POST /api/auth — Unified auth endpoint
// CSRF/origin check → aplicado globalmente en `src/proxy.ts`.
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Rate limit general (protege contra bots que martillean la ruta).
    // `persistentRateLimit` usa Supabase en server mode (cuota global
    // real en serverless) y cae al Map in-memory en local mode.
    const rl = await persistentRateLimit(`auth:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera un momento." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      );
    }

    const rawBody = await req.json();
    const parsed = authBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodMessage(parsed.error) },
        { status: 400 },
      );
    }
    const body = rawBody;
    const { action } = parsed.data;

    // Rate limit granular por acción — login/register/reset son los endpoints
    // caros y sensibles (brute force, spam de cuentas). Se aplican ADEMÁS del
    // límite general para que fallos de login no consuman cuota de otras
    // acciones (ej: logout desde la misma IP).
    const granularLimits: Record<string, { max: number; windowMs: number }> = {
      login: { max: 10, windowMs: 300_000 },         // 10 intentos / 5 min
      register: { max: 3, windowMs: 3_600_000 },     // 3 registros / hora
      "reset-password": { max: 3, windowMs: 900_000 }, // 3 solicitudes / 15 min
    };
    const limit = granularLimits[action];
    if (limit) {
      const grl = await persistentRateLimit(`auth:${action}:${ip}`, limit.max, limit.windowMs);
      if (!grl.allowed) {
        return NextResponse.json(
          { error: "Demasiados intentos. Espera unos minutos." },
          { status: 429, headers: { "Retry-After": String(Math.ceil((grl.resetAt - Date.now()) / 1000)) } },
        );
      }
    }

    // Verify Turnstile CAPTCHA on register — must run antes del early return
    // local mode, porque el registro *real* siempre necesita anti-bot si hay
    // secret configurado. Sin secret (dev local), la función devuelve skipped.
    if (action === "register" && isTurnstileConfigured()) {
      const captchaToken: unknown = body.captchaToken;
      const cap = await verifyTurnstileToken(
        typeof captchaToken === "string" ? captchaToken : undefined,
        ip,
      );
      if (!cap.ok) {
        return NextResponse.json(
          { error: "Verificación anti-bot fallida. Recarga la página." },
          { status: 400 },
        );
      }
    }

    // ── Acciones que solo necesitan email (no BD) ──────────────────────────
    // Funcionan en cualquier modo, siempre que RESEND_API_KEY esté configurado.
    // Permite que en modo local (cuenta en localStorage) los emails reales
    // salgan vía servidor — RESEND_API_KEY nunca se expone al cliente.
    if (action === "send-verification-email") {
      const { email: vEmail, name: vName, verifyUrl } = body;
      if (!vEmail || !vName || !verifyUrl) {
        return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
      }
      // Validamos que el host del verifyUrl coincida con NEXT_PUBLIC_APP_URL
      // (o sea localhost en dev). Evita que un actor pueda usar este endpoint
      // para mandar URLs phishing arbitrarias desde nuestro dominio.
      try {
        const expected = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
        const got = new URL(verifyUrl);
        if (got.host !== expected.host) {
          return NextResponse.json({ error: "URL de verificación no permitida" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "URL inválida" }, { status: 400 });
      }
      try {
        const emailService = getEmailService();
        await emailService.sendTemplatedEmail("verificar_email", vEmail.toLowerCase().trim(), {
          nombre: sanitizeString(vName),
          verify_url: verifyUrl,
          expires_in: "7 días",
        });
        return NextResponse.json({ ok: true });
      } catch {
        // No revelar el motivo concreto al cliente.
        return NextResponse.json({ ok: false, error: "No se pudo enviar el email" }, { status: 500 });
      }
    }

    if (!isServerMode()) {
      // Resto de acciones en local mode: return acknowledgment, cliente lo maneja.
      return NextResponse.json({ ok: true, mode: "local", message: "Modo local activo." });
    }

    const db = getDb();

    switch (action) {
      // ── LOGIN ──────────────────────────────────────────────────────────
      case "login": {
        const { email, password, rememberMe } = body;
        const loginStart = Date.now();
        if (!email || !password) {
          return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
        }

        // Rate-limit reforzado para emails admin (configurables vía env).
        // Cualquier intento (válido o no) cuenta. Tras 5 fallos en 15 min, IP
        // bloqueada por la ventana completa. Esto es ADEMÁS del rate-limit
        // general/granular de arriba — los limits se aplican secuencialmente.
        const adminEmails = (process.env.ADMIN_EMAILS ?? "")
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        const candidateEmail = email.includes("@") ? email.toLowerCase().trim() : "";
        const isAdminAttempt =
          candidateEmail && adminEmails.includes(candidateEmail);
        if (isAdminAttempt) {
          const adminRl = await persistentRateLimit(
            `auth:login:admin:${ip}`,
            5,
            900_000, // 15 min
          );
          if (!adminRl.allowed) {
            // Log explícito: intento de fuerza bruta sobre cuenta admin.
            // eslint-disable-next-line no-console
            console.warn(
              `[admin-bruteforce] ip=${ip} email=${candidateEmail} blocked-until=${new Date(adminRl.resetAt).toISOString()}`,
            );
            await enforceMinDuration(loginStart, 500);
            return NextResponse.json(
              { error: "Demasiados intentos. Cuenta protegida temporalmente." },
              {
                status: 429,
                headers: {
                  "Retry-After": String(Math.ceil((adminRl.resetAt - Date.now()) / 1000)),
                },
              },
            );
          }
        }

        // Resolve username → email
        let user;
        if (email.includes("@")) {
          user = await db.getUserByEmail(email.toLowerCase().trim());
        } else {
          user = await db.getUserByUsername(email.trim());
        }

        if (!user) {
          // Timing-safe: simula hash bcrypt contra dummy + padding mínimo para
          // que "user no existe" tarde lo mismo que "user existe, password mala".
          await simulatePasswordVerify(password);
          await enforceMinDuration(loginStart, 500);
          return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
        }

        const passwordValid = await verifyPassword(password, user.passwordHash);
        // Migración silenciosa: usuarios importados de la web WordPress tienen
        // hashes con prefijo `$wp$`. Tras un login válido los re-hashemos al
        // formato bcrypt nativo y persistimos. El usuario no nota nada.
        if (passwordValid && isLegacyWpHash(user.passwordHash)) {
          try {
            const fresh = await hashPassword(password);
            await db.updateUser(user.id, { passwordHash: fresh });
          } catch (e) {
            // No bloqueamos el login si el upgrade falla — el hash legacy sigue
            // funcionando hasta el próximo intento.
            // eslint-disable-next-line no-console
            console.warn(`[wp-hash-upgrade] failed for user ${user.id}: ${String(e)}`);
          }
        }
        if (!passwordValid) {
          await db.logAudit({
            entityType: "user",
            entityId: user.id,
            action: "login_failed",
            ipAddress: ip,
          });
          if (user.role === "admin") {
            // eslint-disable-next-line no-console
            console.warn(
              `[admin-bruteforce] login_failed ip=${ip} email=${user.email} userId=${user.id}`,
            );
          }
          await enforceMinDuration(loginStart, 500);
          return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
        }

        // Generate JWT
        const token = await createSessionToken(
          { id: user.id, email: user.email, role: user.role, name: user.name },
          !!rememberMe,
        );

        // Build response with user profile (no password)
        const userProfile = {
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
        };

        const response = NextResponse.json({ ok: true, user: userProfile });
        setSessionCookie(response, token, !!rememberMe);

        await db.logAudit({
          entityType: "user",
          entityId: user.id,
          action: "login",
          ipAddress: ip,
        });

        return response;
      }

      // ── REGISTER ───────────────────────────────────────────────────────
      case "register": {
        const { name, lastName, email, password, username, phone, nif, nifType, referralCode, marketingConsent } = body;
        if (!name || !email || !password) {
          return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }
        // Política por rol — los registros públicos siempre crean rol "cliente"
        // (líneas más abajo: `role: "cliente"`). Por tanto aplicamos la regla
        // estándar (≥6). El rol admin solo se concede manualmente en BD y su
        // contraseña se rota vía change-password con la política estricta.
        const pwdCheck = validatePasswordForRole(password, "cliente");
        if (!pwdCheck.ok) {
          return NextResponse.json({ error: pwdCheck.error }, { status: 400 });
        }

        const cleanEmail = email.toLowerCase().trim();
        const cleanUsername = username?.toLowerCase().trim();

        // Check email uniqueness
        const existingEmail = await db.getUserByEmail(cleanEmail);
        if (existingEmail) {
          return NextResponse.json({ error: "Este email ya está registrado" }, { status: 409 });
        }

        // Check username uniqueness
        if (cleanUsername) {
          const existingUsername = await db.getUserByUsername(cleanUsername);
          if (existingUsername) {
            return NextResponse.json({ error: "Este nombre de usuario ya está en uso" }, { status: 409 });
          }
        }

        // NIF/NIE/CIF: re-validar server-side con el MISMO algoritmo
        // (mod-23 + checksum CIF). El schema Zod ya lo rechaza, pero
        // detectamos aquí el tipo auténtico y comprobamos unicidad.
        const nifResult = validateSpanishNIF(typeof nif === "string" ? nif : "");
        if (!nifResult.valid) {
          return NextResponse.json(
            { error: nifResult.error ?? "NIF/NIE/CIF inválido" },
            { status: 400 },
          );
        }
        const cleanNif = nifResult.normalized;
        const detectedNifType: "DNI" | "NIE" | "CIF" =
          nifResult.type === "DNI" || nifResult.type === "NIE" || nifResult.type === "CIF"
            ? nifResult.type
            : (nifType === "DNI" || nifType === "NIE" || nifType === "CIF" ? nifType : "DNI");

        // Integridad: un mismo NIF no puede estar ligado a dos cuentas.
        const existingByNif = await db.getUserByNif(cleanNif);
        if (existingByNif) {
          return NextResponse.json(
            { error: "Ya existe una cuenta asociada a este NIF/NIE/CIF" },
            { status: 409 },
          );
        }

        // Hash password with bcrypt
        const passwordHash = await hashPassword(password);

        const newUser = await db.createUser({
          id: crypto.randomUUID(),
          email: cleanEmail,
          username: cleanUsername || undefined,
          passwordHash,
          name: sanitizeString(name),
          lastName: sanitizeString(lastName || ""),
          phone: phone ? sanitizeString(phone) : "",
          role: "cliente",
          nif: cleanNif,
          nifType: detectedNifType,
          referralCode: undefined, // auto-generated by DB trigger
          referredBy: referralCode?.toUpperCase().trim() || undefined,
        });

        // Record GDPR consents
        const consentTypes = [
          { type: "terms", status: "granted" as const },
          { type: "privacy", status: "granted" as const },
          { type: "data_processing", status: "granted" as const },
          { type: "marketing_email", status: (marketingConsent ? "granted" : "revoked") as "granted" | "revoked" },
        ];
        for (const c of consentTypes) {
          await db.createConsent({
            userId: newUser.id,
            type: c.type,
            status: c.status,
            method: "registration_form",
            version: "2026-04",
            ipAddress: ip,
            userAgent: req.headers.get("user-agent") ?? undefined,
          });
        }

        // Generate JWT
        const token = await createSessionToken({
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          name: newUser.name,
        });

        // Send welcome email
        const emailService = getEmailService();
        await emailService.sendTemplatedEmail("bienvenida", cleanEmail, {
          nombre: newUser.name,
          email: cleanEmail,
        });

        // Issue email verification token + send verification email.
        // Server-side porque RESEND_API_KEY no está expuesto al cliente.
        try {
          const verifBytes = new Uint8Array(32);
          crypto.getRandomValues(verifBytes);
          const verifRaw = Array.from(verifBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
          const verifHashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifRaw));
          const verifHash = Array.from(new Uint8Array(verifHashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
          const sevenDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
          await db.createEmailVerificationToken({
            userId: newUser.id,
            email: cleanEmail,
            tokenHash: verifHash,
            expiresAt: sevenDays,
          });
          const appUrl = resolvePublicUrl(req);
          const verifyUrl = `${appUrl}/verificar-email?token=${verifRaw}&email=${encodeURIComponent(cleanEmail)}`;
          await emailService.sendTemplatedEmail("verificar_email", cleanEmail, {
            nombre: newUser.name,
            verify_url: verifyUrl,
            expires_in: "7 días",
            unsubscribe_link: `${appUrl}/cuenta/preferencias`,
          });
        } catch {
          // No bloquear el registro si el email de verificación falla — el
          // usuario puede reenviarlo desde /cuenta vía EmailVerificationBanner.
        }

        const response = NextResponse.json({
          ok: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            name: newUser.name,
            lastName: newUser.lastName,
            phone: newUser.phone,
            role: newUser.role,
            nif: newUser.nif,
            nifType: newUser.nifType,
            referralCode: newUser.referralCode,
            referredBy: newUser.referredBy,
            emailVerified: newUser.emailVerified,
            emailVerifiedAt: newUser.emailVerifiedAt,
            createdAt: newUser.createdAt,
          },
        });
        setSessionCookie(response, token);

        await db.logAudit({
          entityType: "user",
          entityId: newUser.id,
          action: "register",
          ipAddress: ip,
        });

        return response;
      }

      // ── RESET PASSWORD REQUEST ─────────────────────────────────────────
      // Optimizado para latencia percibida: respondemos al cliente INMEDIATAMENTE
      // (sin lookup, sin enviar email, sin padding) y todo el trabajo costoso
      // se hace en `after()` después de que el response salga del servidor.
      // Esto consigue dos cosas a la vez:
      //   1. UX: el navegador recibe "revisa tu email" en ~30ms en vez de ~800ms.
      //   2. Seguridad: el response es siempre instantáneo independientemente
      //      de si el email existe o no — elimina por completo el timing-attack
      //      que enumeraba emails midiendo latencias (ya no hace falta el
      //      `enforceMinDuration` porque no hay diferencia que igualar).
      case "reset-password": {
        const { email: resetEmail } = body;
        if (!resetEmail) {
          return NextResponse.json({ error: "Email requerido" }, { status: 400 });
        }

        const cleanEmail = resetEmail.toLowerCase().trim();
        const appUrl = resolvePublicUrl(req);

        after(async () => {
          try {
            const user = await db.getUserByEmail(cleanEmail);
            if (!user) return; // silencioso: no hay nada que enviar

            // Token crypto-random + almacenamos solo el hash (nunca el raw).
            const tokenBytes = new Uint8Array(32);
            crypto.getRandomValues(tokenBytes);
            const rawToken = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
            const tokenHashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
            const tokenHash = Array.from(new Uint8Array(tokenHashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

            await db.createResetToken({
              userId: user.id,
              tokenHash,
              expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 h
            });

            const resetLink = `${appUrl}/restablecer-contrasena?token=${rawToken}&email=${encodeURIComponent(cleanEmail)}`;
            const emailService = getEmailService();
            const sendResult = await emailService.sendTemplatedEmail("recuperar_contrasena", cleanEmail, {
              nombre: user.name ?? cleanEmail.split("@")[0],
              reset_url: resetLink,
              expires_in: "1 hora",
              unsubscribe_link: `${appUrl}/cuenta/preferencias`,
            });
            if (!sendResult.ok) {
              // eslint-disable-next-line no-console
              console.error(`[reset-password] email send failed for userId=${user.id}`);
            }

            await db.logAudit({
              entityType: "user",
              entityId: user.id,
              action: "reset_password_requested",
              ipAddress: ip,
            });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("[reset-password] background error:", err);
          }
        });

        // Response inmediato — el navegador no se queda bloqueado.
        return NextResponse.json({ ok: true, message: "Si el email existe, se enviará un enlace." });
      }

      // ── RESET PASSWORD CONFIRM ─────────────────────────────────────────
      case "reset-confirm": {
        const { email: confirmEmail, token, newPassword } = body;
        if (!confirmEmail || !token || !newPassword) {
          return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }

        const cleanEmail = confirmEmail.toLowerCase().trim();

        // Rate limit brute-force de tokens por email: 5 intentos / 5 min
        const confirmRl = await persistentRateLimit(`reset-confirm:${cleanEmail}`, 5, 300_000);
        if (!confirmRl.allowed) {
          return NextResponse.json(
            { error: "Demasiados intentos. Solicita un nuevo enlace." },
            { status: 429 },
          );
        }

        const user = await db.getUserByEmail(cleanEmail);
        if (!user) {
          return NextResponse.json({ error: "Enlace no válido o expirado" }, { status: 400 });
        }

        // Política por rol: si el usuario es admin, la nueva contraseña debe
        // cumplir la regla estricta (≥12 + Aa1*). Para el resto, ≥6 basta.
        const resetPwdCheck = validatePasswordForRole(newPassword, user.role);
        if (!resetPwdCheck.ok) {
          return NextResponse.json({ error: resetPwdCheck.error }, { status: 400 });
        }

        // Hash the provided token and compare with stored hash
        const tokenHashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
        const tokenHash = Array.from(new Uint8Array(tokenHashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

        const storedToken = await db.getResetToken(user.id);
        if (!storedToken || storedToken.tokenHash !== tokenHash) {
          return NextResponse.json({ error: "Enlace no válido o expirado" }, { status: 400 });
        }

        // Check expiry
        if (new Date(storedToken.expiresAt) < new Date()) {
          return NextResponse.json({ error: "Enlace expirado. Solicita uno nuevo." }, { status: 400 });
        }

        // Hash new password and update
        const newHash = await hashPassword(newPassword);
        await db.updateUser(user.id, { passwordHash: newHash });

        // Invalidate the token
        await db.deleteResetToken(user.id);

        await db.logAudit({
          entityType: "user",
          entityId: user.id,
          action: "password_reset",
          ipAddress: ip,
        });

        // Send confirmation email — fire-and-forget en after() para que el
        // response llegue inmediato. Si Resend tarda, el usuario no se entera.
        after(async () => {
          try {
            const emailService = getEmailService();
            await emailService.sendEmail(
              cleanEmail,
              "Contraseña actualizada — TCG Academy",
              `
              <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px">
                <h2 style="color:#15306b">TCG Academy</h2>
                <p>Tu contraseña ha sido actualizada correctamente.</p>
                <p>Si no has realizado este cambio, contacta con nosotros inmediatamente.</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
                <p style="color:#94a3b8;font-size:11px">TCG Academy — Tu tienda de cartas coleccionables</p>
              </div>
              `,
            );
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("[reset-confirm] confirmation email failed:", err);
          }
        });

        return NextResponse.json({ ok: true, message: "Contraseña actualizada." });
      }

      // ── CHANGE PASSWORD (authenticated) ────────────────────────────────
      case "change-password": {
        const { userId, currentPassword, newPassword: newPwd } = body;
        if (!userId || !currentPassword || !newPwd) {
          return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }

        const user = await db.getUser(userId);
        if (!user) {
          return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const valid = await verifyPassword(currentPassword, user.passwordHash);
        if (!valid) {
          return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 401 });
        }

        // Política por rol — si la cuenta es admin, exige Aa1*+12 chars.
        // Para roles estándar basta con ≥6 caracteres (cualquier cosa).
        const cpwCheck = validatePasswordForRole(newPwd, user.role);
        if (!cpwCheck.ok) {
          return NextResponse.json({ error: cpwCheck.error }, { status: 400 });
        }

        const newHash = await hashPassword(newPwd);
        await db.updateUser(userId, { passwordHash: newHash });

        await db.logAudit({
          entityType: "user",
          entityId: userId,
          action: "password_changed",
          ipAddress: ip,
        });

        return NextResponse.json({ ok: true });
      }

      // ── VERIFY EMAIL ───────────────────────────────────────────────────
      case "verify-email": {
        const { email: vEmail, token: vToken } = body;
        if (!vEmail || !vToken) {
          return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }
        const cleanEmail = vEmail.toLowerCase().trim();

        // Rate limit brute-force de tokens por email: 5 intentos / 5 min
        const verRl = await persistentRateLimit(`verify-email:${cleanEmail}`, 5, 300_000);
        if (!verRl.allowed) {
          return NextResponse.json({ error: "Demasiados intentos." }, { status: 429 });
        }

        const user = await db.getUserByEmail(cleanEmail);
        if (!user) {
          return NextResponse.json({ error: "Enlace no válido" }, { status: 400 });
        }

        const stored = await db.getActiveEmailVerificationToken(cleanEmail);
        if (!stored) {
          return NextResponse.json({ error: "Enlace no válido o ya usado" }, { status: 400 });
        }
        if (new Date(stored.expiresAt) < new Date()) {
          return NextResponse.json({ error: "Enlace expirado" }, { status: 400 });
        }
        const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(vToken));
        const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
        if (hash !== stored.tokenHash) {
          return NextResponse.json({ error: "Enlace no válido" }, { status: 400 });
        }

        await db.markEmailVerified(user.id);
        await db.markEmailVerificationTokenUsed(cleanEmail);

        await db.logAudit({
          entityType: "user",
          entityId: user.id,
          action: "email_verified",
          ipAddress: ip,
        });

        return NextResponse.json({ ok: true });
      }

      // ── RESEND VERIFICATION ────────────────────────────────────────────
      case "resend-verification": {
        const resendStart = Date.now();
        const { email: rEmail } = body;
        if (!rEmail) {
          return NextResponse.json({ error: "Email requerido" }, { status: 400 });
        }
        const cleanEmail = rEmail.toLowerCase().trim();

        // Rate limit: 3 reenvíos cada 15 min por email
        const rsRl = await persistentRateLimit(`resend-verif:${cleanEmail}`, 3, 900_000);
        if (!rsRl.allowed) {
          return NextResponse.json({ error: "Espera unos minutos antes de reintentar." }, { status: 429 });
        }

        const user = await db.getUserByEmail(cleanEmail);
        // Nunca revelar si el email existe o no (enumeration + timing).
        if (!user) {
          await enforceMinDuration(resendStart, 500);
          return NextResponse.json({ ok: true });
        }

        const verifBytes = new Uint8Array(32);
        crypto.getRandomValues(verifBytes);
        const verifRaw = Array.from(verifBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
        const verifHashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifRaw));
        const verifHash = Array.from(new Uint8Array(verifHashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
        const sevenDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

        await db.createEmailVerificationToken({
          userId: user.id,
          email: cleanEmail,
          tokenHash: verifHash,
          expiresAt: sevenDays,
        });

        const appUrl = resolvePublicUrl(req);
        const verifyUrl = `${appUrl}/verificar-email?token=${verifRaw}&email=${encodeURIComponent(cleanEmail)}`;
        const emailService = getEmailService();
        await emailService.sendTemplatedEmail("verificar_email", cleanEmail, {
          nombre: user.name,
          verify_url: verifyUrl,
          expires_in: "7 días",
          unsubscribe_link: `${appUrl}/cuenta/preferencias`,
        });

        await enforceMinDuration(resendStart, 500);
        return NextResponse.json({ ok: true });
      }

      // ── UPDATE PROFILE ─────────────────────────────────────────────────
      // Actualiza name/lastName/phone/nif/nifType del usuario AUTENTICADO.
      // El userId NUNCA se lee del body — se obtiene de la cookie de sesión
      // para impedir que un atacante modifique perfiles ajenos.
      case "update-profile": {
        const session = await getSessionFromRequest(req);
        if (!session?.sub) {
          return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }
        const sessionUserId: string = session.sub;
        const current = await db.getUser(sessionUserId);
        if (!current) {
          return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const profileBody = parsed.data as {
          action: "update-profile";
          name?: string;
          lastName?: string;
          phone?: string;
          nif?: string;
          nifType?: "DNI" | "NIE" | "CIF";
        };

        const updates: Partial<{
          name: string;
          lastName: string;
          phone: string;
          nif: string;
          nifType: "DNI" | "NIE" | "CIF";
        }> = {};

        if (typeof profileBody.name === "string") updates.name = sanitizeString(profileBody.name).slice(0, 80);
        if (typeof profileBody.lastName === "string") updates.lastName = sanitizeString(profileBody.lastName).slice(0, 120);
        if (typeof profileBody.phone === "string") updates.phone = sanitizeString(profileBody.phone).slice(0, 30);

        if (typeof profileBody.nif === "string") {
          const rawNif = sanitizeString(profileBody.nif).toUpperCase();
          if (rawNif) {
            const nifCheck = validateSpanishNIF(rawNif);
            if (!nifCheck.valid) {
              return NextResponse.json({ error: nifCheck.error ?? "NIF inválido" }, { status: 400 });
            }
            // 1 NIF = 1 usuario: rechazar si pertenece a otro
            const owner = await db.getUserByNif(rawNif);
            if (owner && owner.id !== sessionUserId) {
              return NextResponse.json(
                { error: "Este NIF ya está asignado a otra cuenta." },
                { status: 409 },
              );
            }
            updates.nif = rawNif;
            if (profileBody.nifType === "DNI" || profileBody.nifType === "NIE" || profileBody.nifType === "CIF") {
              updates.nifType = profileBody.nifType;
            }
          }
        }

        if (Object.keys(updates).length === 0) {
          return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
        }

        await db.updateUser(sessionUserId, updates);

        await db.logAudit({
          entityType: "user",
          entityId: sessionUserId,
          action: "profile_updated",
          ipAddress: ip,
          newValue: Object.keys(updates).join(","),
        });

        const updated = await db.getUser(sessionUserId);
        return NextResponse.json({ ok: true, user: updated });
      }

      // ── CHANGE EMAIL ───────────────────────────────────────────────────
      // Cambia el email del usuario autenticado. Valida colisión en BD.
      // Solo server-mode — el endpoint asume Supabase como SSOT.
      case "change-email": {
        const session = await getSessionFromRequest(req);
        if (!session?.sub) {
          return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }
        const userId = session.sub;
        const newEmail = String((parsed.data as { newEmail?: string }).newEmail ?? "")
          .trim()
          .toLowerCase();
        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
          return NextResponse.json({ error: "Email inválido" }, { status: 400 });
        }

        const current = await db.getUser(userId);
        if (!current) {
          return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }
        if (current.email.toLowerCase() === newEmail) {
          return NextResponse.json({ ok: true });
        }

        const collision = await db.getUserByEmail(newEmail);
        if (collision && collision.id !== userId) {
          return NextResponse.json(
            { error: "Este email ya está registrado" },
            { status: 409 },
          );
        }

        // No hay db.updateUser para email — usar SQL directo via supabase.
        // Para evitar acoplamiento, hacemos la actualización vía un método
        // dedicado. Si no existe, fallback con error explícito (no silencioso).
        try {
          await db.updateUserEmail?.(userId, newEmail);
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : "No se pudo cambiar el email" },
            { status: 500 },
          );
        }

        await db.logAudit({
          entityType: "user",
          entityId: userId,
          action: "email_changed",
          ipAddress: ip,
          oldValue: current.email,
          newValue: newEmail,
        });

        return NextResponse.json({ ok: true });
      }

      // ── UPDATE ADDRESSES (replace all) ──────────────────────────────────
      case "update-addresses": {
        const session = await getSessionFromRequest(req);
        if (!session?.sub) {
          return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }
        const userId = session.sub;

        const incoming = (parsed.data as {
          addresses: Array<{
            id?: string;
            label: string;
            nombre?: string;
            apellidos?: string;
            calle: string;
            numero: string;
            piso?: string;
            cp: string;
            ciudad: string;
            provincia: string;
            pais: string;
            telefono?: string;
            predeterminada: boolean;
          }>;
        }).addresses;

        // Snapshot actual en BD para detectar borrados.
        const existing = await db.getAddresses(userId);
        const incomingIds = new Set(
          incoming.map((a) => a.id).filter((id): id is string => Boolean(id)),
        );

        // Borrar las que ya no están.
        for (const old of existing) {
          if (!incomingIds.has(old.id)) {
            try {
              await db.deleteAddress(old.id);
            } catch (err) {
              logger.error("deleteAddress failed", "update-addresses", { id: old.id, err: String(err) });
            }
          }
        }

        // Upsert las nuevas/modificadas.
        for (const a of incoming) {
          const fullName = `${a.nombre ?? ""} ${a.apellidos ?? ""}`.trim();
          const recipient = sanitizeString(fullName) || sanitizeString(a.label);
          const street = sanitizeString(`${a.calle} ${a.numero}`.trim());
          try {
            await db.upsertAddress({
              id: a.id || crypto.randomUUID(),
              userId,
              label: sanitizeString(a.label).slice(0, 60),
              recipient: recipient.slice(0, 160),
              street: street.slice(0, 200),
              floor: a.piso ? sanitizeString(a.piso).slice(0, 40) : undefined,
              postalCode: sanitizeString(a.cp).slice(0, 15),
              city: sanitizeString(a.ciudad).slice(0, 80),
              province: sanitizeString(a.provincia).slice(0, 80),
              country: sanitizeString(a.pais || "ES").slice(0, 3),
              phone: a.telefono ? sanitizeString(a.telefono).slice(0, 30) : undefined,
              isDefault: !!a.predeterminada,
            });
          } catch (err) {
            logger.error("upsertAddress failed", "update-addresses", { err: String(err) });
            return NextResponse.json(
              { error: err instanceof Error ? err.message : "No se pudo guardar la dirección" },
              { status: 500 },
            );
          }
        }

        await db.logAudit({
          entityType: "user",
          entityId: userId,
          action: "addresses_updated",
          ipAddress: ip,
          newValue: String(incoming.length),
        });

        return NextResponse.json({ ok: true, count: incoming.length });
      }

      // ── UPDATE EMPRESA (B2B fiscal data) ────────────────────────────────
      case "update-empresa": {
        const session = await getSessionFromRequest(req);
        if (!session?.sub) {
          return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }
        const userId = session.sub;
        const empresa = (parsed.data as {
          empresa: {
            cif: string;
            razonSocial: string;
            direccionFiscal: string;
            personaContacto: string;
            telefonoEmpresa: string;
            emailFacturacion?: string;
          } | null;
        }).empresa;

        if (!empresa) {
          // Si llega null, borrar el perfil de empresa.
          try {
            await db.deleteCompanyProfile?.(userId);
          } catch (err) {
            logger.error("delete failed", "update-empresa", { err: String(err) });
          }
          return NextResponse.json({ ok: true });
        }

        try {
          const existing = await db.getCompanyProfile(userId);
          await db.upsertCompanyProfile({
            id: existing?.id ?? crypto.randomUUID(),
            userId,
            cif: sanitizeString(empresa.cif).toUpperCase().slice(0, 20),
            legalName: sanitizeString(empresa.razonSocial).slice(0, 160),
            fiscalAddress: sanitizeString(empresa.direccionFiscal).slice(0, 240),
            contactPerson: sanitizeString(empresa.personaContacto).slice(0, 120),
            companyPhone: empresa.telefonoEmpresa
              ? sanitizeString(empresa.telefonoEmpresa).slice(0, 30)
              : undefined,
            billingEmail: empresa.emailFacturacion?.trim().toLowerCase() || undefined,
          });
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : "No se pudo guardar la empresa" },
            { status: 500 },
          );
        }

        await db.logAudit({
          entityType: "user",
          entityId: userId,
          action: "company_updated",
          ipAddress: ip,
        });

        return NextResponse.json({ ok: true });
      }

      // ── UPDATE FAVORITES (replace full set) ─────────────────────────────
      case "update-favorites": {
        const session = await getSessionFromRequest(req);
        if (!session?.sub) {
          return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }
        const userId = session.sub;
        const wanted = new Set((parsed.data as { favorites: number[] }).favorites);

        let existing: number[] = [];
        try {
          const rows = await db.getFavorites(userId);
          existing = rows.map((r) => r.productId);
        } catch (err) {
          logger.error("getFavorites failed", "update-favorites", { err: String(err) });
        }
        const existingSet = new Set(existing);

        // Diff: añadir los nuevos, quitar los que ya no están.
        const toAdd = [...wanted].filter((id) => !existingSet.has(id));
        const toRemove = existing.filter((id) => !wanted.has(id));

        for (const id of toAdd) {
          try {
            await db.addFavorite(userId, id);
          } catch (err) {
            logger.error("addFavorite failed", "update-favorites", { id, err: String(err) });
          }
        }
        for (const id of toRemove) {
          try {
            await db.removeFavorite(userId, id);
          } catch (err) {
            logger.error("removeFavorite failed", "update-favorites", { id, err: String(err) });
          }
        }

        return NextResponse.json({ ok: true, added: toAdd.length, removed: toRemove.length });
      }

      // ── GOOGLE SIGN-IN ──────────────────────────────────────────────────
      // Server-mode reactivation: verifica el id_token de Google contra su
      // JWKS pública (no nos fiamos de lo que decodificó el cliente), busca
      // o crea el usuario en Supabase y emite la cookie de sesión propia.
      case "google-signin": {
        const { idToken } = parsed.data as { action: "google-signin"; idToken: string };
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) {
          return NextResponse.json(
            { error: "Login con Google no configurado" },
            { status: 500 },
          );
        }

        // Verificar contra JWKS de Google. `jose` cachea el set internamente.
        const { jwtVerify, createRemoteJWKSet } = await import("jose");
        const JWKS = createRemoteJWKSet(
          new URL("https://www.googleapis.com/oauth2/v3/certs"),
        );

        let claims: {
          sub?: string;
          email?: string;
          email_verified?: boolean;
          name?: string;
          given_name?: string;
          family_name?: string;
          picture?: string;
        };
        try {
          const { payload } = await jwtVerify(idToken, JWKS, {
            issuer: ["https://accounts.google.com", "accounts.google.com"],
            audience: clientId,
          });
          claims = payload as typeof claims;
        } catch (err) {
          logger.error("google id_token verify failed", "google-signin", {
            err: String(err),
          });
          return NextResponse.json(
            { error: "Token de Google no válido" },
            { status: 401 },
          );
        }

        const email = (claims.email ?? "").toLowerCase().trim();
        if (!email) {
          return NextResponse.json(
            { error: "Google no devolvió un email" },
            { status: 400 },
          );
        }
        if (claims.email_verified !== true) {
          return NextResponse.json(
            { error: "Tu email de Google no está verificado" },
            { status: 400 },
          );
        }

        const cleanName = sanitizeString(
          claims.given_name ?? claims.name?.split(" ")[0] ?? "",
        ).slice(0, 80);
        const cleanLastName = sanitizeString(
          claims.family_name ??
            claims.name?.split(" ").slice(1).join(" ") ??
            "",
        ).slice(0, 120);

        let user = await db.getUserByEmail(email);
        let created = false;

        if (!user) {
          // Auto-registro: cliente, email pre-verificado por Google.
          // Password aleatoria — el usuario puede solicitar reset si quiere
          // poder loguearse sin Google.
          const randomPw = `${crypto.randomUUID()}${crypto.randomUUID()}`;
          const passwordHash = await hashPassword(randomPw);

          // Generamos un username automático (slug name+lastName o prefijo
          // email) — sin él, /admin/usuarios/[handle] no puede resolver al
          // usuario porque el id es UUID. Bug detectado 2026-05-01: el panel
          // admin daba "Usuario no encontrado" para todo registro Google.
          const baseName = cleanName || email.split("@")[0];
          const candidates: string[] = [];
          const generated = generateUniqueUsername({
            name: baseName,
            lastName: cleanLastName,
            email,
            isUsed: (h) => candidates.includes(h) || isHandleReserved(h),
          });
          // Comprobación final contra BD (la función pura no tiene acceso).
          let finalUsername = generated;
          for (let i = 0; i < 5; i++) {
            const exists = await db.getUserByUsername(finalUsername);
            if (!exists) break;
            const suffix = Math.random().toString(36).slice(2, 6);
            finalUsername = `${generated.slice(0, 20 - suffix.length - 1)}-${suffix}`;
          }

          user = await db.createUser({
            id: crypto.randomUUID(),
            email,
            username: finalUsername,
            passwordHash,
            name: baseName,
            lastName: cleanLastName,
            phone: "",
            role: "cliente",
            nif: undefined,
            nifType: undefined,
            referralCode: undefined,
            referredBy: undefined,
          });
          created = true;

          // Google ya validó el email — marcamos como verificado en BD para
          // que el banner de "verifica tu email" no aparezca a estos usuarios.
          try {
            await db.markEmailVerified(user.id);
            user = (await db.getUser(user.id)) ?? user;
          } catch (err) {
            logger.error("markEmailVerified after google create failed", "google-signin", {
              err: String(err),
            });
          }

          // Consents RGPD (Art. 7 — método google_signin).
          const consentTypes = [
            { type: "terms", status: "granted" as const },
            { type: "privacy", status: "granted" as const },
            { type: "data_processing", status: "granted" as const },
          ];
          for (const c of consentTypes) {
            await db.createConsent({
              userId: user.id,
              type: c.type,
              status: c.status,
              method: "google_signin",
              version: "2026-04",
              ipAddress: ip,
              userAgent: req.headers.get("user-agent") ?? undefined,
            });
          }

          await db.logAudit({
            entityType: "user",
            entityId: user.id,
            action: "register",
            ipAddress: ip,
            newValue: "google",
          });
        } else {
          // Usuario ya existía: si Google certifica el email y nosotros no
          // lo teníamos verificado, lo subimos a verificado ahora.
          if (!user.emailVerified) {
            try {
              await db.markEmailVerified(user.id);
              user = (await db.getUser(user.id)) ?? user;
            } catch (err) {
              logger.error("markEmailVerified failed", "google-signin", {
                err: String(err),
              });
            }
          }
        }

        const token = await createSessionToken(
          { id: user.id, email: user.email, role: user.role, name: user.name },
          true, // Google login = remember me por defecto
        );

        const userProfile = {
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
        };

        const response = NextResponse.json({
          ok: true,
          user: userProfile,
          created,
        });
        setSessionCookie(response, token, true);

        await db.logAudit({
          entityType: "user",
          entityId: user.id,
          action: "login",
          ipAddress: ip,
          newValue: "google",
        });

        return response;
      }

      // ── LOGOUT ─────────────────────────────────────────────────────────
      case "logout": {
        const response = NextResponse.json({ ok: true });
        clearSessionCookie(response);
        return response;
      }

      // ── HEARTBEAT ──────────────────────────────────────────────────────
      // Cliente logueado pinguea cada ~60s. Sólo escribimos last_seen_at en
      // server mode; en local mode es no-op porque el admin no consulta una
      // sesión distinta a la suya.
      case "heartbeat": {
        if (!isServerMode()) return NextResponse.json({ ok: true });
        const session = await getSessionFromRequest(req);
        if (!session?.sub) {
          // 200 silencioso: no queremos que el cliente vea fallar el ping si
          // la cookie ha caducado — el AuthContext ya gestiona el logout.
          return NextResponse.json({ ok: true });
        }
        try {
          const db = await getDb();
          await db.updateLastSeen(session.sub, new Date().toISOString());
        } catch {
          // Errores de heartbeat no deben romper la sesión del cliente.
        }
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de autenticación";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
