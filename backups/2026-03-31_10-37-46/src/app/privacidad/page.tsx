import Link from "next/link";
import { SITE_CONFIG } from "@/config/siteConfig";

export const metadata = {
  title: "Política de privacidad | TCG Academy",
  description:
    "Información sobre el tratamiento de datos personales en TCG Academy conforme al RGPD.",
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#1a3a5c] hover:underline"
        >
          ← Volver al inicio
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 md:p-12">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Política de privacidad
          </h1>
          <p className="mb-10 text-sm text-gray-400">
            Última actualización: enero de 2025
          </p>

          <Section title="1. Responsable del tratamiento">
            <p>
              <strong>TCG Academy S.L.</strong> (CIF: {SITE_CONFIG.cif}) es el
              responsable del tratamiento de sus datos personales. Puede
              contactar con nosotros a través del correo electrónico{" "}
              <a
                href={`mailto:${SITE_CONFIG.email}`}
                className="text-[#1a3a5c] hover:underline"
              >
                {SITE_CONFIG.email}
              </a>
              .
            </p>
          </Section>

          <Section title="2. Datos que recopilamos">
            <p>Recopilamos los siguientes datos personales:</p>
            <ul>
              <li>
                <strong>Datos de registro:</strong> nombre, apellidos, correo
                electrónico y, opcionalmente, teléfono.
              </li>
              <li>
                <strong>Datos de dirección:</strong> dirección de envío y
                facturación para procesar pedidos.
              </li>
              <li>
                <strong>Datos de empresa</strong> (solo usuarios profesionales):
                CIF/NIF, razón social y datos de contacto fiscal.
              </li>
              <li>
                <strong>Datos de navegación:</strong> dirección IP, tipo de
                navegador y páginas visitadas, recopilados mediante cookies
                técnicas.
              </li>
            </ul>
          </Section>

          <Section title="3. Finalidades y base jurídica del tratamiento">
            <Row label="Finalidad" value="Base jurídica" header />
            <Row
              label="Gestión del registro y acceso a la cuenta"
              value="Ejecución de contrato (art. 6.1.b RGPD)"
            />
            <Row
              label="Tramitación de pedidos y envíos"
              value="Ejecución de contrato (art. 6.1.b RGPD)"
            />
            <Row
              label="Emisión de facturas y cumplimiento fiscal"
              value="Obligación legal (art. 6.1.c RGPD)"
            />
            <Row
              label="Envío de novedades y ofertas por email"
              value="Consentimiento del usuario (art. 6.1.a RGPD)"
            />
            <Row
              label="Mejora del servicio y seguridad"
              value="Interés legítimo (art. 6.1.f RGPD)"
            />
          </Section>

          <Section title="4. Conservación de los datos">
            <p>
              Conservamos sus datos durante el tiempo necesario para cumplir la
              finalidad para la que fueron recabados:
            </p>
            <ul>
              <li>
                <strong>Cuenta de usuario activa:</strong> mientras mantenga su
                cuenta abierta.
              </li>
              <li>
                <strong>Datos de pedidos y facturas:</strong> 5 años, conforme a
                la legislación tributaria española.
              </li>
              <li>
                <strong>Comunicaciones comerciales:</strong> hasta que retire su
                consentimiento.
              </li>
            </ul>
          </Section>

          <Section title="5. Destinatarios de los datos">
            <p>
              Sus datos no se ceden a terceros salvo obligación legal o cuando
              sea necesario para la prestación del servicio:
            </p>
            <ul>
              <li>
                <strong>Transportistas</strong> ({SITE_CONFIG.carrier}): nombre,
                apellidos y dirección de entrega para la gestión del envío.
              </li>
              <li>
                <strong>Pasarela de pago:</strong> datos de pago procesados de
                forma segura. TCG Academy no almacena datos de tarjetas.
              </li>
              <li>
                <strong>Gestoría / asesoría fiscal:</strong> datos de
                facturación cuando sea necesario para el cumplimiento tributario.
              </li>
            </ul>
            <p>
              No transferimos datos fuera del Espacio Económico Europeo salvo
              que existan garantías adecuadas conforme al RGPD.
            </p>
          </Section>

          <Section title="6. Sus derechos">
            <p>
              Puede ejercer en cualquier momento los siguientes derechos
              escribiendo a{" "}
              <a
                href={`mailto:${SITE_CONFIG.email}`}
                className="text-[#1a3a5c] hover:underline"
              >
                {SITE_CONFIG.email}
              </a>{" "}
              con una copia de su documento de identidad:
            </p>
            <ul>
              <li>
                <strong>Acceso:</strong> conocer qué datos tratamos sobre usted.
              </li>
              <li>
                <strong>Rectificación:</strong> corregir datos inexactos o
                incompletos.
              </li>
              <li>
                <strong>Supresión:</strong> solicitar la eliminación de sus
                datos cuando ya no sean necesarios.
              </li>
              <li>
                <strong>Oposición:</strong> oponerse al tratamiento basado en
                interés legítimo o con fines de marketing directo.
              </li>
              <li>
                <strong>Portabilidad:</strong> recibir sus datos en formato
                estructurado y de uso común.
              </li>
              <li>
                <strong>Limitación:</strong> solicitar la restricción del
                tratamiento en determinadas circunstancias.
              </li>
            </ul>
            <p>
              Si considera que el tratamiento de sus datos vulnera la normativa,
              puede presentar una reclamación ante la{" "}
              <span className="font-medium">
                Agencia Española de Protección de Datos (AEPD)
              </span>{" "}
              en{" "}
              <span className="text-[#1a3a5c]">www.aepd.es</span>.
            </p>
          </Section>

          <Section title="7. Cookies">
            <p>
              Utilizamos exclusivamente cookies técnicas necesarias para el
              funcionamiento del sitio (sesión, carrito, preferencias de idioma).
              No utilizamos cookies de análisis ni publicidad de terceros sin su
              consentimiento previo.
            </p>
          </Section>

          <Section title="8. Seguridad">
            <p>
              Aplicamos medidas técnicas y organizativas apropiadas para proteger
              sus datos contra accesos no autorizados, pérdida o alteración.
              Las contraseñas se almacenan mediante hash criptográfico (SHA-256
              con sal) y nunca en texto plano.
            </p>
          </Section>

          <Section title="9. Modificaciones de esta política">
            <p>
              Podemos actualizar esta política para reflejar cambios en nuestra
              práctica o en la legislación aplicable. Le notificaremos cualquier
              cambio sustancial por correo electrónico o mediante un aviso
              visible en el sitio web.
            </p>
          </Section>

          <div className="mt-10 border-t border-gray-100 pt-6 text-sm text-gray-400">
            ¿Tienes preguntas sobre privacidad?{" "}
            <Link href="/contacto" className="text-[#1a3a5c] hover:underline">
              Contacta con nosotros
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-bold text-gray-800">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-gray-600 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  header = false,
}: {
  label: string;
  value: string;
  header?: boolean;
}) {
  const base = "grid grid-cols-2 gap-4 py-2 text-sm";
  if (header) {
    return (
      <div className={`${base} border-b border-gray-200 font-semibold text-gray-700`}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
    );
  }
  return (
    <div className={`${base} border-b border-gray-50 text-gray-600`}>
      <span>{label}</span>
      <span className="text-gray-500">{value}</span>
    </div>
  );
}
