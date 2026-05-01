"use client";
import { BookOpen, ChevronRight } from "lucide-react";

interface Section {
  id: string;
  title: string;
  content: { heading?: string; text: string }[];
}

const SECTIONS: Section[] = [
  {
    id: "dashboard",
    title: "Panel principal",
    content: [
      {
        text: "El panel principal muestra un resumen en tiempo real de las métricas más importantes de TCG Academy.",
      },
      {
        heading: "KPIs principales",
        text: "Las 4 tarjetas superiores muestran: ingresos del día, total de productos, usuarios registrados y descuentos activos. Los valores se calculan automáticamente desde los datos.",
      },
      {
        heading: "Gráfica de ventas",
        text: "Muestra las ventas de los últimos 7 días mediante un gráfico de barras. Los datos provienen de los pedidos reales (readAdminOrdersMerged).",
      },
      {
        heading: "Alertas",
        text: "Aparecen automáticamente cuando hay productos sin stock, cupones a punto de caducar o pedidos pendientes. Cada alerta incluye un enlace directo a la sección correspondiente.",
      },
      {
        heading: "Últimos pedidos",
        text: "Tabla con los 5 pedidos más recientes. Haz clic en 'Ver todos' para ir a la gestión completa de pedidos.",
      },
    ],
  },
  {
    id: "productos",
    title: "Gestión de productos",
    content: [
      {
        text: "Desde /admin/productos puedes consultar y editar los precios de todos los artículos del catálogo.",
      },
      {
        heading: "Tres niveles de precio",
        text: "Cada producto tiene: precio público (mostrado en tienda), precio mayorista (clientes con rol 'mayorista') y precio tienda (clientes con rol 'tienda'). Edita los campos directamente en la tabla.",
      },
      {
        heading: "Guardar cambios",
        text: "Los cambios se guardan en memoria durante la sesión. En una integración real, se enviarían a WooCommerce vía API REST.",
      },
      {
        heading: "Estado de stock",
        text: "La columna 'Stock' muestra si el producto está disponible. Los productos sin stock aparecen en el dashboard como alerta.",
      },
    ],
  },
  {
    id: "descuentos",
    title: "Descuentos por juego",
    content: [
      {
        text: "Los descuentos se aplican globalmente por juego o categoría. Son distintos de los cupones individuales.",
      },
      {
        heading: "Activar/desactivar",
        text: "Usa el toggle de cada fila para activar o desactivar un descuento. Los cambios se reflejan inmediatamente en el catálogo y carrito.",
      },
      {
        heading: "Tipo de descuento",
        text: "Puedes configurar descuentos en porcentaje (%) o cantidad fija (€). El tipo 'percent' es el más habitual para promociones de temporada.",
      },
      {
        heading: "DiscountContext",
        text: "Los descuentos se gestionan mediante el contexto global DiscountContext, que persiste en localStorage. Todos los componentes de la tienda leen de este contexto.",
      },
    ],
  },
  {
    id: "pedidos",
    title: "Gestión de pedidos",
    content: [
      {
        text: "La sección de pedidos permite gestionar todo el ciclo de vida de cada orden, desde su creación hasta la entrega.",
      },
      {
        heading: "Flujo de estados",
        text: "Los pedidos siguen el flujo: pendiente de envío → enviado (estado final de nuestro lado; la entrega depende del transportista). Pueden marcarse como cancelado, incidencia o devolución en cualquier momento.",
      },
      {
        heading: "Avanzar estado",
        text: "El botón 'Avanzar estado' en cada fila mueve el pedido al siguiente estado. Al marcar como 'enviado', se despliega un campo para introducir el número de seguimiento.",
      },
      {
        heading: "Número de seguimiento",
        text: "Al confirmar el envío, el número de tracking queda guardado en el pedido y se muestra al cliente en su panel de cuenta. Formato recomendado: ES + fecha + secuencia (ej. ES2025012800001).",
      },
      {
        heading: "Expandir fila",
        text: "Haz clic en cualquier fila para ver el detalle del pedido: productos, dirección y tracking. Haz clic de nuevo para colapsar.",
      },
      {
        heading: "Filtros",
        text: "Usa el buscador por ID/cliente y el selector de estado para filtrar la lista de pedidos.",
      },
    ],
  },
  {
    id: "usuarios",
    title: "Gestión de usuarios",
    content: [
      {
        text: "Aquí puedes ver todos los usuarios registrados y gestionar sus roles y permisos.",
      },
      {
        heading: "Roles disponibles",
        text: "Hay 4 roles: cliente (precio estándar), mayorista (precio mayorista), tienda (precio tienda) y admin (acceso al panel de administración). Cambia el rol con los botones del panel lateral.",
      },
      {
        heading: "Panel de detalle",
        text: "Haz clic en cualquier usuario para ver su panel: fecha de registro, total de pedidos, gasto total y puntos acumulados.",
      },
      {
        heading: "Filtros",
        text: "Busca por nombre o email con la barra de búsqueda. Filtra por rol con el selector desplegable. Las tarjetas superiores muestran el conteo por rol.",
      },
    ],
  },
  {
    id: "cupones",
    title: "Gestión de cupones",
    content: [
      {
        text: "Los cupones son códigos de descuento individuales que los clientes pueden introducir al comprar.",
      },
      {
        heading: "Crear cupón",
        text: "Haz clic en 'Nuevo cupón' para desplegar el formulario. Los campos obligatorios son: código, descripción y fecha de fin. El botón 'Auto' genera un código aleatorio con prefijo TCG.",
      },
      {
        heading: "Tipos de descuento",
        text: "Porcentaje (%): reduce el total en un porcentaje. Fijo (€): resta una cantidad exacta.",
      },
      {
        heading: "Aplicable a",
        text: "Puedes limitar el cupón a todo el catálogo, a un juego específico o a una categoría específica.",
      },
      {
        heading: "Activar/desactivar",
        text: "Usa el icono de toggle para activar o desactivar un cupón sin eliminarlo. Un cupón inactivo no puede ser usado por los clientes.",
      },
      {
        heading: "Estadísticas",
        text: "Cada cupón muestra el número de usos actuales vs. el máximo permitido, y el total de euros ahorrados por los clientes.",
      },
    ],
  },
  {
    id: "bonos",
    title: "Bonos y puntos de fidelidad",
    content: [
      {
        text: "El programa de fidelidad permite a los clientes acumular puntos con sus compras y canjearlos por descuentos.",
      },
      {
        heading: "Puntos por euro",
        text: "Configura cuántos puntos gana el cliente por cada euro gastado en PRODUCTOS (envío y descuento por puntos no cuentan). Valor por defecto: 100 pts/€, con canje 10.000 pts = €1 (cashback efectivo del 1%). Cambios con impacto económico global — requiere confirmación fuerte.",
      },
      {
        heading: "Tabla de canje",
        text: "Define los tramos de canje: N puntos = M euros de descuento. Edita directamente los valores en la tabla y guarda los cambios.",
      },
      {
        heading: "Ranking de puntos",
        text: "Muestra los 5 clientes con más puntos acumulados. Útil para identificar clientes VIP.",
      },
      {
        heading: "Añadir puntos manualmente",
        text: "Selecciona un usuario e introduce la cantidad para añadir puntos manualmente (ej. por compensación, premio, evento).",
      },
    ],
  },
  {
    id: "emails",
    title: "Plantillas de email",
    content: [
      {
        text: "Gestiona las plantillas HTML que se envían a los clientes en los distintos eventos del sistema.",
      },
      {
        heading: "Vista previa",
        text: "La pestaña 'Vista previa' renderiza el email en un iframe para ver cómo se verá en el cliente de correo del destinatario.",
      },
      {
        heading: "Editar",
        text: "En la pestaña 'Editar' puedes modificar el asunto y el HTML completo de la plantilla. Los cambios se guardan en memoria.",
      },
      {
        heading: "Variables",
        text: "Cada plantilla indica las variables disponibles en formato {{nombre_variable}}. Estas se reemplazan con datos reales al enviar el email.",
      },
      {
        heading: "Enviar prueba",
        text: "El botón 'Enviar prueba' simula el envío de la plantilla seleccionada a la dirección configurada en el sistema.",
      },
      {
        heading: "Log de envíos",
        text: "La pestaña 'Log' muestra el historial de emails enviados con fecha, destinatario, plantilla usada y estado del envío.",
      },
    ],
  },
  {
    id: "herramientas",
    title: "Herramientas y exportaciones",
    content: [
      {
        text: "Herramientas de utilidad para exportar datos y monitorizar el estado del sistema.",
      },
      {
        heading: "Exportar CSV",
        text: "Exporta el catálogo de productos, la lista de usuarios o todos los pedidos en formato CSV. Los ficheros se descargan directamente en el navegador.",
      },
      {
        heading: "Estadísticas",
        text: "Resumen de métricas generales: ingresos totales, ticket medio, productos en stock, usuarios activos y puntos emitidos.",
      },
      {
        heading: "Estado del sistema",
        text: "Muestra el estado operativo de los servicios conectados (base de datos, email, pasarela de pago, CDN). Haz clic en 'Actualizar' para refrescar.",
      },
    ],
  },
];

