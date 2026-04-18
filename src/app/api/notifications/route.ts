import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

// POST /api/notifications — Send notification to customer
// Used internally when order status changes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status, customerEmail, customerName, tracking, note } = body;

    if (!orderId || !status || !customerEmail) {
      return NextResponse.json(
        { error: "Datos de notificación incompletos" },
        { status: 400 },
      );
    }

    const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

    // Build email content based on status
    const templates: Record<string, { subject: string; body: string }> = {
      enviado: {
        subject: `Tu pedido ${orderId} ha sido enviado`,
        body: `Hola ${customerName ?? ""},\n\nTu pedido ${orderId} ha sido enviado.${tracking ? `\n\nNúmero de seguimiento: ${tracking}\nPuedes rastrear tu envío en: https://www.gls-spain.es/seguimiento/${tracking}` : ""}\n\nGracias por comprar en TCG Academy.`,
      },
      cancelado: {
        subject: `Tu pedido ${orderId} ha sido cancelado`,
        body: `Hola ${customerName ?? ""},\n\nTu pedido ${orderId} ha sido cancelado.${note ? `\n\nMotivo: ${note}` : ""}\n\nSi tienes preguntas, contacta con nosotros.\n\nTCG Academy`,
      },
      incidencia: {
        subject: `Incidencia con tu pedido ${orderId}`,
        body: `Hola ${customerName ?? ""},\n\nHemos detectado una incidencia con tu pedido ${orderId}.${note ? `\n\nDetalle: ${note}` : ""}\n\nEstamos trabajando para resolverlo. Te mantendremos informado.\n\nTCG Academy`,
      },
      confirmacion: {
        subject: `Confirmación de pedido ${orderId}`,
        body: `Hola ${customerName ?? ""},\n\n¡Gracias por tu compra! Tu pedido ${orderId} ha sido registrado correctamente.\n\nTe avisaremos cuando lo enviemos.\n\nTCG Academy`,
      },
    };

    const template = templates[status] ?? templates.confirmacion;

    if (backendMode === "server") {
      // TODO: Use getEmailService().sendEmail(customerEmail, template.subject, template.body)
      // TODO: Also send to admin email from getDb().getSettings().adminEmail

      return NextResponse.json({
        ok: true,
        sent: false,
        message: "Email service no configurado. Configurar RESEND_API_KEY.",
      });
    }

    // Local mode: notification is handled client-side (localStorage)
    return NextResponse.json({
      ok: true,
      template: template.subject,
      message: "Modo local: notificación gestionada en cliente.",
    });
  } catch {
    return NextResponse.json(
      { error: "Error al enviar notificación" },
      { status: 500 },
    );
  }
}
