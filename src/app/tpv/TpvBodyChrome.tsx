"use client";

import { useEffect } from "react";

/**
 * Pone `body.tpv-mode` mientras el TPV está montado para que las reglas CSS
 * de `globals.css` oculten Header/Navbar/Footer/CookieConsent/Promo público.
 * Al desmontar (navegar a otra ruta) limpia la clase para devolver la chrome.
 */
export default function TpvBodyChrome() {
  useEffect(() => {
    document.body.classList.add("tpv-mode");
    return () => {
      document.body.classList.remove("tpv-mode");
    };
  }, []);
  return null;
}
