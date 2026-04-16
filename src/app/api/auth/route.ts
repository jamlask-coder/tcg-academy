import { NextRequest, NextResponse } from "next/server";
import { serverRateLimit } from "@/utils/sanitize";

// POST /api/auth — Unified auth endpoint
// Body: { action: "login" | "register" | "reset-password" | "reset-confirm", ...data }
export async function POST(req: NextRequest) {
  try {
    // ── Rate limiting: 5 auth attempts per minute per IP ──
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "unknown";
    const rl = serverRateLimit(`auth:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera un momento." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "login": {
        const { email, password, rememberMe } = body;
        if (!email || !password) {
          return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
        }
        // TODO: In server mode:
        //   1. Fetch user from database by email
        //   2. Verify password hash (bcrypt)
        //   3. Generate JWT token
        //   4. Set httpOnly cookie with token (expiry: 24h or 30d if rememberMe)
        //   5. Return user profile (without password)
        return NextResponse.json({
          ok: true,
          rememberMe: !!rememberMe,
          message: "Auth server-side pendiente. Usando localStorage.",
        });
      }

      case "register": {
        const { nombre, apellidos, email, password, username } = body;
        if (!nombre || !email || !password) {
          return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }
        // TODO: In server mode:
        //   1. Check if email already exists
        //   2. Check if username already taken
        //   3. Hash password with bcrypt
        //   4. Create user in database
        //   5. Send verification email
        //   6. Generate JWT and set cookie
        //   7. Return user profile
        return NextResponse.json({
          ok: true,
          username,
          message: "Registro server-side pendiente. Usando localStorage.",
        });
      }

      case "reset-password": {
        const { email: resetEmail } = body;
        if (!resetEmail) {
          return NextResponse.json({ error: "Email requerido" }, { status: 400 });
        }
        // TODO: In server mode:
        //   1. Look up user by email
        //   2. Generate cryptographic reset token
        //   3. Store token with 1h expiry in database
        //   4. Send reset email with link /restablecer-contrasena?token=X&email=Y
        //   5. Return success (always, even if email not found — prevent enumeration)
        return NextResponse.json({
          ok: true,
          message: "Si el email existe, se enviará un enlace de recuperación.",
        });
      }

      case "reset-confirm": {
        const { email: confirmEmail, token, newPassword } = body;
        if (!confirmEmail || !token || !newPassword) {
          return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }
        // TODO: In server mode:
        //   1. Validate token from database
        //   2. Check expiry
        //   3. Hash new password
        //   4. Update user password
        //   5. Delete token
        //   6. Optionally send "password changed" email
        return NextResponse.json({
          ok: true,
          message: "Contraseña actualizada. Redirigiendo a login.",
        });
      }

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Error de autenticación" }, { status: 500 });
  }
}
