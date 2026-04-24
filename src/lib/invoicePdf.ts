/**
 * Genera un PDF a partir del HTML de una factura/albarán, usando el mismo
 * generador que la impresión oficial. Cliente-side puro (jspdf + html2canvas).
 *
 * Flujo:
 *  1. Renderiza `generateInvoiceHTML(data)` dentro de un iframe oculto.
 *  2. Espera a que todas las imágenes carguen (logo, marca de agua).
 *  3. Captura el nodo `.invoice-wrap` con html2canvas a 2× para calidad.
 *  4. Inserta el canvas como imagen en un jsPDF A4, añadiendo páginas si el
 *     contenido desborda.
 *  5. Devuelve el PDF como base64 (apto para adjuntar a Resend) o Blob.
 *
 * Se usa solo en cliente (el iframe/document.body). Importar de forma
 * dinámica desde componentes "use client" para evitar meter ~400 KB en
 * bundles que no generan facturas.
 */

import type { InvoiceData } from "@/utils/invoiceGenerator";
import { generateInvoiceHTML } from "@/utils/invoiceGenerator";

async function waitForImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images);
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // no bloquees el PDF si falla una imagen
          }),
    ),
  );
}

/**
 * Monta un iframe oculto, escribe el HTML completo y devuelve referencias a
 * ventana/documento/nodo objetivo. El llamante debe llamar `cleanup()` al
 * terminar para que el iframe no se quede colgando.
 */
async function mountInvoiceIframe(
  html: string,
): Promise<{
  win: Window;
  doc: Document;
  target: HTMLElement;
  cleanup: () => void;
}> {
  const iframe = document.createElement("iframe");
  // Lo sacamos del flujo visual sin display:none (display:none desactiva
  // layout y html2canvas capta 0x0). Lo dejamos fijo off-screen, opacidad 0.
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;pointer-events:none;";
  // A4 @ 96dpi ≈ 794×1123; 820×1160 deja margen para que entre el wrapper
  // con sus padding sin forzar scrollbars.
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument ?? win?.document;
  if (!win || !doc) {
    iframe.remove();
    throw new Error("No se pudo abrir el iframe de previsualización PDF");
  }

  const origin = window.location.origin;
  const htmlWithBase = html.replace("<head>", `<head><base href="${origin}/">`);
  doc.open();
  doc.write(htmlWithBase);
  doc.close();

  // Espera a que el DOM esté listo + imágenes cargadas.
  if (doc.readyState !== "complete") {
    await new Promise<void>((resolve) => {
      const onLoad = () => resolve();
      if (doc.readyState === "complete") resolve();
      else win.addEventListener("load", onLoad, { once: true });
    });
  }
  await waitForImages(doc);
  // Pequeña espera adicional para que fuentes web (si las hubiera) pinten.
  await new Promise((r) => setTimeout(r, 150));

  const target =
    (doc.querySelector(".invoice-wrap") as HTMLElement | null) ?? doc.body;

  return {
    win,
    doc,
    target,
    cleanup: () => {
      try {
        iframe.remove();
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Genera el PDF de una factura/albarán y lo devuelve como base64 SIN
 * prefijo `data:application/pdf;base64,`. Formato exigido por la API de
 * Resend en `attachments[].content`.
 */
export async function generateInvoicePdfBase64(
  data: InvoiceData,
): Promise<string> {
  const html = generateInvoiceHTML(data);
  const { doc, target, cleanup } = await mountInvoiceIframe(html);

  try {
    // Imports dinámicos → el coste (~400 KB) solo lo paga quien adjunta PDF.
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const canvas = await html2canvas(target, {
      scale: 2, // mejor nitidez en impresión
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      // html2canvas recorre el documento del iframe
      windowWidth: doc.documentElement.scrollWidth,
      windowHeight: doc.documentElement.scrollHeight,
    });

    // A4: 210 × 297 mm. Ancho útil = 210, lo convertimos a la proporción
    // del canvas. Si supera 297 mm, partimos en varias páginas.
    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
      compress: true,
    });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    const img = canvas.toDataURL("image/jpeg", 0.92);

    if (imgH <= pageH) {
      pdf.addImage(img, "JPEG", 0, 0, imgW, imgH);
    } else {
      // Pagina: desplaza el offset Y en sucesivas páginas hasta cubrir imgH
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(img, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH; // queda negativo: "scroll" de la imagen
        pdf.addPage();
        pdf.addImage(img, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
    }

    // jsPDF entrega el arraybuffer; de ahí a base64 sin el prefijo data:
    const arrayBuffer = pdf.output("arraybuffer") as ArrayBuffer;
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunk)),
      );
    }
    return btoa(binary);
  } finally {
    cleanup();
  }
}

/**
 * Variante que devuelve Blob (p. ej. para descargas "Guardar como…" o para
 * subir a un endpoint interno). No se usa aún — queda preparada.
 */
export async function generateInvoicePdfBlob(
  data: InvoiceData,
): Promise<Blob> {
  const base64 = await generateInvoicePdfBase64(data);
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "application/pdf" });
}
