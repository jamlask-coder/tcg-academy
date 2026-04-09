import type { ReactNode, CSSProperties } from "react";

/**
 * Single source of truth for the site's max-width and horizontal padding.
 * Every stripe in the layout (topbar, header, navbar, content, footer)
 * uses this component as its inner wrapper so all left/right edges align.
 */
export function Container({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-[1400px] px-6 ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}
