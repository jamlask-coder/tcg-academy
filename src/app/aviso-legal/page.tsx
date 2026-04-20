import Link from "next/link";
import { SITE_CONFIG } from "@/config/siteConfig";

export const metadata = {
  title: "Aviso legal | TCG Academy",
  description:
    "Aviso legal e información sobre el titular del sitio web TCG Academy conforme a la LSSI-CE.",
};

export default function AvisoLegalPage() {
  return (
    <div className="bg-gray-50 py-10 sm:py-12">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#2563eb] hover:underline"
        >
          ← Volver al inicio
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 md:p-12">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Aviso legal
          </h1>
          <p className="mb-10 text-sm text-gray-400">
            Última actualización: abril de 2026
          </p>

          <Section title="1. Datos identificativos del titular">
            <p>
              En cumplimiento del artículo 10 de la{" "}
              <strong>Ley 34/2002, de 11 de julio</strong>, de Servicios de la
              Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se
              informa al usuario de los siguientes datos del titular:
            </p>
            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-5">
              <dl className="space-y-2 text-sm">
                <Row label="Denominación social" value={SITE_CONFIG.legalName} />
                <Row label="CIF" value={SITE_CONFIG.cif} />
                <Row label="Domicilio social" value={SITE_CONFIG.address} />
                <Row label="Correo electrónico" value={SITE_CONFIG.email} link={`mailto:${SITE_CONFIG.email}`} />
                <Row label="Teléfono" value={SITE_CONFIG.phone} />
                <Row label="Sitio web" value="https://tcgacademy.es" />
                <Row label="Inscripción registral" value="Registro Mercantil de Alicante, Tomo XXXX, Folio XX, Hoja A-XXXXX" />
              </dl>
            </div>
          </Section>

          <Section title="2. Objeto del sitio web">
            <p>
              El presente sitio web tiene por objeto poner a disposición de los
              usuarios información sobre los productos y servicios de{" "}
              <strong>{SITE_CONFIG.name}</strong>, así como facilitar la compra
              en línea de cartas coleccionables (TCG), accesorios y productos
              relacionados.
            </p>
          </Section>

          <Section title="3. Condiciones de uso">
            <p>
              El acceso y navegación por este sitio web atribuye la condición de
              usuario e implica la aceptación plena y sin reservas de todas las
              disposiciones incluidas en este aviso legal, así como en la{" "}
              <Link href="/privacidad" className="text-[#2563eb] hover:underline">
                Política de Privacidad
              </Link>
              , la{" "}
              <Link href="/cookies" className="text-[#2563eb] hover:underline">
                Política de Cookies
              </Link>{" "}
              y los{" "}
              <Link href="/terminos" className="text-[#2563eb] hover:underline">
                Términos y Condiciones
              </Link>
              .
            </p>
            <p>
              El usuario se compromete a utilizar el sitio web de conformidad con
              la ley, el presente aviso legal, las buenas costumbres y el orden
              público. El usuario se abstendrá de utilizar el sitio web con fines
              ilícitos, lesivos de los derechos e intereses de terceros, o que de
              cualquier forma puedan dañar, inutilizar o deteriorar el sitio web
              o impedir su normal utilización.
            </p>
          </Section>

          <Section title="4. Propiedad intelectual e industrial">
            <p>
              Todos los contenidos del sitio web, incluyendo a título
              enunciativo pero no limitativo textos, fotografías, gráficos,
              imágenes, iconos, logotipos, tecnología, software, enlaces y demás
              contenidos audiovisuales o sonoros, así como su diseño gráfico y
              códigos fuente, son propiedad intelectual de {SITE_CONFIG.name}{" "}
              o de terceros que han autorizado su uso, sin que puedan entenderse
              cedidos al usuario ninguno de los derechos de explotación sobre los
              mismos más allá de lo estrictamente necesario para el correcto uso
              del sitio web.
            </p>
            <p>
              Las marcas, nombres comerciales o signos distintivos de los juegos
              de cartas coleccionables (Pokémon, Magic: The Gathering, Yu-Gi-Oh!,
              Dragon Ball Super Card Game, Disney Lorcana, Naruto Boruto Card
              Game, etc.) son propiedad de sus respectivos titulares.{" "}
              {SITE_CONFIG.name} es distribuidor autorizado y su uso en este
              sitio web tiene carácter meramente informativo.
            </p>
            <p>
              Queda prohibida la reproducción, distribución, comunicación
              pública, transformación o cualquier otra forma de explotación de
              los contenidos sin autorización expresa y por escrito del titular.
            </p>
          </Section>

          <Section title="5. Exclusión de responsabilidad">
            <p>
              {SITE_CONFIG.name} no se hace responsable de:
            </p>
            <ul>
              <li>
                Los daños o perjuicios derivados de la falta de disponibilidad o
                continuidad del funcionamiento del sitio web.
              </li>
              <li>
                Los errores u omisiones en los contenidos, sin perjuicio de
                corregirlos con la mayor brevedad posible una vez detectados.
              </li>
              <li>
                Los daños producidos por terceros mediante intromisiones
                ilegítimas fuera del control razonable de {SITE_CONFIG.name}.
              </li>
              <li>
                Los contenidos y servicios prestados por terceros a través de
                enlaces (links) incluidos en el sitio web, salvo que{" "}
                {SITE_CONFIG.name} tenga conocimiento efectivo de su ilicitud.
              </li>
            </ul>
          </Section>

          <Section title="6. Enlaces a terceros">
            <p>
              Este sitio web puede contener enlaces a páginas de terceros.{" "}
              {SITE_CONFIG.name} no asume responsabilidad alguna por el
              contenido, informaciones o servicios que pudieran aparecer en
              dichos sitios, que tendrán exclusivamente carácter informativo y
              que en ningún caso implican relación alguna entre{" "}
              {SITE_CONFIG.name} y las personas o entidades titulares de tales
              contenidos.
            </p>
          </Section>

          <Section title="7. Protección de datos">
            <p>
              De conformidad con lo dispuesto en el{" "}
              <strong>Reglamento (UE) 2016/679</strong> (RGPD) y la{" "}
              <strong>Ley Orgánica 3/2018</strong> (LOPDGDD),{" "}
              {SITE_CONFIG.name} trata los datos personales de los usuarios
              conforme a lo descrito en la{" "}
              <Link href="/privacidad" className="text-[#2563eb] hover:underline">
                Política de Privacidad
              </Link>
              .
            </p>
          </Section>

          <Section title="8. Legislación aplicable y jurisdicción">
            <p>
              El presente aviso legal se rige en todos y cada uno de sus
              extremos por la legislación española. Para la resolución de
              cualquier controversia que pudiera derivarse del acceso o uso de
              este sitio web, {SITE_CONFIG.name} y el usuario se someten a los
              Juzgados y Tribunales del domicilio del consumidor, conforme a lo
              previsto en el{" "}
              <strong>Real Decreto Legislativo 1/2007</strong> (TRLGDCU).
            </p>
            <p>
              Asimismo, le informamos de que puede acceder a la plataforma
              europea de resolución de litigios en línea (ODR) en la siguiente
              dirección:{" "}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2563eb] hover:underline"
              >
                https://ec.europa.eu/consumers/odr
              </a>
              .
            </p>
          </Section>

          <Section title="9. Modificaciones">
            <p>
              {SITE_CONFIG.name} se reserva el derecho de modificar el presente
              aviso legal para adaptarlo a novedades legislativas,
              jurisprudenciales o de práctica sectorial. Las modificaciones serán
              publicadas en esta misma página y entrarán en vigor desde su
              publicación.
            </p>
          </Section>

          <div className="mt-10 border-t border-gray-100 pt-6 text-sm text-gray-400">
            ¿Tienes dudas legales?{" "}
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

function Row({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-44 shrink-0 font-medium text-gray-700">{label}</dt>
      <dd className="text-gray-600">
        {link ? (
          <a href={link} className="text-[#2563eb] hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
