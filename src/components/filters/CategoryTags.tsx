"use client";
import { useState } from "react";
import Link from "next/link";

export interface TagItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
}

interface CategoryTagsProps {
  items: TagItem[];
  activeId: string | null;
  color?: string;
  maxCollapsed?: number;
}

function TagPill({
  item,
  isActive,
  color,
  className = "",
}: {
  item: TagItem;
  isActive: boolean;
  color: string;
  className?: string;
}) {
  const cls = [
    "rounded-full border-2 text-xs px-2.5 py-1 min-h-[32px] sm:text-sm sm:px-3 sm:py-1.5 font-semibold transition whitespace-nowrap",
    isActive
      ? "text-white border-transparent"
      : "border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const style = isActive
    ? { backgroundColor: color, borderColor: color }
    : undefined;

  if (item.href) {
    return (
      <Link href={item.href} className={cls} style={style}>
        {item.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={item.onClick} className={cls} style={style}>
      {item.label}
    </button>
  );
}

export function CategoryTags({
  items,
  activeId,
  color = "#2563eb",
  maxCollapsed = 8,
}: CategoryTagsProps) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = items.length > maxCollapsed;
  const visibleItems = hasOverflow ? items.slice(0, maxCollapsed) : items;
  const overflowItems = hasOverflow ? items.slice(maxCollapsed) : [];

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleItems.map((item) => (
        <TagPill
          key={item.id}
          item={item}
          isActive={item.id === activeId}
          color={color}
        />
      ))}
      {overflowItems.map((item) => (
        <TagPill
          key={item.id}
          item={item}
          isActive={item.id === activeId}
          color={color}
          className={expanded ? "" : "hidden md:inline-flex"}
        />
      ))}
      {hasOverflow && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="md:hidden min-h-[32px] rounded-full border-2 border-dashed border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-500 transition hover:border-gray-400"
        >
          +{overflowItems.length} más
        </button>
      )}
    </div>
  );
}
