import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { serverRateLimit } from "@/utils/sanitize";
import { getDb } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getClientIp,
} from "@/lib/auth";
import { getEmailService } from "@/lib/email";
import { sanitizeString } from "@/utils/sanitize";
import { authBodySchema, zodMessage } from "@/lib/validations/api";

const isServerMode = () => (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

// POST /api/auth — Unified auth endpoint
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = serverRateLimit(`auth:${ip}`, 5, 60_000);
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

    if (!isServerMode()) {
      // Local mode: return acknowledgment, client handles everything
      return NextResponse.json({ ok: true, mode: "local", message: "Modo local activo." });
    }

    const db = getDb();

    switch (action) {
      // ── LOGIN ──────────────────────────────────────────────────────────
      case "login": {
        const { email, password, rememberMe } = body;
        if (!email || !password) {
          return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
        }

        // Resolve username → email
        let user;
        if (email.includes("@")) {
          user = await db.getUserByEmail(email.toLowerCase().trim());
        } else {
          user = await db.getUserByUsername(email.trim());
        }

        if (!user) {
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
          referralCode: user.referralCode,
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
        const { nombre, apellidos, email, password, username, phone, referralCode, marketingConsent } = body;
        if (!nombre || !email || !password) {
          return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }
        if (password.length < 6) {
          return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
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

        // Hash password with bcrypt
        const passwordHash = await hashPassword(password);

        // Create user
        const newUser = await db.createUser({
          id: crypto.randomUUID(),
          email: cleanEmail,
          username: cleanUsername || undefined,
          passwordHash,
          name: sanitizeString(nombre),
          lastName: sanitizeString(apellidos || ""),
          phone: phone ? sanitizeString(phone) : "",
          role: "cliente",
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

        const response = NextResponse.json({
          ok: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            name: newUser.name,
            lastName: newUser.lastName,
            role: newUser.role,
            referralCode: newUser.referralCode,
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
        const { email: resetEmail } = body;
        if (!resetEmail) {
          return NextResponse.json({ error: "Email requerido" }, { status: 400 });
        }

        const cleanEmail = resetEmail.toLowerCase().trim();
        const user = await db.getUserByEmail(cleanEmail);

        // Always return success to prevent email enumeration
        if (!user) {
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

        return NextResponse.json({ ok: true, message: "Si el email existe, se enviará un enlace." });
      }

      // ── RESET PASSWORD CONFIRM ─────────────────────────────────────────
      case "reset-confirm": {
        const { email: confirmEmail, token, newPassword } = body;
        if (!confirmEmail || !token || !newPassword) {
          return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }
        if (newPassword.length < 6) {
          return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
        }

        const cleanEmail = confirmEmail.toLowerCase().trim();

        // Rate limit brute-force de tokens por email: 5 intentos / 5 min
        const confirmRl = serverRateLimit(`reset-confirm:${cleanEmail}`, 5, 300_000);
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
