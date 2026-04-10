"use client";
import { Suspense } from "react";
import { ProductoDetail } from "./ProductoDetail";

export default function ProductoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <ProductoDetail />
    </Suspense>
  );
}
