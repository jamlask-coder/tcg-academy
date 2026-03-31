import { PedidoDetailClient } from "@/components/account/PedidoDetailClient";

// Static export requires generateStaticParams.
export function generateStaticParams() {
  return [
    { id: "TCG-20250128-001" },
    { id: "TCG-20250115-002" },
    { id: "TCG-20241230-003" },
    { id: "TCG-20241201-004" },
  ];
}

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PedidoDetailClient id={id} />;
}
