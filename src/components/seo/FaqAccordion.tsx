"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/lib/seo";

interface Props {
  items: FaqItem[];
}

export function FaqAccordion({ items }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <ul className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
      {items.map((it, idx) => {
        const isOpen = openIdx === idx;
        return (
          <li key={it.question}>
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold text-gray-900 sm:text-base">
                {it.question}
              </span>
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-4">
                <p className="text-sm leading-relaxed text-gray-600">
                  {it.answer}
                </p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
