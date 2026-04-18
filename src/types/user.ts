export type UserRole = "cliente" | "mayorista" | "tienda" | "admin";

export interface Address {
  id: string;
  label: string; // "Casa", "Trabajo", etc. — texto libre introducido por el cliente
  nombre?: string;
  apellidos?: string;
  calle: string;
  numero: string;
  piso?: string;
  cp: string;
  ciudad: string;
  provincia: string;
  pais: string;
  telefono?: string;
  predeterminada: boolean;
}

export interface BillingInfo {
  nif: string;
  razonSocial?: string;
  calle: string;
  cp: string;
  ciudad: string;
  provincia: string;
  pais: string;
}

export type UserGender = "M" | "F" | "X"; // M=varón, F=mujer, X=prefiero no decirlo

export interface User {
  id: string;
  email: string;
  username?: string;   // unique @handle, optional (not set for demo/legacy users)
  name: string;
  lastName: string;
  phone: string;
  gender?: UserGender;
  role: UserRole;
  /**
   * NIF / NIE / CIF del usuario — OBLIGATORIO para emitir facturas
   * conforme al Art. 6.1.d RD 1619/2012. Validado con `validateSpanishNIF`.
   */
  nif?: string;
  /** Tipo del identificador fiscal, detectado automáticamente */
  nifType?: "DNI" | "NIE" | "CIF";
  addresses: Address[];
  billing?: BillingInfo;
  // empresa fields (mayorista / tienda only)
  empresa?: {
    cif: string;
    razonSocial: string;
    direccionFiscal: string;
    personaContacto: string;
    telefonoEmpresa: string;
    emailFacturacion: string;
  };
  createdAt: string;
  birthDate?: string; // YYYY-MM-DD
  favorites: number[]; // product IDs
  referralCode?: string; // this user's own referral code
  referredBy?: string;   // referral code of the person who referred them
}

export interface RegisterData {
  email: string;
  username?: string;
  password: string;
  name: string;
  lastName: string;
  phone: string;
  gender?: UserGender;
  address: Omit<Address, "id" | "predeterminada" | "label">;
  referralCode?: string;
  marketingConsent?: boolean;
}
