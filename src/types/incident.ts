export type IncidentStatus = "nueva" | "en_gestion" | "resuelta";

export interface Incident {
  id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: string;
  typeLabel: string;
  detail: string;
  photos: string[];   // base64 data URLs
  status: IncidentStatus;
  createdAt: string;  // ISO
  reply?: string;
  repliedAt?: string; // ISO
}
