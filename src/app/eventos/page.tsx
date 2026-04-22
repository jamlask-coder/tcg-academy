import { Calendar } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Eventos — TCG Academy" };

export default function EventosPage() {
  return (
    <div className="mx-auto flex max-w-[700px] flex-col items-center px-6 py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
        <Calendar size={28} />
      </div>
      <h1 className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl">
        Eventos
      </h1>
      <p className="text-base text-gray-500">En construcción</p>
    </div>
  );
}
