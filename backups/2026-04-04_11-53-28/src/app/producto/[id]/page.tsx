// Product detail page for admin-created products.
// Admin-created IDs are Date.now() values (≈ 1.7 trillion) — they cannot be
// enumerated at build time. We use a placeholder param so the shell HTML is
// generated, then resolve the actual product on the client via localStorage.
// dynamicParams = false → any unknown id reuses the generated shell HTML
// (the client component handles "not found" gracefully).
import ProductoClient from "./ProductoClient";

export const dynamicParams = false;

export function generateStaticParams() {
  // Placeholder ensures the shell page is generated at build time.
  // Real product IDs are resolved client-side from localStorage.
  return [{ id: "0" }];
}

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductoClient id={id} />;
}
