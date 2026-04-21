import Link from "next/link";
import { SITE_CONFIG } from "@/config/siteConfig";
import { faqJsonLd, jsonLdProps } from "@/lib/seo";

export const metadata = {
  title: "Devoluciones y desistimiento | TCG Academy",
  description:
    "Información sobre el derecho de desistimiento, devoluciones y reembolsos en TCG Academy.",
};

// FAQPage para SEO — NO añade UI visible, solo JSON-LD en el <head>-equivalent.
// Alimenta los rich results de Google y es consumible por IAs (Perplexity,
// ChatGPT, Claude) cuando responden sobre políticas de devolución de la tienda.
// Fuente de las respuestas: mismo contenido visible de esta página +
// memoria feedback_returns_transferencia (reembolso siempre por transferencia).
const FAQ_ITEMS = [
  {
    question: "¿Cuál es el plazo para devolver un producto en TCG Academy?",
    answer:
      "Dispones de 14 días naturales desde la recepción del pedido para ejercer el derecho de desistimiento (Real Decreto Legislativo 1/2007, artículos 102 a 108), sin necesidad de justificar la decisión y sin penalización.",
  },
  {
    question: "¿Cómo se realiza el reembolso de una devolución?",
    answer:
      "Todos los reembolsos se emiten por transferencia bancaria al IBAN que facilite el cliente. No se realizan devoluciones en efectivo ni reversos automáticos a tarjeta ni vales de tienda.",
  },
  {
    question: "¿Cuánto tarda en llegar el reembolso?",
    answer:
      "Una vez recibido y revisado el producto devuelto, el reembolso se emite por transferencia en un plazo máximo de 14 días naturales, junto con la correspondiente factura rectificativa.",
  },
  {
    question: "¿Puedo devolver cartas sueltas o singles?",
    answer:
      "Sí. El derecho de desistimiento aplica a cartas sueltas siempre que se devuelvan en el mismo estado en el que fueron entregadas, en su funda protectora original cuando proceda.",
  },
  {
    question: "¿Los sobres o boosters abiertos se pueden devolver?",
    answer:
      "No. Los productos precintados (sobres, boosters, ETBs) solo se pueden devolver si se mantienen precintados. Una vez abierto el precinto, el contenido aleatorio hace inviable la devolución salvo que el producto presente defectos de fabricación.",
  },
  {
    question: "¿Quién paga los gastos de envío de la devolución?",
    answer:
      "Los gastos de envío de vuelta corren por cuenta del cliente salvo que la devolución se deba a un error de TCG Academy (producto incorrecto, defectuoso o dañado en el transporte), en cuyo caso asumimos el coste íntegro.",
  },
  {
    question: "¿Qué documentación recibiré tras el reembolso?",
    answer:
      "Junto con la transferencia recibirás una factura rectificativa generada automáticamente por nuestro sistema VeriFactu. Queda registrada en el Libro de facturas de tu área de cliente.",
  },
];

