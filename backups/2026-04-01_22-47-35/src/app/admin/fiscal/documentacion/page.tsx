"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "¿Cuándo estoy obligado a usar VeriFactu?",
    answer:
      "A partir de la entrada en vigor del Real Decreto 1007/2023, los sistemas informáticos de facturación deben garantizar la integridad, conservación, accesibilidad, legibilidad, trazabilidad e inalterabilidad de los registros de facturación. VeriFactu es la modalidad de envío en tiempo real a la AEAT.",
  },
  {
    question: "¿Puedo eliminar o modificar una factura ya emitida?",
    answer:
      "No. Las facturas son inmutables una vez emitidas. Si hay un error, debes emitir una factura rectificativa. El sistema registra el motivo y la factura original queda marcada como anulada en el libro de facturas.",
  },
  {
    question: "¿Qué diferencia hay entre Modelo 303 y Modelo 390?",
    answer:
      "El Modelo 303 es la autoliquidación trimestral del IVA (se presenta 4 veces al año). El Modelo 390 es el resumen anual informativo que recapitula todos los trimestres del año. El 390 no genera ingreso adicional; es solo informativo.",
  },
  {
    question: "¿Qué pasa si una factura es rechazada por VeriFactu?",
    answer:
      "La factura queda con estado 'Rechazada'. Debes revisar el campo 'verifactuError' para conocer el motivo, corregir el problema y reenviar. Si la corrección afecta al contenido fiscal, emite una rectificativa.",
  },
  {
    question: "¿Cómo exporto los datos para mi gestoría?",
    answer:
      "Ve a 'Libro de Facturas' y usa el botón 'Exportar todo (CSV)'. El archivo incluye BOM UTF-8 para compatibilidad con Excel español y está en formato compatible con ContaPlus, A3 y Sage. También puedes exportar trimestres específicos desde las secciones Trimestral y Anual.",
  },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-bold text-[#2563eb]">{title}</h2>
      <div className="space-y-2 leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-gray-800 hover:text-[#2563eb]"
      >
        <span>{item.question}</span>
        {open ? (
          <ChevronUp size={16} className="shrink-0 text-gray-400" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-gray-400" />
        )}
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-gray-600">
          {item.answer}
        </p>
      )}
    </div>
  );
}

