// ── GLS Carrier Integration ───────────────────────────────────────────────────
// Mock interface ready to connect to GLS Spain API.
// Replace the mock methods with real API calls when credentials are available.
//
// GLS Spain developer docs: https://www.gls-spain.es/es/
// Typical flow: POST /CreatePickup → get tracking number → GET /GetParcelStatus

export interface GLSParcelStatus {
  trackingNumber: string;
  status: "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "EXCEPTION" | "UNKNOWN";
  statusDescription: string;
  estimatedDelivery: string | null;
  lastEvent: string;
  lastEventDate: string;
  trackingUrl: string;
}

export interface GLSShipmentRequest {
  orderId: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPostcode: string;
  recipientCountry: string;
  recipientPhone: string;
  weight: number;
  /** Number of parcels in the shipment */
  parcels: number;
  reference?: string;
}

export interface GLSShipmentResult {
  trackingNumber: string;
  labelUrl: string | null;
}

export function getGLSTrackingUrl(trackingNumber: string): string {
  return `https://www.gls-spain.es/es/seguimiento-envios/?match=${encodeURIComponent(trackingNumber)}`;
}

// ── Mock implementation (replace with real GLS API calls) ────────────────────

export async function createGLSShipment(
  request: GLSShipmentRequest,
): Promise<GLSShipmentResult> {
  // TODO: Replace with real GLS API call
  // POST https://api.gls-spain.es/v1/shipments
  // Headers: Authorization: Bearer <API_KEY>
  const mockTracking = `GLS${Date.now().toString().slice(-10)}`;
  return {
    trackingNumber: mockTracking,
    labelUrl: null,
  };
}

export async function getGLSParcelStatus(
  trackingNumber: string,
): Promise<GLSParcelStatus> {
  // TODO: Replace with real GLS API call
  // GET https://api.gls-spain.es/v1/parcels/{trackingNumber}/status
  return {
    trackingNumber,
    status: "IN_TRANSIT",
    statusDescription: "En tránsito",
    estimatedDelivery: null,
    lastEvent: "Paquete recibido en almacén GLS",
    lastEventDate: new Date().toISOString(),
    trackingUrl: getGLSTrackingUrl(trackingNumber),
  };
}
