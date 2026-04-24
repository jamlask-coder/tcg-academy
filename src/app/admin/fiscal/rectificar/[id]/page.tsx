import RectificarClient from "./RectificarClient";

// Las facturas viven en localStorage (cliente) — no hay ID conocido en build
// time. Delegamos al cliente para cargar por ID desde el libro.
export default async function RectificarFacturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RectificarClient invoiceId={id} />;
}
