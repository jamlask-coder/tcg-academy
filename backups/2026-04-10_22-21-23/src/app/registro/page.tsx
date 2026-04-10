"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  UserPlus,
  Package,
  Clock,
  ShieldCheck,
  Star,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkRateLimit } from "@/utils/sanitize";

const schema = z
  .object({
    nombre: z.string().min(1, "El nombre es obligatorio").max(100),
    apellidos: z.string().min(1, "Los apellidos son obligatorios").max(100),
    email: z.string().email("Email inválido").max(254),
    telefono: z.string().max(20).optional(),
    password: z.string().min(6, "Mínimo 6 caracteres").max(128),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
    referralCode: z.string().max(20).optional(),
    terminos: z.literal(true, { error: "Debes aceptar los términos" }),
    comunicaciones: z.boolean().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const FEATURES = [
  { icon: Package, text: "+10.000 productos TCG en stock" },
  { icon: Clock, text: "Envío en menos de 24h" },
  { icon: ShieldCheck, text: "Precios exclusivos para profesionales" },
  { icon: Star, text: "Programa de puntos y recompensas" },
];

function PasswordStrength({ password }: { password: string }) {
  const score =
    (password.length >= 6 ? 1 : 0) +
    (password.length >= 10 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);

  if (!password) return null;

  const labels = ["", "Muy débil", "Débil", "Media", "Fuerte", "Muy fuerte"];
  const colors = [
    "",
    "bg-red-500",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-blue-400",
    "bg-green-500",
  ];
  const textColors = [
    "",
    "text-red-500",
    "text-orange-400",
    "text-yellow-500",
    "text-blue-500",
    "text-green-600",
  ];

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i <= score ? colors[score] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className={`mt-1 text-xs font-medium ${textColors[score]}`}>
        {labels[score]}
      </p>
    </div>
  );
}

export default function RegistroPage() {
  const { register: authRegister, user } = useAuth();
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [serverError, setServerError] = useState("");
  const [mounted, setMounted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { terminos: undefined, comunicaciones: false },
  });

  const watchedPassword = watch("password") ?? "";
  const watchedTerminos = watch("terminos");
  const watchedComunicaciones = watch("comunicaciones");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) router.push("/cuenta");
  }, [user, router]);

  const onSubmit = async (data: FormData) => {
    if (!checkRateLimit("registro", 5, 60_000)) {
      setServerError(
        "Demasiados intentos. Espera un minuto antes de volver a intentarlo.",
      );
      return;
    }
    setServerError("");
    const { ok, error } = await authRegister({
      email: data.email,
      password: data.password,
      name: data.nombre,
      lastName: data.apellidos,
      phone: data.telefono ?? "",
      referralCode: data.referralCode?.toUpperCase().trim() || undefined,
      address: {
        nombre: data.nombre,
        apellidos: data.apellidos,
        calle: "",
        numero: "",
        piso: "",
        cp: "",
        ciudad: "",
        provincia: "",
        pais: "ES",
      },
    });
    if (ok) {
      router.push("/cuenta");
    } else {
      setServerError(error ?? "Error al registrarse");
    }
  };

  const inputCls = (hasError: boolean) =>
    `h-11 w-full rounded-xl border-2 px-4 text-sm transition-all focus:outline-none focus:ring-2 ${
      hasError
        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
        : "border-gray-200 focus:border-[#2563eb] focus:ring-[#2563eb]/10"
    }`;

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ───────────────────────────── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex lg:w-[45%]"
        style={{
          background:
            "linear-gradient(135deg, #1e40af 0%, #2563eb 55%, #1d4ed8 100%)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-10 -left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div
            className="absolute top-32 right-8 h-36 w-24 rotate-12 rounded-xl bg-white/5 shadow-2xl"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <div
            className="absolute top-44 right-20 h-36 w-24 rotate-6 rounded-xl bg-white/5 shadow-2xl"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <div
            className="absolute right-10 bottom-32 h-28 w-20 -rotate-6 rounded-xl bg-amber-400/10 shadow-2xl"
            style={{ border: "1px solid rgba(251,191,36,0.15)" }}
          />
        </div>

        <Link href="/" className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-sm">
            <span className="text-xl font-bold text-white">T</span>
          </div>
          <span className="text-2xl font-bold text-white">TCG Academy</span>
        </Link>

        <div className="relative z-10">
          <h1 className="mb-4 text-4xl leading-tight font-bold text-white">
            Únete a la comunidad TCG más grande de España
          </h1>
          <p className="mb-10 text-lg text-blue-200">
            Crea tu cuenta gratis y empieza a disfrutar de ventajas exclusivas.
          </p>
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon size={18} className="text-amber-300" />
                </div>
                <span className="text-base font-medium text-blue-100">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-blue-300/60">
          © 2025 TCG Academy · Todos los derechos reservados
        </p>
      </div>

      {/* ── Right panel ──────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        {/* Mobile logo */}
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb]">
            <span className="font-bold text-white">T</span>
          </div>
          <span className="text-xl font-bold text-[#2563eb]">TCG Academy</span>
        </Link>

        <div
          className="w-full max-w-lg"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Crear cuenta</h2>
            <p className="mt-1 text-gray-500">
              Es gratis y solo tarda un minuto
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Nombre + Apellidos */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Nombre *
                </label>
                <input
                  {...register("nombre")}
                  type="text"
                  placeholder="Tu nombre"
                  maxLength={100}
                  className={inputCls(!!errors.nombre)}
                />
                {errors.nombre && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.nombre.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Apellidos *
                </label>
                <input
                  {...register("apellidos")}
                  type="text"
                  placeholder="Tus apellidos"
                  maxLength={100}
                  className={inputCls(!!errors.apellidos)}
                />
                {errors.apellidos && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.apellidos.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email + Teléfono */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Email *
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="tu@email.com"
                  maxLength={254}
                  className={inputCls(!!errors.email)}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Teléfono
                </label>
                <input
                  {...register("telefono")}
                  type="tel"
                  placeholder="+34 600 000 000"
                  maxLength={20}
                  className={inputCls(false)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Contraseña *
                </label>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={showPwd ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    maxLength={128}
                    className={inputCls(!!errors.password) + " pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    aria-label={
                      showPwd ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrength password={watchedPassword} />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Confirmar contraseña *
                </label>
                <input
                  {...register("confirmPassword")}
                  type={showPwd ? "text" : "password"}
                  placeholder="Repite la contraseña"
                  maxLength={128}
                  className={inputCls(!!errors.confirmPassword)}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {/* Referral code (optional) */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Código de referido <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                {...register("referralCode")}
                type="text"
                placeholder="Ej: ABCD1234"
                maxLength={20}
                className={inputCls(false) + " uppercase placeholder:normal-case"}
              />
              <p className="mt-1 text-xs text-gray-400">
                ¿Te invitó un amigo? Introduce su código para que ambos ganéis puntos
              </p>
            </div>

            {/* Terms */}
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-2.5 select-none">
                <input
                  {...register("terminos")}
                  type="checkbox"
                  className="sr-only"
                />
                <div
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition ${
                    watchedTerminos
                      ? "border-[#2563eb] bg-[#2563eb]"
                      : errors.terminos
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300 bg-white"
                  }`}
                >
                  {watchedTerminos && (
                    <Check size={12} className="text-white" strokeWidth={3} />
                  )}
                </div>
                <span className="text-sm text-gray-600">
                  He leído y acepto los{" "}
                  <Link
                    href="/terminos"
                    target="_blank"
                    className="font-medium text-[#2563eb] hover:underline"
                  >
                    términos y condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link
                    href="/privacidad"
                    target="_blank"
                    className="font-medium text-[#2563eb] hover:underline"
                  >
                    política de privacidad
                  </Link>{" "}
                  *
                </span>
              </label>
              {errors.terminos && (
                <p className="text-xs text-red-500">
                  {errors.terminos.message}
                </p>
              )}

              <label className="flex cursor-pointer items-center gap-2.5 select-none">
                <input
                  {...register("comunicaciones")}
                  type="checkbox"
                  className="sr-only"
                />
                <div
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition ${
                    watchedComunicaciones
                      ? "border-[#2563eb] bg-[#2563eb]"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {watchedComunicaciones && (
                    <Check size={12} className="text-white" strokeWidth={3} />
                  )}
                </div>
                <span className="text-sm text-gray-600">
                  Quiero recibir novedades y ofertas por email
                </span>
              </label>
            </div>

            {serverError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {isSubmitting ? (
                "Creando cuenta..."
              ) : (
                <>
                  <UserPlus size={18} /> Crear cuenta gratis
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#2563eb] hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
