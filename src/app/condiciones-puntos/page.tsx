import Link from "next/link";
import { SITE_CONFIG } from "@/config/siteConfig";

export const metadata = {
  title: "Condiciones del Programa de Puntos y Grupos | TCG Academy",
  description:
    "Bases legales, condiciones de uso y limitaciones del programa de puntos y grupos de fidelización de TCG Academy.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-lg font-bold text-gray-900">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-gray-600 text-justify">{children}</div>
    </div>
  );
}

function LegalRef({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
      {children}
    </span>
  );
}

export default function CondicionesPuntosPage() {
  return (
    <div className="bg-gray-50 py-10 sm:py-12">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/cuenta/grupo"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#2563eb] hover:underline"
        >
          ← Volver a Mi grupo
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 md:p-12">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Condiciones del Programa de Puntos y Grupos
          </h1>
          <p className="mb-2 text-sm text-gray-400">
            Última actualización: abril de 2026
          </p>
          <p className="mb-10 text-sm text-gray-500">
            Titular: <strong>{SITE_CONFIG.name}</strong> — CIF: <strong>{SITE_CONFIG.cif}</strong>
          </p>

          <Section title="1. Naturaleza del programa">
            <p>
              El Programa de Puntos y Grupos de <strong>{SITE_CONFIG.name}</strong> es una
              iniciativa comercial voluntaria diseñada exclusivamente como beneficio adicional para
              los clientes registrados. Se trata de un sistema de fidelización que permite acumular
              crédito interno denominado «puntos», canjeable únicamente como descuento parcial en
              futuras compras realizadas en la plataforma.
            </p>
            <p>
              Este programa constituye una <strong>liberalidad unilateral de la empresa</strong>:
              no existe obligación legal de mantenerlo, ampliarlo ni continuarlo. La participación
              del usuario implica la aceptación de que los puntos son un beneficio gracioso y
              discrecional concedido por {SITE_CONFIG.name}, y no un derecho adquirido, un activo
              económico ni un instrumento de pago de ningún tipo.
            </p>
            <p>
              Los puntos acumulados <strong>no tienen valor monetario</strong>, no son transferibles
              entre usuarios, no son reembolsables en efectivo y solo pueden aplicarse como
              descuento parcial —con un límite máximo del 50 % del subtotal de productos por
              pedido— en compras realizadas en {SITE_CONFIG.name}.
            </p>
          </Section>

          <Section title="2. Los puntos no son dinero: análisis jurídico">
            <p>
              Es fundamental dejar constancia expresa de que los puntos de este programa{" "}
              <strong>no constituyen dinero electrónico, instrumento de pago ni activo financiero
              de ninguna clase</strong> conforme al ordenamiento jurídico español y europeo.
              Esta distinción tiene relevancia directa para determinar qué normativa resulta
              aplicable y cuáles son los derechos y obligaciones de las partes.
            </p>
            <p>
              La <LegalRef>Directiva 2009/110/CE del Parlamento Europeo y del Consejo</LegalRef>{" "}
              (Directiva de Dinero Electrónico, «EMD2»), transpuesta al ordenamiento español
              mediante el{" "}
              <LegalRef>Real Decreto-ley 19/2018, de 23 de noviembre, de servicios de pago</LegalRef>,
              define el dinero electrónico como «todo valor monetario almacenado por medios
              electrónicos o magnéticos que represente un crédito sobre el emisor, que se emita al
              recibo de fondos con el propósito de efectuar operaciones de pago». Los puntos de
              este programa no cumplen ninguno de estos requisitos:
            </p>
            <ul className="ml-4 list-disc space-y-2 text-justify">
              <li>
                <strong>No se emiten a cambio de fondos entregados:</strong> el usuario no abona
                importe alguno para obtener puntos. Estos se generan gratuitamente como consecuencia
                colateral de una compra de productos.
              </li>
              <li>
                <strong>No son rescatables en efectivo:</strong> no existe ningún mecanismo, presente
                ni futuro, que permita al usuario convertir sus puntos en dinero, transferirlos a una
                cuenta bancaria ni obtener ningún reembolso dinerario por ellos.
              </li>
              <li>
                <strong>No son aceptados como medio de pago general:</strong> únicamente pueden
                aplicarse como descuento parcial en la propia plataforma de {SITE_CONFIG.name},
                sin posibilidad de uso en ningún otro comercio, servicio o plataforma.
              </li>
              <li>
                <strong>No representan un crédito exigible:</strong> {SITE_CONFIG.name} no contrae
                ninguna obligación dineraria frente al usuario. La posibilidad de aplicar puntos
                como descuento es una ventaja comercial revocable, no un pasivo financiero.
              </li>
            </ul>
            <p>
              Por todo ello, los puntos tienen la misma naturaleza jurídica que los cupones
              descuento, los vales de compra de un solo emisor o los saldos promocionales no
              rescatables: son <strong>meros instrumentos de descuento comercial</strong>, sin
              valor patrimonial autónomo. Esta calificación es coherente con la doctrina de la{" "}
              <LegalRef>Autoridad Bancaria Europea (EBA)</LegalRef> y con la interpretación
              consolidada del{" "}
              <LegalRef>Banco de España</LegalRef> respecto a programas de fidelización análogos
              (p. ej. millas de aerolíneas, puntos de supermercado o puntos de grandes almacenes),
              que no quedan sujetos a la normativa de servicios de pago ni a la supervisión del
              Banco de España, precisamente por carecer de valor monetario rescatable.
            </p>
            <p>
              Programas equivalentes en el mercado español —Iberia Plus, Club Carrefour,
              El Corte Inglés Puntos, programa de puntos de El Fnac— operan bajo idéntico marco
              legal sin ser considerados instrumentos financieros, lo que confirma la plena
              licitud del modelo aquí descrito.
            </p>
          </Section>

          <Section title="3. El programa de grupos es un sistema de fidelización lícito">
            <p>
              El programa de grupos de {SITE_CONFIG.name} es un{" "}
              <strong>programa de fidelización colectiva de un único nivel</strong>. Su plena
              licitud se fundamenta en los siguientes criterios, referenciados a la normativa
              aplicable:
            </p>

            <p className="font-semibold text-gray-800">
              a) El beneficio depende exclusivamente de compras reales
            </p>
            <p>
              El <LegalRef>artículo 24 de la Ley 7/1996, de 15 de enero, de Ordenación del
              Comercio Minorista</LegalRef> y el{" "}
              <LegalRef>Anexo I, punto 14 de la Directiva 2005/29/CE sobre prácticas comerciales
              desleales</LegalRef>, transpuesta por la{" "}
              <LegalRef>Ley 29/2009, de 30 de diciembre</LegalRef>, exigen que el beneficio de un
              programa de fidelización <strong>no derive principalmente de la incorporación de
              nuevos participantes</strong>, sino de la venta real de bienes y servicios. En este
              programa, <strong>si ningún miembro del grupo compra, nadie recibe punto alguno</strong>.
              Unirse a un grupo o invitar a alguien, por sí solo, no genera beneficio de ningún tipo.
            </p>

            <p className="font-semibold text-gray-800">
              b) Estructura plana de un único nivel, sin cadena
            </p>
            <p>
              El programa opera en un <strong>único nivel sin cascadas</strong>: cada usuario puede
              formar un grupo de hasta <strong>4 personas en total</strong> (el titular + 3 asociados).
              Los puntos solo se generan por las
              compras directas de esos miembros. No existe ningún mecanismo por el que los puntos
              generados por un miembro se trasladen a un tercer nivel, ni hay «uplines», «downlines»
              ni comisiones derivadas de grupos de grupos. Esta limitación estructural excluye por
              diseño cualquier dinámica de reclutamiento en cadena.
            </p>

            <p className="font-semibold text-gray-800">
              c) Sin inversión, cuota ni pago de entrada
            </p>
            <p>
              La participación es completamente gratuita. No se exige ningún pago, suscripción ni
              compra mínima obligatoria para unirse a un grupo ni para mantenerse en él.
              Los puntos obtenidos no son dinero ni valor rescatable (apartado 2), con lo que no
              existe captación de capital de ningún tipo, conforme a la{" "}
              <LegalRef>Ley 3/1991, de 10 de enero, de Competencia Desleal</LegalRef>.
            </p>

            <p className="font-semibold text-gray-800">
              d) Marco analógico: programas de fidelización colectiva reconocidos como lícitos
            </p>
            <p>
              Los programas en los que un cliente recibe un beneficio cuando otra persona del mismo
              grupo de fidelización realiza una compra son una práctica comercial ampliamente
              reconocida como lícita en España y en la Unión Europea. Entidades financieras,
              operadores de telecomunicaciones, plataformas de comercio electrónico y aseguradoras
              operan sistemas equivalentes sin que la{" "}
              <LegalRef>Comisión Nacional de los Mercados y la Competencia (CNMC)</LegalRef> ni
              ningún organismo regulador los haya calificado como prácticas desleales o ilegales,
              siempre que se cumplan los criterios descritos en los apartados anteriores, que este
              programa satisface íntegramente.
            </p>
          </Section>

          <Section title="4. Derecho de modificación y cancelación unilateral">
            <p>
              <strong>{SITE_CONFIG.name} se reserva el derecho exclusivo e irrevocable</strong> de
              modificar en cualquier momento las condiciones del programa, incluyendo el valor de
              los puntos, los ratios de acumulación, los límites de canje o la composición de
              grupos; suspender temporalmente el programa por razones técnicas, operativas,
              legales o comerciales; cancelar definitivamente el programa, con o sin previo aviso,
              sin que ello genere derecho a indemnización, compensación ni reclamación de ningún
              tipo por parte del usuario; y revocar los puntos de cualquier usuario en caso de
              detectarse uso fraudulento, abusivo o contrario a estas condiciones.
            </p>
            <p>
              La mera participación en el programa implica la aceptación plena de esta cláusula.
              Dado que los puntos no tienen valor monetario ni constituyen un activo patrimonial
              —tal como se argumenta en los apartados anteriores—, su cancelación no genera
              daño económico reclamable al amparo de la legislación de consumo ni de ninguna
              otra normativa.
            </p>
          </Section>

          <Section title="5. Exclusión de responsabilidad y reclamaciones">
            <p>
              En la medida máxima permitida por la ley aplicable,{" "}
              <strong>{SITE_CONFIG.name} no asumirá responsabilidad alguna</strong> derivada de
              la pérdida de puntos por caducidad, errores técnicos o cancelación del programa;
              del cambio en el valor de canje antes de que el usuario los utilice; de la
              imposibilidad de canjear puntos por indisponibilidad de productos o por superar
              el límite del 50 % del subtotal por pedido; o de la disolución de un grupo
              por decisión unilateral de cualquiera de las partes o de la empresa.
            </p>
            <p>
              El usuario renuncia expresamente a presentar reclamaciones relacionadas con la
              modificación, suspensión o cancelación del programa, salvo en aquellos supuestos
              en que la normativa imperativa de protección al consumidor —en particular el{" "}
              <LegalRef>Real Decreto Legislativo 1/2007, de 16 de noviembre, por el que se
              aprueba el Texto Refundido de la Ley General para la Defensa de los Consumidores
              y Usuarios (TRLGDCU)</LegalRef>— reconozca derechos irrenunciables.
            </p>
          </Section>

          <Section title="6. Política antiabuso y revisión de cuentas">
            <p>
              {SITE_CONFIG.name} monitoriza activamente el uso del programa. Se considerará uso
              abusivo, entre otros, la creación de cuentas múltiples para acumular puntos de
              forma artificial; el establecimiento de asociaciones con cuentas propias, de
              familiares directos o entidades controladas por el mismo usuario con el fin de
              generar puntos sin consumo real; la realización sistemática de compras y
              devoluciones con el objetivo de acumular puntos netos sin gasto efectivo; y
              cualquier otro comportamiento que, a juicio razonado de {SITE_CONFIG.name},
              constituya una explotación no prevista del programa.
            </p>
            <p>
              Ante la detección de abuso, {SITE_CONFIG.name} podrá, de forma inmediata y sin
              previo aviso: <strong>(a)</strong> cancelar los puntos implicados,{" "}
              <strong>(b)</strong> disolver los grupos de la cuenta,{" "}
              <strong>(c)</strong> suspender o dar de baja la cuenta, y/o{" "}
              <strong>(d)</strong> emprender las acciones legales que correspondan si el abuso
              constituyera un perjuicio económico para la empresa.
            </p>
          </Section>

          <Section title="7. Caducidad de los puntos">
            <p>
              Los puntos caducan a los <strong>24 meses</strong> desde la última actividad
              registrada en la cuenta (compra o canje). La caducidad se aplica
              automáticamente y no da lugar a reclamación ni compensación, dado que los puntos
              no representan un valor económico rescatable sino una ventaja comercial de uso
              temporal y discrecional.
            </p>
          </Section>

          <Section title="8. Exclusiones del programa">
            <p>
              El programa de puntos y grupos está disponible{" "}
              <strong>exclusivamente</strong> para cuentas de tipo cliente particular. Quedan
              excluidas las cuentas de tipo mayorista o tienda (B2B), las cuentas
              administrativas y las compras realizadas al amparo de descuentos de empleado
              u otros programas internos de la empresa.
            </p>
          </Section>

          <Section title="9. Legislación aplicable y fuero">
            <p>
              Estas condiciones se rigen por la legislación española, con referencia particular
              a la{" "}
              <LegalRef>Ley 7/1996, de 15 de enero, de Ordenación del Comercio Minorista</LegalRef>;
              la <LegalRef>Ley 3/1991, de 10 de enero, de Competencia Desleal</LegalRef>; el{" "}
              <LegalRef>Real Decreto Legislativo 1/2007 (TRLGDCU)</LegalRef>; la{" "}
              <LegalRef>Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la
              Información y del Comercio Electrónico (LSSI)</LegalRef>; y la{" "}
              <LegalRef>Directiva 2005/29/CE sobre prácticas comerciales desleales</LegalRef>{" "}
              transpuesta por la <LegalRef>Ley 29/2009, de 30 de diciembre</LegalRef>.
            </p>
            <p>
              Cualquier conflicto derivado de su interpretación o aplicación se someterá, con
              renuncia a cualquier otro fuero, a los Juzgados y Tribunales del domicilio del
              titular de la empresa, salvo que la normativa de consumo aplicable establezca un
              fuero imperativo diferente en favor del consumidor.
            </p>
            <p>
              {SITE_CONFIG.name} se reserva el derecho a actualizar estas condiciones en cualquier
              momento. La versión vigente es siempre la publicada en esta página. La continuación
              en el uso del programa tras una actualización implica la aceptación de las nuevas
              condiciones.
            </p>
          </Section>

          <div className="mt-8 border-t border-gray-100 pt-6 text-center">
            <Link
              href="/cuenta/grupo"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
            >
              ← Volver a Mi grupo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
