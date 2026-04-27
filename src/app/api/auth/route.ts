import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { persistentRateLimit } from "@/lib/rateLimitStore";
import { getDb } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  simulatePasswordVerify,
  enforceMinDuration,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getClientIp,
} from "@/lib/auth";
import { getEmailService } from "@/lib/email";
import { sanitizeString } from "@/utils/sanitize";
import { authBodySchema, zodMessage } from "@/lib/validations/api";
import { verifyTurnstileToken, isTurnstileConfigured } from "@/lib/turnstile";
import { validateSpanishNIF } from "@/lib/validations/nif";

const isServerMode = () => (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

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

    if (!isServerMode()) {
      // Local mode: return acknowledgment, client handles everything
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
        if (password.length < 8) {
          return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
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
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
          const verifyUrl = `${appUrl}/verificar-email?token=${verifRaw}&email=${encodeURIComponent(cleanEmail)}`;
          await emailService.sendTemplatedEmail("verificar_email", cleanEmail, {
            nombre: newUser.name,
            verify_url: verifyUrl,
            expires_in: "7 días",
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
      case "reset-password": {
        const resetStart = Date.now();
        const { email: resetEmail } = body;
        if (!resetEmail) {
          return NextResponse.json({ error: "Email requerido" }, { status: 400 });
        }

        const cleanEmail = resetEmail.toLowerCase().trim();
        const user = await db.getUserByEmail(cleanEmail);

        // Always return success to prevent email enumeration + timing padding
        // (generar token + enviar email tarda ~200-400ms, la rama "no existe"
        // respondía mucho antes y se podía enumerar midiendo latencias).
        if (!user) {
          await enforceMinDuration(resetStart, 600);
          return NextResponse.json({ ok: true, message: "Si el email existe, se enviará un enlace." });
        }

        // Generate crypto-random token
        const tokenBytes = new Uint8Array(32);
        crypto.getRandomValues(tokenBytes);
        const rawToken = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, "0")).join("");

        // Store hash of token (never store raw token in DB)
        const tokenHashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
        const tokenHash = Array.from(new Uint8Array(tokenHashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

        await db.createResetToken({
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        });

        // Send reset email
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const resetLink = `${appUrl}/restablecer-contrasena?token=${rawToken}&email=${encodeURIComponent(cleanEmail)}`;

        const emailService = getEmailService();
        await emailService.sendEmail(
          cleanEmail,
          "Restablece tu contraseña — TCG Academy",
          `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="color:#1e40af">TCG Academy</h2>
            <p>Has solicitado restablecer tu contraseña.</p>
            <p>Haz clic en el siguiente enlace (válido durante 1 hora):</p>
            <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
              Restablecer contraseña
            </a>
            <p style="color:#666;font-size:13px">Si no has solicitado este cambio, ignora este email.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="color:#999;font-size:11px">TCG Academy — La mejor tienda TCG de España</p>
          </div>
          `,
        );

        await db.logAudit({
          entityType: "user",
          entityId: user.id,
          action: "reset_password_requested",
          ipAddress: ip,
        });

        await enforceMinDuration(resetStart, 600);
        return NextResponse.json({ ok: true, message: "Si el email existe, se enviará un enlace." });
      }

      // ── RESET PASSWORD CONFIRM ─────────────────────────────────────────
      case "reset-confirm": {
        const { email: confirmEmail, token, newPassword } = body;
        if (!confirmEmail || !token || !newPassword) {
          return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }
        if (newPassword.length < 8) {
          return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
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

        // Send confirmation email
        const emailService = getEmailService();
        await emailService.sendEmail(
          cleanEmail,
          "Contraseña actualizada — TCG Academy",
          `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="color:#1e40af">TCG Academy</h2>
            <p>Tu contraseña ha sido actualizada correctamente.</p>
            <p>Si no has realizado este cambio, contacta con nosotros inmediatamente.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="color:#999;font-size:11px">TCG Academy — La mejor tienda TCG de España</p>
          </div>
          `,
        );

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

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const verifyUrl = `${appUrl}/verificar-email?token=${verifRaw}&email=${encodeURIComponent(cleanEmail)}`;
        const emailService = getEmailService();
        await emailService.sendTemplatedEmail("verificar_email", cleanEmail, {
          nombre: user.name,
          verify_url: verifyUrl,
          expires_in: "7 días",
        });

        await enforceMinDuration(resendStart, 500);
        return NextResponse.json({ ok: true });
      }

      // ── LOGOUT ─────────────────────────────────────────────────────────
      case "logout": {
        const response = NextResponse.json({ ok: true });
        clearSessionCookie(response);
        return response;
      }

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de autenticación";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
