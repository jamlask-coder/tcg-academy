"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  UserPlus,
  Check,
  AtSign,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkRateLimit } from "@/utils/sanitize";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const USERNAME_REGEX = /^[a-zA-Z0-9_\.]{3,20}$/;

const schema = z
  .object({
    nombre: z.string().min(1, "El nombre es obligatorio").max(100),
    apellidos: z.string().min(1, "Los apellidos son obligatorios").max(100),
    tratamiento: z.enum(["M", "F", "X"], { error: "Selecciona una opción" }),
    username: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(20, "Máximo 20 caracteres")
      .regex(USERNAME_REGEX, "Solo letras, números, _ y . (sin espacios)"),
    email: z.string().email("Email inválido").max(254),
    telefono: z.string().max(20).optional(),
    password: z.string().min(6, "Mínimo 6 caracteres").max(128),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
    calle: z.string().min(1, "La calle es obligatoria").max(200),
    numero: z.string().min(1, "El número es obligatorio").max(20),
    piso: z.string().max(30).optional(),
    cp: z
      .string()
      .regex(/^\d{5}$/, "Código postal: 5 dígitos"),
    ciudad: z.string().min(1, "La ciudad es obligatoria").max(100),
    provincia: z.string().min(1, "La provincia es obligatoria").max(100),
    pais: z.string().min(2, "País obligatorio").max(2),
    referralCode: z.string().max(20).optional(),
    comoConociste: z.string().max(50).optional(),
    terminos: z.literal(true, { error: "Debes aceptar los términos" }),
    comunicaciones: z.boolean().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

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

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function RegistroPage() {
  const { register: authRegister, user, checkUsernameAvailable } = useAuth();
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [serverError, setServerError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      telefono: "+34 ",
      terminos: undefined,
      comunicaciones: false,
      calle: "",
      numero: "",
      piso: "",
      cp: "",
      ciudad: "",
      provincia: "",
      pais: "ES",
    },
  });

  const watchedPassword = watch("password") ?? "";
  const watchedTerminos = watch("terminos");
  const watchedComunicaciones = watch("comunicaciones");
  const watchedUsername = watch("username") ?? "";

  // Debounced username availability check
  const checkUsername = useCallback((value: string) => {
    if (!value || value.length < 3) { setUsernameStatus("idle"); return; }
    if (!USERNAME_REGEX.test(value)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const available = checkUsernameAvailable(value);
    setUsernameStatus(available ? "available" : "taken");
  }, [checkUsernameAvailable]);

  useEffect(() => {
    const id = setTimeout(() => checkUsername(watchedUsername), 400);
    return () => clearTimeout(id);
  }, [watchedUsername, checkUsername]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) router.push("/cuenta");
  }, [user, router]);

  const onSubmit = async (data: FormData) => {
    if (usernameStatus === "taken") {
      setServerError("Ese nombre de usuario ya está en uso, elige otro.");
      return;
    }
    if (!checkRateLimit("registro", 5, 60_000)) {
      setServerError(
        "Demasiados intentos. Espera un minuto antes de volver a intentarlo.",
      );
      return;
    }
    setServerError("");
    const { ok, error } = await authRegister({
      email: data.email,
      username: data.username,
      password: data.password,
      name: data.nombre,
      lastName: data.apellidos,
      phone: data.telefono ?? "",
      gender: data.tratamiento,
      referralCode: data.referralCode?.toUpperCase().trim() || undefined,
      marketingConsent: data.comunicaciones ?? false,
      address: {
        nombre: data.nombre,
        apellidos: data.apellidos,
        calle: data.calle,
        numero: data.numero,
        piso: data.piso ?? "",
        cp: data.cp,
        ciudad: data.ciudad,
        provincia: data.provincia,
        pais: data.pais,
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
    <div className="flex min-h-screen justify-center bg-gray-50 px-6 py-12">
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

          {/* Google Sign-In — auto-registers as cliente if env var is set */}
          <div className="mb-6">
            <GoogleSignInButton redirectTo="/cuenta" />
          </div>

          {/* Divider (only visible alongside Google button; harmless otherwise) */}
          <div className="mb-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">o regístrate con email</span>
            <div className="h-px flex-1 bg-gray-200" />
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

            {/* Tratamiento */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Tratamiento *
              </label>
              <div className="flex gap-3">
                {([
                  { value: "M", label: "Sr." },
                  { value: "F", label: "Sra." },
                  { value: "X", label: "Prefiero no decirlo" },
                ] as const).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm transition select-none ${
                      watch("tratamiento") === opt.value
                        ? "border-[#2563eb] bg-blue-50 font-semibold text-[#2563eb]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <input
                      {...register("tratamiento")}
                      type="radio"
                      value={opt.value}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              {errors.tratamiento && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.tratamiento.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Nombre de usuario *
              </label>
              <div className="relative">
                <AtSign size={15} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  {...register("username")}
                  type="text"
                  placeholder="tu_usuario"
                  maxLength={20}
                  autoComplete="username"
                  className={
                    inputCls(!!errors.username || usernameStatus === "taken") +
                    " pl-9 pr-9"
                  }
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2">
                  {usernameStatus === "checking" && <Loader2 size={15} className="animate-spin text-gray-400" />}
                  {usernameStatus === "available" && <Check size={15} className="text-green-500" />}
                  {usernameStatus === "taken" && <span className="text-xs font-bold text-red-500">✕</span>}
                </span>
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>
              )}
              {!errors.username && usernameStatus === "taken" && (
                <p className="mt-1 text-xs text-red-500">Este nombre de usuario ya está en uso</p>
              )}
              {!errors.username && usernameStatus === "available" && (
                <p className="mt-1 text-xs text-green-600">¡Disponible!</p>
              )}
              {!errors.username && usernameStatus === "idle" && (
                <p className="mt-1 text-xs text-gray-400">3–20 caracteres: letras, números, _ y .</p>
              )}
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
                  placeholder="+34600000000"
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

            {/* Dirección de envío */}
            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Dirección de envío</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  La guardamos como principal. Podrás añadir más desde tu cuenta.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Calle *
                  </label>
                  <input
                    {...register("calle")}
                    type="text"
                    placeholder="Ej. Av. del Norte"
                    maxLength={200}
                    autoComplete="address-line1"
                    className={inputCls(!!errors.calle)}
                  />
                  {errors.calle && (
                    <p className="mt-1 text-xs text-red-500">{errors.calle.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Número *
                  </label>
                  <input
                    {...register("numero")}
                    type="text"
                    placeholder="40"
                    maxLength={20}
                    className={inputCls(!!errors.numero)}
                  />
                  {errors.numero && (
                    <p className="mt-1 text-xs text-red-500">{errors.numero.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Piso / puerta <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <input
                  {...register("piso")}
                  type="text"
                  placeholder="2ª planta, puerta B"
                  maxLength={30}
                  autoComplete="address-line2"
                  className={inputCls(false)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    CP *
                  </label>
                  <input
                    {...register("cp")}
                    type="text"
                    inputMode="numeric"
                    placeholder="03710"
                    maxLength={5}
                    autoComplete="postal-code"
                    className={inputCls(!!errors.cp)}
                  />
                  {errors.cp && (
                    <p className="mt-1 text-xs text-red-500">{errors.cp.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Ciudad *
                  </label>
                  <input
                    {...register("ciudad")}
                    type="text"
                    placeholder="Calpe"
                    maxLength={100}
                    autoComplete="address-level2"
                    className={inputCls(!!errors.ciudad)}
                  />
                  {errors.ciudad && (
                    <p className="mt-1 text-xs text-red-500">{errors.ciudad.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Provincia *
                  </label>
                  <input
                    {...register("provincia")}
                    type="text"
                    placeholder="Alicante"
                    maxLength={100}
                    autoComplete="address-level1"
                    className={inputCls(!!errors.provincia)}
                  />
                  {errors.provincia && (
                    <p className="mt-1 text-xs text-red-500">{errors.provincia.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    País *
                  </label>
                  <select
                    {...register("pais")}
                    autoComplete="country"
                    className={inputCls(!!errors.pais)}
                  >
                    <option value="ES">España</option>
                    <option value="PT">Portugal</option>
                    <option value="FR">Francia</option>
                    <option value="IT">Italia</option>
                    <option value="DE">Alemania</option>
                    <option value="AD">Andorra</option>
                  </select>
                </div>
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

            {/* ¿Cómo nos conociste? */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                ¿Cómo nos conociste? <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <select
                {...register("comoConociste")}
                className={inputCls(false)}
              >
                <option value="">Seleccionar</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="facebook">Facebook</option>
                <option value="google">Google / Buscadores</option>
                <option value="recomendacion">Recomendación</option>
                <option value="feria">Feria o evento</option>
                <option value="otro">Otro</option>
              </select>
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
  );
}
