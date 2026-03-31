"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  FileText,
  AlertCircle,
} from "lucide-react";
import { checkRateLimit } from "@/utils/sanitize";

// ─── Storage ──────────────────────────────────────────────────────────────────
const SOLICITUDES_KEY = "tcgacademy_solicitudes";

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  // Datos empresa
  razonSocial: z.string().min(2, "Mínimo 2 caracteres").max(200),
  cif: z
    .string()
    .regex(/^[A-HJ-NP-SUVW]\d{7}[A-J0-9]$/i, "CIF no válido (ej: B12345678)"),
  cnae: z.string().regex(/^\d{4}$/, "El CNAE debe tener exactamente 4 dígitos"),
  fechaConstitucion: z.string().optional(),
  tipoEmpresa: z.enum(["SL", "SA", "autonomo", "cooperativa", "otro"]),
  // Datos fiscales
  calle: z.string().min(2, "Introduce la dirección").max(200),
  numero: z.string().min(1, "Introduce el número").max(10),
  piso: z.string().max(30).optional(),
  cp: z.string().regex(/^\d{5}$/, "El CP debe tener 5 dígitos"),
  ciudad: z.string().min(2, "Introduce la ciudad").max(100),
  provincia: z.string().min(2, "Introduce la provincia").max(100),
  pais: z.string().min(2).max(100),
  recargoEquivalencia: z.enum(["si", "no"]),
  nifRepresentante: z
    .string()
    .min(9, "NIF no válido")
    .max(12, "NIF no válido"),
  nombreRepresentante: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(200),
  // Datos contacto
  personaContacto: z.string().min(2, "Mínimo 2 caracteres").max(200),
  emailContacto: z.string().email("Email no válido"),
  emailFacturacion: z.string().email("Email de facturación no válido"),
  telefono: z
    .string()
    .regex(/^[+]?[\d\s\-()]{9,15}$/, "Teléfono no válido"),
  web: z.string().max(300).optional(),
  // Negocio
  tiendaFisica: z.enum(["si", "no"]),
  direccionTiendaFisica: z.string().max(300).optional(),
  ventaOnline: z.enum(["si", "no"]),
  urlTiendaOnline: z.string().max(300).optional(),
  juegosTCG: z.array(z.string()).min(1, "Selecciona al menos un juego"),
  volumenMensual: z.enum([
    "<500",
    "500-2000",
    "2000-5000",
    "5000-10000",
    ">10000",
  ]),
  comoConociste: z.enum([
    "google",
    "redes",
    "recomendacion",
    "feria",
    "otro",
  ]),
  // Términos
  aceptaTerminos: z
    .boolean()
    .refine((v) => v === true, "Debes aceptar los términos y condiciones"),
  aceptaPrivacidad: z
    .boolean()
    .refine((v) => v === true, "Debes aceptar la política de privacidad"),
  aceptaComunicaciones: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

const TCG_GAMES = [
  "Magic: The Gathering",
  "Pokémon TCG",
  "One Piece TCG",
  "Riftbound",
  "Yu-Gi-Oh!",
  "Disney Lorcana",
  "Dragon Ball SCG",
  "Naruto Mythos",
  "Topps",
  "Todos los juegos",
];

