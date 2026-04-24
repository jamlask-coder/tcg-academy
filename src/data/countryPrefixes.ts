/**
 * SSOT de países soportados para teléfono + dirección fiscal.
 *
 * Se usa en dos puntos de creación de ID-Usuario:
 *  1. `/admin/fiscal/nueva-factura` — admin genera factura a cliente nuevo
 *  2. `/registro` — alta pública de usuario
 *
 * La lista está curada (20 entradas = 19 países + "Otro país") priorizando
 * mercados con más probabilidad de comprar productos desde España:
 *  - España + vecinos UE (IVA intracomunitario)
 *  - Europa no-UE relevante (GB, CH, NO, AD)
 *  - USA (mercado TCG grande)
 *
 * `isEU` controla cálculo de IVA intracomunitario (Art. 25 LIVA).
 * La bandera se renderiza vía flagcdn.com a partir del código ISO alpha-2.
 */

export interface CountryOption {
  code: string;       // ISO 3166-1 alpha-2 ("ES", "PT"...) o "OTRO"
  name: string;       // nombre en español
  isEU: boolean;      // miembro UE ⇒ determina IVA intracomunitario
  dialCode: string;   // prefijo telefónico E.164 ("+34", "+351"...)
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "ES", name: "España",         isEU: true,  dialCode: "+34"  },
  { code: "PT", name: "Portugal",       isEU: true,  dialCode: "+351" },
  { code: "FR", name: "Francia",        isEU: true,  dialCode: "+33"  },
  { code: "IT", name: "Italia",         isEU: true,  dialCode: "+39"  },
  { code: "DE", name: "Alemania",       isEU: true,  dialCode: "+49"  },
  { code: "NL", name: "Países Bajos",   isEU: true,  dialCode: "+31"  },
  { code: "BE", name: "Bélgica",        isEU: true,  dialCode: "+32"  },
  { code: "IE", name: "Irlanda",        isEU: true,  dialCode: "+353" },
  { code: "AT", name: "Austria",        isEU: true,  dialCode: "+43"  },
  { code: "PL", name: "Polonia",        isEU: true,  dialCode: "+48"  },
  { code: "SE", name: "Suecia",         isEU: true,  dialCode: "+46"  },
  { code: "DK", name: "Dinamarca",      isEU: true,  dialCode: "+45"  },
  { code: "FI", name: "Finlandia",      isEU: true,  dialCode: "+358" },
  { code: "GR", name: "Grecia",         isEU: true,  dialCode: "+30"  },
  { code: "AD", name: "Andorra",        isEU: false, dialCode: "+376" },
  { code: "GB", name: "Reino Unido",    isEU: false, dialCode: "+44"  },
  { code: "CH", name: "Suiza",          isEU: false, dialCode: "+41"  },
  { code: "NO", name: "Noruega",        isEU: false, dialCode: "+47"  },
  { code: "US", name: "Estados Unidos", isEU: false, dialCode: "+1"   },
  { code: "OTRO", name: "Otro país",    isEU: false, dialCode: "+"    },
];

/**
 * URL de la bandera del país (flagcdn.com, gratuito, sin dependencias).
 * Devuelve cadena vacía para "OTRO" (no hay bandera — la UI usa emoji 🌍).
 */
export function getFlagUrl(isoCode: string): string {
  if (!isoCode || isoCode === "OTRO") return "";
  return `https://flagcdn.com/w40/${isoCode.toLowerCase()}.png`;
}

/** Busca la opción por código; devuelve la primera (ES) si no existe. */
export function findCountryOption(code: string): CountryOption {
  return COUNTRY_OPTIONS.find((c) => c.code === code) ?? COUNTRY_OPTIONS[0];
}

/** Nombre del país por código, para snapshots de factura. */
export function getCountryName(code: string): string {
  return findCountryOption(code).name;
}
