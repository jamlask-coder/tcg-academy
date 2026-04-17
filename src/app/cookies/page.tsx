import Link from "next/link";
import { SITE_CONFIG } from "@/config/siteConfig";

export const metadata = {
  title: "Política de cookies | TCG Academy",
  description:
    "Información sobre el uso de cookies en TCG Academy conforme al RGPD y la LSSI-CE.",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#2563eb] hover:underline"
        >
          ← Volver al inicio
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 md:p-12">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Política de cookies
          </h1>
          <p className="mb-10 text-sm text-gray-400">
            Última actualización: abril de 2026
          </p>

          <Section title="1. ¿Qué son las cookies?">
            <p>
              Las cookies son pequeños archivos de texto que los sitios web
              almacenan en su dispositivo (ordenador, tablet o teléfono móvil)
              cuando los visita. Sirven para que el sitio web recuerde
              información sobre su visita, como su idioma preferido y otras
              opciones, lo que puede facilitar su próxima visita y hacer que el
              sitio le resulte más útil.
            </p>
          </Section>

          <Section title="2. Base legal">
            <p>
              El uso de cookies está regulado por el{" "}
              <strong>artículo 22.2 de la LSSI-CE</strong> (Ley 34/2002) y el{" "}
              <strong>Reglamento (UE) 2016/679</strong> (RGPD). De acuerdo con
              esta normativa:
            </p>
            <ul>
              <li>
                Las <strong>cookies técnicas</strong> (estrictamente necesarias)
                están exentas del requisito de consentimiento, ya que son
                imprescindibles para la prestación del servicio.
              </li>
              <li>
                Las <strong>cookies de análisis y personalización</strong>{" "}
                requieren el consentimiento previo e informado del usuario.
              </li>
              <li>
                Las <strong>cookies publicitarias</strong> requieren
                consentimiento explícito antes de su instalación.
              </li>
            </ul>
          </Section>

          <Section title="3. Tipos de cookies que utilizamos">
            <p>
              A continuación, detallamos las cookies utilizadas en{" "}
              <strong>{SITE_CONFIG.name}</strong>, clasificadas por su
              finalidad:
            </p>

            <h3 className="mt-4 mb-2 font-semibold text-gray-700">
              3.1 Cookies técnicas (estrictamente necesarias)
            </h3>
            <p>
              Son imprescindibles para el funcionamiento del sitio web. Sin
              ellas, servicios esenciales como el carrito de compra, el inicio de
              sesión o la navegación entre páginas no funcionarían
              correctamente. No requieren consentimiento.
            </p>
            <CookieTable
              cookies={[
                {
                  name: "tcga_cookie_consent",
                  provider: SITE_CONFIG.name,
                  purpose: "Almacena las preferencias de cookies del usuario",
                  duration: "12 meses",
                },
                {
                  name: "tcga_auth_token",
                  provider: SITE_CONFIG.name,
                  purpose: "Mantiene la sesión iniciada del usuario",
                  duration: "24h / 30 días (con 'Recordarme')",
                },
                {
                  name: "tcga_cart",
                  provider: SITE_CONFIG.name,
                  purpose: "Almacena los productos del carrito de compra",
                  duration: "Sesión",
                },
                {
                  name: "tcga_favorites",
                  provider: SITE_CONFIG.name,
                  purpose: "Lista de productos favoritos del usuario",
                  duration: "Persistente",
                },
                {
                  name: "tcga_recent_searches",
                  provider: SITE_CONFIG.name,
                  purpose: "Últimas búsquedas realizadas para facilitar la navegación",
                  duration: "Persistente",
                },
              ]}
            />

            <h3 className="mt-6 mb-2 font-semibold text-gray-700">
              3.2 Cookies de análisis
            </h3>
            <p>
              Permiten realizar un seguimiento anónimo y agregado del
              comportamiento de los usuarios en el sitio web para mejorar la
              experiencia de navegación. Solo se activan si el usuario otorga
              su consentimiento.
            </p>
            <CookieTable
              cookies={[
                {
                  name: "_ga / _ga_*",
                  provider: "Google Analytics",
                  purpose: "Distinguir usuarios únicos y sesiones de navegación",
                  duration: "2 años / 24h",
                },
              ]}
            />
            <p className="mt-2 text-xs text-gray-400">
              * Actualmente no tenemos cookies de análisis activas. Este
              apartado se actualiza si se incorporan en el futuro.
            </p>

            <h3 className="mt-6 mb-2 font-semibold text-gray-700">
              3.3 Cookies de marketing / publicitarias
            </h3>
            <p>
              Estas cookies se utilizan para mostrar publicidad relevante al
              usuario y medir la eficacia de las campañas publicitarias. Solo se
              activan con consentimiento explícito del usuario.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              * Actualmente no utilizamos cookies publicitarias de terceros.
              Este apartado se actualiza si se incorporan en el futuro.
            </p>
          </Section>

          <Section title="4. ¿Cómo gestionar las cookies?">
            <p>
              Al acceder a nuestro sitio web por primera vez, se mostrará un
              banner de cookies que le permite:
            </p>
            <ul>
              <li>
                <strong>Aceptar todas</strong> las cookies.
              </li>
              <li>
                <strong>Rechazar</strong> las cookies no esenciales (solo se
                mantendrán las técnicas necesarias).
              </li>
              <li>
                <strong>Configurar</strong> sus preferencias seleccionando qué
                tipos de cookies desea permitir.
              </li>
            </ul>
            <p>
              Puede modificar sus preferencias en cualquier momento desde el
              enlace &quot;Configuración de cookies&quot; disponible en el pie de
              página del sitio web.
            </p>

            <h3 className="mt-4 mb-2 font-semibold text-gray-700">
              Gestión desde el navegador
            </h3>
            <p>
              También puede gestionar las cookies directamente desde la
              configuración de su navegador. A continuación, le facilitamos
              enlaces a las instrucciones de los navegadores más comunes:
            </p>
            <ul>
              <li>
                <strong>Google Chrome:</strong>{" "}
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2563eb] hover:underline"
                >
                  Gestionar cookies en Chrome
                </a>
              </li>
              <li>
                <strong>Mozilla Firefox:</strong>{" "}
                <a
                  href="https://support.mozilla.org/es/kb/Borrar%20cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2563eb] hover:underline"
                >
                  Gestionar cookies en Firefox
                </a>
              </li>
              <li>
                <strong>Safari:</strong>{" "}
                <a
                  href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2563eb] hover:underline"
                >
                  Gestionar cookies en Safari
                </a>
              </li>
              <li>
                <strong>Microsoft Edge:</strong>{" "}
                <a
                  href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2563eb] hover:underline"
                >
                  Gestionar cookies en Edge
                </a>
              </li>
            </ul>
            <p>
              Tenga en cuenta que la desactivación de las cookies técnicas puede
              afectar al correcto funcionamiento del sitio web.
            </p>
          </Section>

          <Section title="5. Transferencias internacionales">
            <p>
              Cuando se activen cookies de terceros (por ejemplo, Google
              Analytics), sus datos podrían ser transferidos a servidores
              ubicados fuera del Espacio Económico Europeo. En tal caso, nos
              aseguramos de que existan las garantías adecuadas conforme a los
              artículos 46 y 49 del RGPD (cláusulas contractuales tipo,
              decisiones de adecuación, etc.).
            </p>
          </Section>

          <Section title="6. Actualización de esta política">
            <p>
              Esta política de cookies puede ser actualizada periódicamente para
              reflejar cambios en las cookies que utilizamos o por motivos
              operativos, legales o regulatorios. Le recomendamos revisarla
              periódicamente para estar informado sobre cómo protegemos su
              privacidad.
            </p>
          </Section>

          <Section title="7. Más información">
            <p>
              Para cualquier consulta relacionada con nuestra política de
              cookies, puede contactarnos en{" "}
              <a
                href={`mailto:${SITE_CONFIG.email}`}
                className="text-[#2563eb] hover:underline"
              >
                {SITE_CONFIG.email}
              </a>
              .
            </p>
            <p>
              Si desea más información sobre el tratamiento de sus datos
              personales, consulte nuestra{" "}
              <Link href="/privacidad" className="text-[#2563eb] hover:underline">
                Política de Privacidad
              </Link>
              .
            </p>
          </Section>

          <div className="mt-10 border-t border-gray-100 pt-6 text-sm text-gray-400">
            ¿Tienes preguntas sobre cookies?{" "}
            <Link href="/contacto" className="text-[#2563eb] hover:underline">
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

interface CookieInfo {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
}

function CookieTable({ cookies }: { cookies: CookieInfo[] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-700">
            <th className="px-4 py-2.5">Cookie</th>
            <th className="px-4 py-2.5">Proveedor</th>
            <th className="px-4 py-2.5">Finalidad</th>
            <th className="px-4 py-2.5">Duración</th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((c) => (
            <tr
              key={c.name}
              className="border-b border-gray-50 text-gray-600 last:border-0"
            >
              <td className="px-4 py-2 font-mono text-xs">{c.name}</td>
              <td className="px-4 py-2">{c.provider}</td>
              <td className="px-4 py-2">{c.purpose}</td>
              <td className="px-4 py-2 whitespace-nowrap">{c.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