// ─── Field helpers ────────────────────────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
      <AlertCircle size={11} />
      {message}
    </p>
  );
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1 block text-sm font-semibold text-gray-700">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function inputCls(hasError: boolean) {
  return `h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none ${
    hasError
      ? "border-red-300 focus:border-red-400"
      : "border-gray-200 focus:border-[#1a3a5c]"
  }`;
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = [
  "Solicitud",
  "Verificación",
  "Activación",
  "Compra con precios B2B",
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function B2BPage() {
  const [submitted, setSubmitted] = useState(false);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      pais: "España",
      recargoEquivalencia: "no",
      tiendaFisica: "no",
      ventaOnline: "no",
      juegosTCG: [],
      aceptaTerminos: false,
      aceptaPrivacidad: false,
      aceptaComunicaciones: false,
    },
  });

  const tiendaFisica = watch("tiendaFisica");
  const ventaOnline = watch("ventaOnline");

  const toggleGame = (game: string) => {
    let next: string[];
    if (game === "Todos los juegos") {
      next = selectedGames.includes(game) ? [] : ["Todos los juegos"];
    } else {
      const without = selectedGames.filter((g) => g !== "Todos los juegos");
      next = without.includes(game)
        ? without.filter((g) => g !== game)
        : [...without, game];
    }
    setSelectedGames(next);
    void setValue("juegosTCG", next);
    void trigger("juegosTCG");
  };

  const onSubmit = async (data: FormData) => {
    if (!checkRateLimit("b2b-form", 3, 60_000)) {
      alert("Demasiados intentos. Espera un momento antes de enviar de nuevo.");
      return;
    }
    await new Promise((r) => setTimeout(r, 800));

    try {
      const saved = JSON.parse(
        localStorage.getItem(SOLICITUDES_KEY) ?? "[]",
      ) as unknown[];
      const newSolicitud = {
        id:
          Date.now().toString(36) +
          Math.random().toString(36).slice(2),
        tipo: "b2b",
        estado: "nueva",
        fechaSolicitud: new Date().toISOString(),
        datos: data,
      };
      saved.push(newSolicitud);
      localStorage.setItem(SOLICITUDES_KEY, JSON.stringify(saved));
    } catch {
      // localStorage may be unavailable in some environments
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-20">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            ¡Solicitud enviada!
          </h1>
          <p className="mb-6 text-gray-500">
            Hemos recibido tu solicitud de cuenta B2B. Nuestro equipo revisará
            tu documentación y te contactará en{" "}
            <strong>24-48 horas hábiles</strong>.
          </p>
          <p className="mb-8 text-sm text-gray-400">
            Mientras tanto, puedes enviarnos tu documentación (036/037, CIF y
            DNI del representante) a{" "}
            <a
              href="mailto:b2b@tcgacademy.es"
              className="font-semibold text-[#1a3a5c] underline"
            >
              b2b@tcgacademy.es
            </a>
          </p>
          <Link
            href="/mayoristas"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a3a5c] px-6 py-3 font-semibold text-white transition hover:bg-[#15304d]"
          >
            Volver a Mayoristas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1a3a5c] py-16 text-white">
        <div className="mx-auto max-w-[1180px] px-6">
          <Link
            href="/mayoristas"
            className="mb-6 inline-flex items-center gap-1 text-sm text-blue-300 hover:text-white"
          >
            ← Mayoristas
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400">
              <Building2 size={22} className="text-[#0f172a]" />
            </div>
            <h1 className="text-3xl font-bold md:text-4xl">
              Solicitud de cuenta B2B
            </h1>
          </div>
          <p className="max-w-xl text-blue-200">
            Rellena el formulario y activa tu acceso a precios exclusivos para
            profesionales. Proceso de verificación en 24-48h.
          </p>
        </div>
      </div>

      {/* Process steps */}
      <div className="border-b border-gray-200 bg-gray-50 py-6">
        <div className="mx-auto max-w-[1180px] px-6">
          <div className="flex items-center gap-0 overflow-x-auto">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      i === 0
                        ? "bg-[#1a3a5c] text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-sm ${
                      i === 0
                        ? "font-bold text-[#1a3a5c]"
                        : "text-gray-400"
                    }`}
                  >
                    {step}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight
                    size={16}
                    className="mx-3 flex-shrink-0 text-gray-300"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-[1180px] px-6 py-12">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            {/* Main form */}
            <div className="space-y-6">
              {/* SECCIÓN 1: Datos empresa */}
              <SectionCard title="Datos de la empresa">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label required>Razón social</Label>
                    <input
                      {...register("razonSocial")}
                      placeholder="Distribuciones Ejemplo, S.L."
                      className={inputCls(!!errors.razonSocial)}
                    />
                    <FieldError message={errors.razonSocial?.message} />
                  </div>
                  <div>
                    <Label required>CIF</Label>
                    <input
                      {...register("cif")}
                      placeholder="B12345678"
                      className={inputCls(!!errors.cif)}
                      maxLength={9}
                    />
                    <FieldError message={errors.cif?.message} />
                  </div>
                  <div>
                    <Label required>CNAE</Label>
                    <input
                      {...register("cnae")}
                      placeholder="4764"
                      maxLength={4}
                      className={inputCls(!!errors.cnae)}
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      4 dígitos — Código de actividad económica
                    </p>
                    <FieldError message={errors.cnae?.message} />
                  </div>
                  <div>
                    <Label>Fecha de constitución</Label>
                    <input
                      type="date"
                      {...register("fechaConstitucion")}
                      className={inputCls(false)}
                    />
                  </div>
                  <div>
                    <Label required>Tipo de empresa</Label>
                    <select
                      {...register("tipoEmpresa")}
                      className={inputCls(!!errors.tipoEmpresa)}
                    >
                      <option value="">Seleccionar</option>
                      <option value="SL">Sociedad Limitada (SL)</option>
                      <option value="SA">Sociedad Anónima (SA)</option>
                      <option value="autonomo">Autónomo</option>
                      <option value="cooperativa">Cooperativa</option>
                      <option value="otro">Otro</option>
                    </select>
                    <FieldError message={errors.tipoEmpresa?.message} />
                  </div>
                </div>
              </SectionCard>

              {/* SECCIÓN 2: Datos fiscales */}
              <SectionCard title="Datos fiscales y domicilio">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label required>Calle / Avenida</Label>
                    <input
                      {...register("calle")}
                      placeholder="Calle Mayor"
                      className={inputCls(!!errors.calle)}
                    />
                    <FieldError message={errors.calle?.message} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label required>Número</Label>
                      <input
                        {...register("numero")}
                        placeholder="15"
                        className={inputCls(!!errors.numero)}
                      />
                      <FieldError message={errors.numero?.message} />
                    </div>
                    <div>
                      <Label>Piso / Puerta</Label>
                      <input
                        {...register("piso")}
                        placeholder="2A"
                        className={inputCls(false)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label required>Código Postal</Label>
                    <input
                      {...register("cp")}
                      placeholder="28001"
                      maxLength={5}
                      className={inputCls(!!errors.cp)}
                    />
                    <FieldError message={errors.cp?.message} />
                  </div>
                  <div>
                    <Label required>Ciudad</Label>
                    <input
                      {...register("ciudad")}
                      placeholder="Madrid"
                      className={inputCls(!!errors.ciudad)}
                    />
                    <FieldError message={errors.ciudad?.message} />
                  </div>
                  <div>
                    <Label required>Provincia</Label>
                    <input
                      {...register("provincia")}
                      placeholder="Madrid"
                      className={inputCls(!!errors.provincia)}
                    />
                    <FieldError message={errors.provincia?.message} />
                  </div>
                  <div>
                    <Label required>País</Label>
                    <input
                      {...register("pais")}
                      placeholder="España"
                      className={inputCls(false)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label required>
                      ¿Estás en régimen de recargo de equivalencia?
                    </Label>
                    <div className="mt-2 flex gap-4">
                      {(["si", "no"] as const).map((v) => (
                        <label
                          key={v}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <input
                            type="radio"
                            value={v}
                            {...register("recargoEquivalencia")}
                            className="accent-[#1a3a5c]"
                          />
                          <span className="text-sm capitalize text-gray-700">
                            {v === "si" ? "Sí" : "No"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label required>NIF del representante legal</Label>
                    <input
                      {...register("nifRepresentante")}
                      placeholder="12345678A"
                      className={inputCls(!!errors.nifRepresentante)}
                    />
                    <FieldError message={errors.nifRepresentante?.message} />
                  </div>
                  <div>
                    <Label required>Nombre del representante legal</Label>
                    <input
                      {...register("nombreRepresentante")}
                      placeholder="Juan García López"
                      className={inputCls(!!errors.nombreRepresentante)}
                    />
                    <FieldError message={errors.nombreRepresentante?.message} />
                  </div>
                </div>
              </SectionCard>

              {/* SECCIÓN 3: Datos de contacto */}
              <SectionCard title="Datos de contacto">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label required>Persona de contacto</Label>
                    <input
                      {...register("personaContacto")}
                      placeholder="Nombre y apellidos"
                      className={inputCls(!!errors.personaContacto)}
                    />
                    <FieldError message={errors.personaContacto?.message} />
                  </div>
                  <div>
                    <Label required>Teléfono</Label>
                    <input
                      {...register("telefono")}
                      type="tel"
                      placeholder="+34 600 000 000"
                      className={inputCls(!!errors.telefono)}
                    />
                    <FieldError message={errors.telefono?.message} />
                  </div>
                  <div>
                    <Label required>Email de contacto</Label>
                    <input
                      {...register("emailContacto")}
                      type="email"
                      placeholder="contacto@empresa.com"
                      className={inputCls(!!errors.emailContacto)}
                    />
                    <FieldError message={errors.emailContacto?.message} />
                  </div>
                  <div>
                    <Label required>Email de facturación</Label>
                    <input
                      {...register("emailFacturacion")}
                      type="email"
                      placeholder="facturas@empresa.com"
                      className={inputCls(!!errors.emailFacturacion)}
                    />
                    <FieldError message={errors.emailFacturacion?.message} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Web de la empresa</Label>
                    <input
                      {...register("web")}
                      type="url"
                      placeholder="https://www.empresa.com"
                      className={inputCls(false)}
                    />
                  </div>
                </div>
              </SectionCard>

              {/* SECCIÓN 4: Documentación */}
              <SectionCard title="Documentación">
                <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  <strong>Nota:</strong> Los documentos serán verificados por
                  nuestro equipo antes de activar la cuenta. Puedes enviarlos
                  por email a{" "}
                  <a
                    href="mailto:b2b@tcgacademy.es"
                    className="font-semibold underline"
                  >
                    b2b@tcgacademy.es
                  </a>{" "}
                  indicando tu CIF.
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      label: "Modelo 036 / 037",
                      hint: "PDF o imagen del modelo de declaración censal",
                    },
                    {
                      label: "CIF de la empresa",
                      hint: "Copia del CIF expedido por la AEAT",
                    },
                    {
                      label: "DNI del representante",
                      hint: "Ambas caras del DNI/NIE del representante legal",
                    },
                  ].map(({ label, hint }) => (
                    <div key={label}>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">
                        <FileText
                          size={13}
                          className="mr-1 inline text-gray-400"
                        />
                        {label}
                      </label>
                      <div className="flex h-11 w-full cursor-not-allowed items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 text-xs text-gray-400">
                        Enviar por email ↗
                      </div>
                      <p className="mt-1 text-[10px] text-gray-400">{hint}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* SECCIÓN 5: Sobre tu negocio */}
              <SectionCard title="Sobre tu negocio">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label required>¿Tienes tienda física?</Label>
                    <div className="mt-2 flex gap-4">
                      {(["si", "no"] as const).map((v) => (
                        <label
                          key={v}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <input
                            type="radio"
                            value={v}
                            {...register("tiendaFisica")}
                            className="accent-[#1a3a5c]"
                          />
                          <span className="text-sm text-gray-700">
                            {v === "si" ? "Sí" : "No"}
                          </span>
                        </label>
                      ))}
                    </div>
                    {tiendaFisica === "si" && (
                      <div className="mt-3">
                        <input
                          {...register("direccionTiendaFisica")}
                          placeholder="Dirección de la tienda física"
                          className={inputCls(false)}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label required>¿Vendes online?</Label>
                    <div className="mt-2 flex gap-4">
                      {(["si", "no"] as const).map((v) => (
                        <label
                          key={v}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <input
                            type="radio"
                            value={v}
                            {...register("ventaOnline")}
                            className="accent-[#1a3a5c]"
                          />
                          <span className="text-sm text-gray-700">
                            {v === "si" ? "Sí" : "No"}
                          </span>
                        </label>
                      ))}
                    </div>
                    {ventaOnline === "si" && (
                      <div className="mt-3">
                        <input
                          {...register("urlTiendaOnline")}
                          type="url"
                          placeholder="https://mitienda.com"
                          className={inputCls(false)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Juegos TCG */}
                  <div className="sm:col-span-2">
                    <Label required>
                      ¿Qué juegos TCG te interesan más?
                    </Label>
                    {errors.juegosTCG && (
                      <FieldError message={errors.juegosTCG.message} />
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {TCG_GAMES.map((game) => {
                        const selected = selectedGames.includes(game);
                        return (
                          <button
                            key={game}
                            type="button"
                            onClick={() => toggleGame(game)}
                            className={`rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition ${
                              selected
                                ? "border-[#1a3a5c] bg-[#1a3a5c] text-white"
                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {game}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label required>Volumen estimado mensual</Label>
                    <select
                      {...register("volumenMensual")}
                      className={inputCls(!!errors.volumenMensual)}
                    >
                      <option value="">Seleccionar</option>
                      <option value="<500">Menos de 500 €/mes</option>
                      <option value="500-2000">500 — 2.000 €/mes</option>
                      <option value="2000-5000">2.000 — 5.000 €/mes</option>
                      <option value="5000-10000">5.000 — 10.000 €/mes</option>
                      <option value=">10000">Más de 10.000 €/mes</option>
                    </select>
                    <FieldError message={errors.volumenMensual?.message} />
                  </div>
                  <div>
                    <Label required>¿Cómo nos has conocido?</Label>
                    <select
                      {...register("comoConociste")}
                      className={inputCls(!!errors.comoConociste)}
                    >
                      <option value="">Seleccionar</option>
                      <option value="google">Google / Buscadores</option>
                      <option value="redes">Redes sociales</option>
                      <option value="recomendacion">Recomendación</option>
                      <option value="feria">Feria o evento</option>
                      <option value="otro">Otro</option>
                    </select>
                    <FieldError message={errors.comoConociste?.message} />
                  </div>
                </div>
              </SectionCard>

              {/* SECCIÓN 6: Términos */}
              <SectionCard title="Términos y condiciones">
                <div className="space-y-4">
                  {[
                    {
                      field: "aceptaTerminos" as const,
                      label:
                        "He leído y acepto los términos y condiciones de venta B2B",
                      required: true,
                    },
                    {
                      field: "aceptaPrivacidad" as const,
                      label: "Acepto la política de privacidad",
                      required: true,
                    },
                    {
                      field: "aceptaComunicaciones" as const,
                      label:
                        "Deseo recibir comunicaciones comerciales y novedades",
                      required: false,
                    },
                  ].map(({ field, label, required }) => (
                    <label
                      key={field}
                      className="flex cursor-pointer items-start gap-3"
                    >
                      <input
                        type="checkbox"
                        {...register(field)}
                        className="mt-0.5 h-4 w-4 rounded accent-[#1a3a5c]"
                      />
                      <span className="text-sm text-gray-700">
                        {label}
                        {required && (
                          <span className="ml-0.5 text-red-500">*</span>
                        )}
                      </span>
                    </label>
                  ))}
                  {errors.aceptaTerminos && (
                    <FieldError message={errors.aceptaTerminos.message} />
                  )}
                  {errors.aceptaPrivacidad && (
                    <FieldError message={errors.aceptaPrivacidad.message} />
                  )}
                </div>
              </SectionCard>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-[#1a3a5c] py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#15304d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Enviando solicitud..."
                  : "Enviar solicitud B2B →"}
              </button>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="sticky top-6 space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-[#0f172a] p-5 text-white">
                  <h3 className="mb-4 font-bold">¿Por qué elegirnos?</h3>
                  <ul className="space-y-3">
                    {[
                      "Activación en 24-48h",
                      "Descuentos hasta el 30%",
                      "+10.000 referencias",
                      "Gestor de cuenta dedicado",
                      "Envío prioritario en 24h",
                      "Sin pedido mínimo",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle2 size={14} className="flex-shrink-0 text-green-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="mb-2 font-bold text-gray-900">¿Tienes dudas?</h3>
                  <p className="mb-4 text-sm text-gray-500">
                    Habla directamente con nuestro equipo B2B.
                  </p>
                  <a
                    href="mailto:b2b@tcgacademy.es"
                    className="block w-full rounded-xl bg-gray-100 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                  >
                    b2b@tcgacademy.es
                  </a>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
