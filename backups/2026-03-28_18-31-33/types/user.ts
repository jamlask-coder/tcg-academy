export type UserRole = "cliente" | "mayorista" | "tienda" | "admin"

export interface Address {
  id: string
  label: string           // "Casa", "Trabajo", etc.
  nombre: string
  apellidos: string
  calle: string
  numero: string
  piso?: string
  cp: string
  ciudad: string
  provincia: string
  pais: string
  telefono?: string
  predeterminada: boolean
}

export interface BillingInfo {
  nif: string
  razonSocial?: string
  calle: string
  cp: string
  ciudad: string
  provincia: string
  pais: string
}

export interface User {
  id: string
  email: string
  name: string
  lastName: string
  phone: string
  role: UserRole
  addresses: Address[]
  billing?: BillingInfo
  // empresa fields (mayorista / tienda only)
  empresa?: {
    cif: string
    razonSocial: string
    direccionFiscal: string
    personaContacto: string
    telefonoEmpresa: string
    emailFacturacion: string
  }
  createdAt: string
  favorites: number[]     // product IDs
}

export interface RegisterData {
  email: string
  password: string
  name: string
  lastName: string
  phone: string
  address: Omit<Address, "id" | "predeterminada" | "label">
}
