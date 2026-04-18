import Link from "next/link";
import { SITE_CONFIG } from "@/config/siteConfig";

export const metadata = {
  title: "Términos y condiciones | TCG Academy",
  description: "Condiciones generales de contratación y uso de TCG Academy.",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-6">
        {/* Back */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#2563eb] hover:underline"
        >
          ← Volver al inicio
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 md:p-12">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Términos y condiciones
          </h1>
          <p className="mb-10 text-sm text-gray-400">
            Última actualización: abril de 2026
          </p>

          <Section title="1. Identificación del titular">
            <p>
              En cumplimiento de la Ley 34/2002, de Servicios de la Sociedad de
              la Información (LSSI-CE), le informamos que este sitio web es
              titularidad de <strong>{SITE_CONFIG.legalName}</strong> (CIF:{" "}
              {SITE_CONFIG.cif}), con domicilio a efectos de comunicaciones en{" "}
              la dirección indicada en la sección{" "}
              <Link href="/contacto" className="text-[#2563eb] hover:underline">
                Contacto
              </Link>
              .
            </p>
          </Section>

          <Section title="2. Objeto y ámbito de aplicación">
            <p>
              Las presentes condiciones generales regulan el acceso, navegación
              y uso del sitio web <strong>TCG Academy</strong>, así como las
              relaciones derivadas de la compraventa de productos entre TCG
              Academy S.L. y los usuarios registrados.
            </p>
            <p>
              El uso del sitio web implica la aceptación plena y sin reservas de
              todas las disposiciones incluidas en estas condiciones generales.
            </p>
          </Section>

          <Section title="3. Registro de usuarios">
            <p>
              El acceso a determinadas funcionalidades (carrito, historial de
              pedidos, precios especiales) requiere registro previo. El usuario
              garantiza que los datos facilitados son verídicos, exactos y
              actualizados, siendo responsable de mantenerlos al día.
            </p>
            <p>
              {SITE_CONFIG.legalName} se reserva el derecho de cancelar cuentas que
              incumplan estas condiciones o que contengan información falsa o
              fraudulenta.
            </p>
          </Section>

          <Section title="4. Proceso de compra y precios">
            <p>
              Todos los precios publicados incluyen el IVA vigente (
              {SITE_CONFIG.vatRate}%) salvo indicación expresa en contrario. El
              proceso de compra queda perfeccionado cuando TCG Academy confirma
              el pedido por correo electrónico.
            </p>
            <p>
              {SITE_CONFIG.legalName} se reserva el derecho de rechazar o cancelar
              pedidos en los que se detecte un error de precio o disponibilidad,
              informando al cliente en el menor tiempo posible.
            </p>
          </Section>

          <Section title="5. Envíos y plazos de entrega">
            <p>
              Los pedidos se procesan en un plazo máximo de{" "}
              {SITE_CONFIG.dispatchHours} horas hábiles desde la confirmación
              del pago. El envío es gratuito para pedidos superiores a{" "}
              {SITE_CONFIG.shippingThreshold}€. Para pedidos de menor importe se
              aplican los gastos de envío vigentes mostrados en el carrito.
            </p>
            <p>
              Los plazos de entrega son estimativos y pueden verse afectados por
              causas ajenas a TCG Academy (incidencias del transportista,
              festivos, etc.).
            </p>
          </Section>

          <Section title="6. Derecho de desistimiento">
            <p>
              De acuerdo con el Real Decreto Legislativo 1/2007 (TRLGDCU), el
              cliente dispone de 14 días naturales desde la recepción del pedido
              para ejercer su derecho de desistimiento, sin necesidad de
              justificación.
            </p>
            <p>
              Los productos deben devolverse en su embalaje original y en
              perfectas condiciones. Los gastos de devolución corren a cargo del
              cliente salvo que el motivo sea un error imputable a TCG Academy.
            </p>
            <p>
              Consulta el proceso completo, formulario de desistimiento y
              excepciones en nuestra página de{" "}
              <Link
                href="/devoluciones"
                className="text-[#2563eb] hover:underline"
              >
                Devoluciones y desistimiento
              </Link>
              .
            </p>
          </Section>

          <Section title="7. Propiedad intelectual">
            <p>
              Todos los contenidos del sitio web (textos, imágenes, logotipos,
              diseño) son propiedad de {SITE_CONFIG.legalName} o de sus respectivos
              titulares, y están protegidos por la legislación española e
              internacional de propiedad intelectual e industrial.
            </p>
            <p>
              Queda prohibida su reproducción, distribución o comunicación
              pública sin autorización expresa por escrito.
            </p>
          </Section>

          <Section title="8. Limitación de responsabilidad">
            <p>
              {SITE_CONFIG.legalName} no será responsable de los daños o perjuicios
              derivados del uso o la imposibilidad de uso del sitio web, ni de
              los errores u omisiones en los contenidos, siempre que no sean
              imputables a una actuación dolosa o negligente.
            </p>
          </Section>

          <Section title="9. Legislación aplicable y jurisdicción">
            <p>
              Las presentes condiciones se rigen por la legislación española.
              Para la resolución de controversias, las partes se someten a los
              Juzgados y Tribunales del domicilio del consumidor, conforme a lo
              previsto en la normativa de defensa de los consumidores y
              usuarios.
            </p>
            <p>
              Puede acceder a la plataforma europea de resolución de litigios en
              línea en:{" "}
              <span className="text-[#2563eb]">
                https://ec.europa.eu/consumers/odr
              </span>
              .
            </p>
          </Section>

          <Section title="10. Modificaciones">
            <p>
              {SITE_CONFIG.legalName} se reserva el derecho de modificar estas
              condiciones en cualquier momento. Las modificaciones serán
              efectivas desde su publicación en el sitio web. El uso continuado
              del sitio tras la publicación implica la aceptación de las nuevas
              condiciones.
            </p>
          </Section>

          <div className="mt-10 border-t border-gray-100 pt-6 text-sm text-gray-400">
            ¿Tienes dudas?{" "}
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
      <div className="space-y-3 text-sm leading-relaxed text-gray-600">
        {children}
      </div>
    </section>
  );
}
