/**
 * Accessibility helpers.
 *
 * When a non-interactive element (`<div>`, `<span>`) must act as a button,
 * spread `clickableProps(handler)` so it matches the ARIA button pattern:
 * receives focus, responds to Enter / Space, and is announced as "button"
 * by screen readers. Visual appearance stays untouched.
 */

import type { KeyboardEvent, SyntheticEvent } from "react";

type Handler = (e?: SyntheticEvent) => void;

export interface ClickableProps {
  role: "button";
  tabIndex: 0;
  onClick: Handler;
  onKeyDown: (e: KeyboardEvent) => void;
}

/**
 * Spread on a non-interactive element that has click behaviour.
 * Keeps the original handler; adds keyboard activation (Enter / Space)
 * and exposes the element to assistive tech as a button.
 */
export function clickableProps(handler: Handler): ClickableProps {
  return {
    role: "button",
    tabIndex: 0,
    onClick: handler,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handler(e);
      }
    },
  };
}