export default function DocumentacionPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Documentación Fiscal
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Guía del sistema de facturación y VeriFactu de TCG Academy
        </p>
      </div>

      <div className="mx-auto max-w-3xl">
        {/* What is VeriFactu */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-8">
          <Section title="¿Qué es VeriFactu?">
            <p>
              VeriFactu es el sistema de verificación de facturas de la Agencia
              Tributaria española, regulado por el
              <strong> Real Decreto 1007/2023</strong> sobre sistemas
              informáticos de facturación.
            </p>
            <p>
              Obliga a los sistemas de facturación a garantizar la{" "}
              <strong>integridad, inalterabilidad y trazabilidad</strong> de
              todas las facturas emitidas. Cada factura recibe un hash SHA-256 y
              se encadena con la anterior, formando una cadena inmutable similar
              a una blockchain simplificada.
            </p>
            <p>
              En el modo VeriFactu, las facturas se envían en tiempo real a la
              AEAT (plazo máximo 4 días naturales). El cliente puede verificar
              la autenticidad de cualquier factura escaneando el código QR que
              aparece en el documento.
            </p>
          </Section>
          <div className="my-6 border-t border-gray-100" />

          {/* How hash chaining works */}
          <Section title="¿Cómo funciona el hash encadenado?">
            <p>
              Cuando se emite una factura, el sistema calcula un{" "}
              <strong>hash SHA-256</strong> a partir de los campos fiscales
              clave: NIF emisor, número de serie, fecha, importe total y NIF del
              receptor.
            </p>
            <p>
              A continuación, se genera el <strong>hash encadenado</strong>{" "}
              combinando el hash de la factura actual con el hash encadenado de
              la factura anterior:{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                SHA-256(hashActual + hashAnterior)
              </code>
              .
            </p>
            <p>
              Si alguien modifica cualquier campo de una factura pasada, su hash
              cambia, lo que invalida todos los hashes encadenados posteriores.
              Esto hace imposible la manipulación silenciosa del registro de
              facturas.
            </p>
          </Section>
          <div className="my-6 border-t border-gray-100" />

          {/* Export guide */}
          <Section title="Cómo exportar datos para la gestoría">
            <ol className="list-inside list-decimal space-y-1 text-sm">
              <li>
                Ve a <strong>Libro de Facturas</strong> en el menú lateral.
              </li>
              <li>Selecciona el año y trimestre que necesitas exportar.</li>
              <li>
                Haz clic en <strong>&ldquo;Exportar todo (CSV)&rdquo;</strong>{" "}
                en la parte superior derecha.
              </li>
              <li>
                El archivo descargado incluye todas las columnas necesarias:
                base por tipo de IVA, cuotas, total, forma de pago y estado
                VeriFactu.
              </li>
              <li>
                Para exportar solo un trimestre al asesor fiscal, usa las
                secciones <strong>Trimestral</strong> o <strong>Anual</strong>.
              </li>
              <li>
                El CSV usa <strong>punto y coma</strong> como separador y BOM
                UTF-8 para compatibilidad con Excel en español.
              </li>
            </ol>
          </Section>
          <div className="my-6 border-t border-gray-100" />

          {/* Rectificativas */}
          <Section title="Cómo emitir una factura rectificativa">
            <ol className="list-inside list-decimal space-y-1 text-sm">
              <li>Localiza la factura original en el Libro de Facturas.</li>
              <li>
                Las facturas no se pueden modificar una vez emitidas (principio
                de inalterabilidad).
              </li>
              <li>
                Crea una nueva factura de tipo <strong>Rectificativa</strong>{" "}
                indicando el número de la factura original, la fecha, el motivo
                y el código de causa (R1-R5 según la AEAT).
              </li>
              <li>
                Si el error afecta al importe, la rectificativa debe reflejar la
                diferencia (método por diferencias) o el importe total correcto
                (método por sustitución).
              </li>
              <li>
                La factura original queda automáticamente marcada como{" "}
                <strong>Anulada</strong> en el sistema.
              </li>
              <li>
                Guarda ambas facturas en el registro y envíalas a la AEAT si
                tienes VeriFactu activo.
              </li>
            </ol>
          </Section>
          <div className="my-6 border-t border-gray-100" />

          {/* Intra-community */}
          <Section title="Operaciones intracomunitarias — Cuándo aplicar IVA 0%">
            <p>
              Las ventas a empresas de la <strong>Unión Europea</strong>{" "}
              (excluida España) con NIF intracomunitario válido tributan a{" "}
              <strong>IVA 0%</strong> por inversión del sujeto pasivo (el
              cliente declara el IVA en su país).
            </p>
            <p>
              Requisitos para aplicar IVA 0%: el destinatario debe ser una
              empresa (no particular), tener NIF intracomunitario registrado en
              el ROI (Registro de Operadores Intracomunitarios) y el código de
              país debe ser distinto a ES.
            </p>
            <p>
              Estas operaciones deben declararse trimestralmente en el{" "}
              <strong>Modelo 349</strong>. Si superan 50.000 € en un trimestre,
              la declaración pasa a ser mensual.
            </p>
          </Section>
          <div className="my-6 border-t border-gray-100" />

          {/* Tax models */}
          <Section title="Modelos fiscales disponibles">
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="font-bold text-gray-900">
                  Modelo 303 — Autoliquidación trimestral del IVA
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Se presenta 4 veces al año (20 de abril, 20 de julio, 20 de
                  octubre y 30 de enero). Recoge el IVA repercutido de las
                  ventas menos el IVA soportado de las compras. El resultado
                  puede ser a ingresar, a compensar o a devolver.
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="font-bold text-gray-900">
                  Modelo 390 — Resumen anual del IVA
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Declaración informativa anual que resume todos los modelos 303
                  presentados durante el año. Se presenta en enero del año
                  siguiente. No genera ingreso adicional.
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="font-bold text-gray-900">
                  Modelo 349 — Operaciones intracomunitarias
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Declaración recapitulativa de las operaciones realizadas con
                  empresas de la UE (compras y ventas). Presentación trimestral
                  por defecto, mensual si se superan los 50.000 € en un
                  trimestre.
                </p>
              </div>
            </div>
          </Section>
        </div>

        {/* FAQ */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-8">
          <h2 className="mb-4 text-xl font-bold text-[#2563eb]">
            Preguntas frecuentes
          </h2>
          {FAQ_ITEMS.map((item) => (
            <FAQAccordion key={item.question} item={item} />
          ))}
        </div>

        {/* Contact */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8">
          <h2 className="mb-3 text-xl font-bold text-[#2563eb]">
            Contacto del soporte
          </h2>
          <p className="text-sm text-gray-700">
            Para dudas sobre facturación, VeriFactu o exportación de datos,
            contacta con el equipo técnico:
          </p>
          <p className="mt-3 text-sm font-semibold text-[#2563eb]">
            soporte@tcgacademy.es
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Tiempo de respuesta habitual: 24-48 horas laborables.
          </p>
        </div>
      </div>
    </div>
  );
}
