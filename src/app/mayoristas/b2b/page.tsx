"use client";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  FileText,
  AlertCircle,
  Upload,
  Trash2,
} from "lucide-react";
import { checkRateLimit } from "@/utils/sanitize";
import { SITE_CONFIG } from "@/config/siteConfig";

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
  nifRepresentante: z.string().min(9, "NIF no válido").max(12, "NIF no válido"),
  nombreRepresentante: z.string().min(2, "Mínimo 2 caracteres").max(200),
  // Datos contacto
  personaContacto: z.string().min(2, "Mínimo 2 caracteres").max(200),
  emailContacto: z.string().email("Email no válido"),
  emailFacturacion: z.string().email("Email de facturación no válido"),
  telefono: z.string().regex(/^[+]?[\d\s\-()]{9,15}$/, "Teléfono no válido"),
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
  comoConociste: z.enum(["google", "redes", "recomendacion", "feria", "otro"]),
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
  "Pokémon",
  "Magic: The Gathering",
  "One Piece",
  "Riftbound",
  "Yu-Gi-Oh!",
  "Disney Lorcana",
  "Dragon Ball",
  "Naruto",
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
      : "border-gray-200 focus:border-[#2563eb]"
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function B2BPage() {
  const [submitted, setSubmitted] = useState(false);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [docs, setDocs] = useState<Record<string, File | null>>({
    "modelo036": null,
    "cif": null,
    "dni": null,
  });
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  const handleFileDrop = useCallback((key: string, file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setDocErrors((prev) => ({ ...prev, [key]: "El archivo supera los 5 MB" }));
      return;
    }
    setDocErrors((prev) => ({ ...prev, [key]: "" }));
    setDocs((prev) => ({ ...prev, [key]: file }));
  }, [MAX_FILE_SIZE]);

  const removeDoc = useCallback((key: string) => {
    setDocs((prev) => ({ ...prev, [key]: null }));
    setDocErrors((prev) => ({ ...prev, [key]: "" }));
  }, []);

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
      // Convert uploaded docs to base64 for localStorage persistence
      const docData: Record<string, { name: string; type: string; data: string } | null> = {};
      for (const [key, file] of Object.entries(docs)) {
        if (file) {
          const buffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ""),
          );
          docData[key] = { name: file.name, type: file.type, data: `data:${file.type};base64,${base64}` };
        } else {
          docData[key] = null;
        }
      }

      const saved = JSON.parse(
        localStorage.getItem(SOLICITUDES_KEY) ?? "[]",
      ) as unknown[];
      const newSolicitud = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        tipo: "b2b",
        estado: "nueva",
        fechaSolicitud: new Date().toISOString(),
        datos: { ...data, documentos: docData },
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
            Documentación enviada correctamente
          </h1>
          <p className="mb-3 text-gray-500">
            Hemos recibido tu solicitud y toda la documentación adjunta.
            Nuestro equipo la revisará y te contestaremos lo más pronto posible.
          </p>
          <p className="mb-8 text-sm font-medium text-[#2563eb]">
            Le notificaremos por correo electrónico.
          </p>
          <Link
            href="/mayoristas"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            Volver a Profesionales
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0f172a] to-[#2563eb] py-8 text-white">
        <div className="mx-auto max-w-[1400px] px-6">
          <Link
            href="/mayoristas"
            className="mb-3 inline-flex items-center gap-1 text-sm text-blue-300 hover:text-white"
          >
            ← Profesionales
          </Link>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400">
              <Building2 size={18} className="text-[#0f172a]" />
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">
              Solicitud de cuenta B2B
            </h1>
          </div>
          <p className="max-w-xl text-sm text-blue-200">
            Rellena el formulario y activa tu acceso a precios exclusivos para
            profesionales.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-[1400px] px-6 py-12">
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
                  <div>
                    <Label>Web de la empresa</Label>
                    <input
                      {...register("web")}
                      type="url"
                      placeholder="https://www.empresa.com"
                      className={inputCls(false)}
                    />
                  </div>

                  {/* Sobre tu negocio (fusionado) */}
                  <div className="sm:col-span-2 mt-2 border-t border-gray-100 pt-4">
                    <p className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">Sobre tu negocio</p>
                  </div>
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
                            className="accent-[#2563eb]"
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
                            className="accent-[#2563eb]"
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
                    <Label required>¿Qué juegos TCG te interesan más?</Label>
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
                                ? "border-[#2563eb] bg-[#2563eb] text-white"
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
                    <Label required>Volumen estimado mensual de compras en TCG Academy</Label>
                    <select
                      {...register("volumenMensual")}
                      className={inputCls(!!errors.volumenMensual)}
                    >
                      <option value="">Seleccionar</option>
                      <option value="<500">Menos de 500 €/mes</option>
                      <option value="500-1000">500 — 1.000 €/mes</option>
                      <option value="1000-2500">1.000 — 2.500 €/mes</option>
                      <option value="2500-5000">2.500 — 5.000 €/mes</option>
                      <option value="5000-10000">5.000 — 10.000 €/mes</option>
                      <option value="10000-25000">10.000 — 25.000 €/mes</option>
                      <option value="25000-50000">25.000 — 50.000 €/mes</option>
                      <option value=">50000">Más de 50.000 €/mes</option>
                    </select>
                    <FieldError message={errors.volumenMensual?.message} />
                  </div>
                  <div>
                    <Label required>¿Cómo nos conociste?</Label>
                    <select
                      {...register("comoConociste")}
                      className={inputCls(!!errors.comoConociste)}
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
                    <FieldError message={errors.comoConociste?.message} />
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
                            className="accent-[#2563eb]"
                          />
                          <span className="text-sm text-gray-700 capitalize">
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
                </div>
              </SectionCard>

              {/* SECCIÓN 4: Documentación */}
              <SectionCard title="Documentación">
                <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  <strong>Nota:</strong> Los documentos serán verificados por
                  nuestro equipo antes de activar la cuenta. Máximo 5 MB por
                  archivo. Formatos aceptados: PDF, JPG, PNG.
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {([
                    { key: "modelo036", label: "Modelo 036 / 037", hint: "PDF o imagen del modelo de declaración censal", required: true },
                    { key: "cif", label: "CIF de la empresa (obligatorio en su caso)", hint: "Copia del CIF expedido por la AEAT", required: false },
                    { key: "dni", label: "DNI del representante o titular", hint: "Ambas caras del DNI/NIE del representante legal o titular", required: true },
                  ] as const).map(({ key, label, hint, required }) => (
                    <div key={key}>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">
                        <FileText size={13} className="mr-1 inline text-gray-400" />
                        {label}
                        {required && <span className="ml-0.5 text-red-500">*</span>}
                      </label>
                      {docs[key] ? (
                        <div className="flex items-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-3 py-2.5">
                          <FileText size={14} className="flex-shrink-0 text-green-600" />
                          <span className="flex-1 truncate text-xs font-medium text-green-800">
                            {docs[key]!.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDoc(key)}
                            className="flex-shrink-0 text-green-500 transition hover:text-red-500"
                            aria-label={`Eliminar ${label}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-[#2563eb]", "bg-blue-50"); }}
                          onDragLeave={(e) => { e.currentTarget.classList.remove("border-[#2563eb]", "bg-blue-50"); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove("border-[#2563eb]", "bg-blue-50");
                            const file = e.dataTransfer.files[0];
                            if (file) handleFileDrop(key, file);
                          }}
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = ".pdf,.jpg,.jpeg,.png";
                            input.onchange = () => {
                              const file = input.files?.[0];
                              if (file) handleFileDrop(key, file);
                            };
                            input.click();
                          }}
                          className="flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-[#2563eb] hover:bg-blue-50"
                        >
                          <Upload size={16} className="text-gray-400" />
                          <span className="text-[11px] text-gray-400">
                            Arrastra o haz clic
                          </span>
                        </div>
                      )}
                      {docErrors[key] && (
                        <p className="mt-1 text-[11px] font-medium text-red-500">{docErrors[key]}</p>
                      )}
                      <p className="mt-1 text-[10px] text-gray-400">{hint}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* SECCIÓN 5: Términos */}
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
                        className="mt-0.5 h-4 w-4 rounded accent-[#2563eb]"
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
                className="w-full rounded-2xl bg-[#2563eb] py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
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
                      "Activación en máximo 48 horas",
                      "Descuentos especiales",
                      "Envío prioritario en 24h",
                      "Sin pedido mínimo",
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-sm text-slate-300"
                      >
                        <CheckCircle2
                          size={14}
                          className="flex-shrink-0 text-green-400"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="mb-2 font-bold text-gray-900">
                    ¿Tienes dudas?
                  </h3>
                  <p className="mb-4 text-sm text-gray-500">
                    Habla directamente con nosotros.
                  </p>
                  <div className="space-y-2">
                    <a
                      href="https://wa.me/34648635712"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1ebe5b]"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </a>
                    <a
                      href="tel:+34648635712"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
                    >
                      648 635 712
                    </a>
                    <Link
                      href="/contacto"
                      className="block w-full rounded-xl border border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Formulario de contacto
                    </Link>
                    <a
                      href={`mailto:${SITE_CONFIG.email}`}
                      className="block w-full rounded-xl bg-gray-100 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                    >
                      {SITE_CONFIG.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