const TOC = SECTIONS.map(({ id, title }) => ({ id, title }));

export default function AdminManualPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BookOpen size={22} className="text-[#2563eb]" /> Manual de
          administración
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Guía completa del panel de TCG Academy
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* TOC */}
        <div className="lg:col-span-1">
          <div className="sticky top-36 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Índice
              </p>
            </div>
            <nav className="divide-y divide-gray-100">
              {TOC.map(({ id, title }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="flex min-h-[44px] items-center gap-2 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50 hover:text-[#2563eb]"
                >
                  <ChevronRight
                    size={12}
                    className="flex-shrink-0 text-gray-400"
                  />
                  {title}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 lg:col-span-3">
          {SECTIONS.map(({ id, title, content }) => (
            <div
              key={id}
              id={id}
              className="scroll-mt-36 rounded-2xl border border-gray-200 bg-white p-6"
            >
              <h2 className="mb-4 border-b border-gray-100 pb-3 text-lg font-bold text-gray-900">
                {title}
              </h2>
              <div className="space-y-4">
                {content.map(({ heading, text }, i) => (
                  <div key={i}>
                    {heading && (
                      <h3 className="mb-1 text-sm font-bold text-[#2563eb]">
                        {heading}
                      </h3>
                    )}
                    <p className="text-sm leading-relaxed text-gray-600">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
            <p className="text-sm font-medium text-blue-700">
              ¿Necesitas ayuda adicional? Contacta con el equipo técnico en{" "}
              <a
                href="mailto:dev@tcgacademy.es"
                className="font-bold hover:underline"
              >
                dev@tcgacademy.es
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