export default function DevolucionesPage() {
  return (
    <div className="bg-gray-50 py-10 sm:py-12">
      {/* JSON-LD FAQPage — pure metadata, not rendered visually. */}
      <script {...jsonLdProps(faqJsonLd(FAQ_ITEMS))} />
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#2563eb] hover:underline"
        >
          ← Volver al inicio
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 md:p-12">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Devoluciones y derecho de desistimiento
          </h1>
          <p className="mb-10 text-sm text-gray-400">
            Última actualización: abril de 2026
          </p>

          <Section title="1. Derecho de desistimiento (14 días)">
            <p>
              De conformidad con el{" "}
              <strong>
                Real Decreto Legislativo 1/2007 (TRLGDCU), artículos 102 a 108
              </strong>
              , usted tiene derecho a desistir del contrato de compra en un
              plazo de <strong>14 días naturales</strong> desde la recepción del
              producto, sin necesidad de justificar su decisión y sin
              penalización alguna.
            </p>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-800">
                Plazo: 14 días naturales desde la recepción del pedido
              </p>
              <p className="mt-1 text-xs text-blue-600">
                Si no le informamos de su derecho de desistimiento, el plazo se
                amplía a 12 meses (Art. 105 TRLGDCU).
              </p>
            </div>
          </Section>

          <Section title="2. ¿Cómo ejercer el desistimiento?">
            <p>
              Para ejercer su derecho de desistimiento, debe comunicarnos su
              decisión de forma inequívoca antes de que expire el plazo.
              Puede hacerlo de cualquiera de estas formas:
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>
                <strong>Email:</strong> Envíe un correo a{" "}
                <a
                  href={`mailto:${SITE_CONFIG.email}?subject=Desistimiento%20pedido`}
                  className="text-[#2563eb] hover:underline"
                >
                  {SITE_CONFIG.email}
                </a>{" "}
                indicando su número de pedido y la decisión de desistir.
              </li>
              <li>
                <strong>Desde tu cuenta:</strong> Accede a{" "}
                <Link
                  href="/cuenta/pedidos"
                  className="text-[#2563eb] hover:underline"
                >
                  Mis pedidos
                </Link>{" "}
                y solicita la devolución del pedido correspondiente.
              </li>
              <li>
                <strong>Formulario:</strong> Puede utilizar el modelo de
                formulario de desistimiento que se incluye más abajo, aunque no
                es obligatorio.
              </li>
            </ol>
          </Section>

          <Section title="3. Formulario de desistimiento">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm">
              <p className="mb-3 font-semibold text-gray-700">
                MODELO DE FORMULARIO DE DESISTIMIENTO
              </p>
              <p className="text-gray-600">
                (Solo debe cumplimentar y enviar el presente formulario si desea
                desistir del contrato)
              </p>
              <div className="mt-4 space-y-2 text-gray-600">
                <p>
                  A la atención de: <strong>{SITE_CONFIG.name} S.L.</strong>{" "}
                  ({SITE_CONFIG.email})
                </p>
                <p>
                  Por la presente le comunico que desisto de mi contrato de
                  venta del siguiente pedido:
                </p>
                <p className="text-gray-400">
                  Número de pedido: _______________
                </p>
                <p className="text-gray-400">
                  Fecha de recepción: _______________
                </p>
                <p className="text-gray-400">
                  Nombre del consumidor: _______________
                </p>
                <p className="text-gray-400">
                  Dirección del consumidor: _______________
                </p>
                <p className="text-gray-400">
                  Fecha y firma: _______________
                </p>
              </div>
            </div>
          </Section>

          <Section title="4. Proceso de devolución paso a paso">
            <div className="space-y-4">
              {[
                {
                  step: "1",
                  title: "Solicita la devolución",
                  desc: "Envía un email o solicítala desde tu cuenta antes de que pasen 14 días desde la recepción.",
                },
                {
                  step: "2",
                  title: "Recibe las instrucciones",
                  desc: "Te enviaremos un email con la dirección de envío y un número de RMA (autorización de devolución).",
                },
                {
                  step: "3",
                  title: "Envía el producto",
                  desc: "Embala el producto en su embalaje original y en perfectas condiciones. Incluye el número RMA visible.",
                },
                {
                  step: "4",
                  title: "Recibimos y verificamos",
                  desc: "Verificamos que el producto está en las condiciones requeridas.",
                },
                {
                  step: "5",
                  title: "Reembolso",
                  desc: "Procesamos el reembolso en un máximo de 14 días desde la recepción del producto devuelto, usando el mismo medio de pago original.",
                },
              ].map((s) => (
                <div key={s.step} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white">
                    {s.step}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{s.title}</p>
                    <p className="mt-0.5 text-gray-600">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="5. Condiciones de la devolución">
            <ul>
              <li>
                Los productos deben devolverse en su <strong>embalaje original</strong>,
                sin abrir y en perfectas condiciones.
              </li>
              <li>
                Los <strong>gastos de envío de devolución</strong> corren por
                cuenta del cliente, salvo que el motivo sea un error imputable a{" "}
                {SITE_CONFIG.name} (producto defectuoso, error en el pedido).
              </li>
              <li>
                Si el producto ha sido abierto o manipulado, nos reservamos el
                derecho a no aceptar la devolución o aplicar una reducción
                proporcional del reembolso conforme al Art. 107 TRLGDCU.
              </li>
              <li>
                <strong>Productos sellados</strong> (sobres, booster boxes,
                displays) que hayan sido abiertos no podrán ser devueltos por
                razones de protección de la integridad del producto.
              </li>
            </ul>
          </Section>

          <Section title="6. Excepciones al derecho de desistimiento">
            <p>
              Conforme al <strong>Art. 103 TRLGDCU</strong>, no procede el
              derecho de desistimiento en los siguientes casos:
            </p>
            <ul>
              <li>
                Productos precintados que no puedan ser devueltos por razones
                de protección de la salud o higiene, una vez desprecintados.
              </li>
              <li>
                Productos que hayan sido personalizados o confeccionados según
                las especificaciones del consumidor.
              </li>
              <li>
                Contenido digital suministrado sin soporte material cuando la
                ejecución haya comenzado con el consentimiento del consumidor.
              </li>
            </ul>
          </Section>

          <Section title="7. Productos defectuosos o errores de envío">
            <p>
              Si recibes un producto defectuoso, dañado durante el transporte o
              diferente al pedido:
            </p>
            <ul>
              <li>
                Tienes derecho a la <strong>reparación, sustitución o reembolso</strong>{" "}
                conforme a la garantía legal de conformidad (Art. 114-124 TRLGDCU).
              </li>
              <li>
                En estos casos, <strong>los gastos de envío corren a cargo de{" "}
                {SITE_CONFIG.name}</strong>.
              </li>
              <li>
                Contacta con nosotros en un plazo máximo de{" "}
                <strong>2 meses</strong> desde la detección del defecto.
              </li>
            </ul>
          </Section>

          <Section title="8. Plazos de reembolso">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <dl className="space-y-2 text-sm">
                <div className="flex gap-3">
                  <dt className="w-48 shrink-0 font-medium text-gray-700">
                    Desistimiento (sin defecto)
                  </dt>
                  <dd className="text-gray-600">
                    Máximo 14 días desde la recepción del producto devuelto
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-48 shrink-0 font-medium text-gray-700">
                    Producto defectuoso
                  </dt>
                  <dd className="text-gray-600">
                    Máximo 14 días desde la verificación del defecto
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-48 shrink-0 font-medium text-gray-700">
                    Medio de reembolso
                  </dt>
                  <dd className="text-gray-600">
                    Mismo medio de pago utilizado en la compra original
                  </dd>
                </div>
              </dl>
            </div>
          </Section>

          <Section title="9. Contacto">
            <p>
              Para cualquier consulta sobre devoluciones, puedes contactarnos
              en:
            </p>
            <ul>
              <li>
                <strong>Email:</strong>{" "}
                <a
                  href={`mailto:${SITE_CONFIG.email}`}
                  className="text-[#2563eb] hover:underline"
                >
                  {SITE_CONFIG.email}
                </a>
              </li>
              <li>
                <strong>Teléfono:</strong> {SITE_CONFIG.phone}
              </li>
              <li>
                <strong>Formulario:</strong>{" "}
                <Link
                  href="/contacto"
                  className="text-[#2563eb] hover:underline"
                >
                  Página de contacto
                </Link>
              </li>
            </ul>
          </Section>

          <div className="mt-10 border-t border-gray-100 pt-6 text-sm text-gray-400">
            ¿Tienes dudas sobre devoluciones?{" "}
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
      <div className="space-y-3 text-sm leading-relaxed text-gray-600 [&_ol]:mt-2 [&_ol]:space-y-1.5 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
