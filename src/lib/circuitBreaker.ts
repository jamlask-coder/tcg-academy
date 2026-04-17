/**
 * Circuit Breaker + Dead Letter Queue — Resiliencia ante fallos externos.
 *
 * Escenarios:
 *   - VeriFactu API caída → las facturas se encolan y se reenvían cuando vuelva
 *   - Email service caído → los emails se encolan
 *   - Payment gateway timeout → el pedido se marca como "pendiente_verificar"
 *   - localStorage lleno → operaciones críticas van a sessionStorage temporal
 *
 * Estados del circuit breaker:
 *   CLOSED  → todo funciona normal
 *   OPEN    → servicio caído, las llamadas se rechazan inmediatamente
 *   HALF    → intentando reconectar (permite 1 llamada de prueba)
 */

import { safeRead, safeWrite } from "@/lib/safeStorage";
import { logger } from "@/lib/logger";

// ─── Circuit Breaker ────────────────────────────────────────────────────────

type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  lastSuccess: number;
}

const CIRCUIT_KEY = "tcgacademy_circuits";
const DEFAULT_THRESHOLD = 3; // Failures before opening
const DEFAULT_TIMEOUT = 30_000; // 30s before trying half-open

function loadCircuits(): Record<string, CircuitBreakerState> {
  return safeRead<Record<string, CircuitBreakerState>>(CIRCUIT_KEY, {});
}

function saveCircuits(circuits: Record<string, CircuitBreakerState>): void {
  safeWrite(CIRCUIT_KEY, circuits);
}

function getCircuit(name: string): CircuitBreakerState {
  const circuits = loadCircuits();
  return circuits[name] ?? {
    state: "closed",
    failures: 0,
    lastFailure: 0,
    lastSuccess: Date.now(),
  };
}

function updateCircuit(name: string, state: CircuitBreakerState): void {
  const circuits = loadCircuits();
  circuits[name] = state;
  saveCircuits(circuits);
}

/**
 * Execute a function with circuit breaker protection.
 * If the circuit is open, returns the fallback immediately.
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  fallback: T,
  options?: {
    threshold?: number;
    timeout?: number;
  },
): Promise<{ result: T; fromFallback: boolean }> {
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const circuit = getCircuit(name);

  // If open, check if enough time has passed to try half-open
  if (circuit.state === "open") {
    if (Date.now() - circuit.lastFailure > timeout) {
      circuit.state = "half-open";
      updateCircuit(name, circuit);
    } else {
      logger.warn(`Circuit "${name}" is OPEN — using fallback`, "circuitBreaker");
      return { result: fallback, fromFallback: true };
    }
  }

  try {
    const result = await fn();
    // Success — reset circuit
    circuit.state = "closed";
    circuit.failures = 0;
    circuit.lastSuccess = Date.now();
    updateCircuit(name, circuit);
    return { result, fromFallback: false };
  } catch {
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= threshold) {
      circuit.state = "open";
      logger.error(
        `Circuit "${name}" OPENED after ${circuit.failures} failures`,
        "circuitBreaker",
      );
    }

    updateCircuit(name, circuit);
    return { result: fallback, fromFallback: true };
  }
}

/** Get current state of all circuits */
export function getCircuitStates(): Record<string, CircuitBreakerState> {
  return loadCircuits();
}

/** Manually reset a circuit (admin action) */
export function resetCircuit(name: string): void {
  updateCircuit(name, {
    state: "closed",
    failures: 0,
    lastFailure: 0,
    lastSuccess: Date.now(),
  });
}

// ─── Dead Letter Queue ──────────────────────────────────────────────────────

export interface DeadLetterItem {
  id: string;
  createdAt: string;
  type: "invoice_send" | "email_send" | "payment_verify" | "stock_update" | "points_award";
  payload: Record<string, unknown>;
  attempts: number;
  lastAttempt: string | null;
  lastError: string | null;
  status: "pending" | "retrying" | "failed" | "resolved";
}

const DLQ_KEY = "tcgacademy_dlq";
const MAX_DLQ = 100;
const MAX_RETRIES = 5;

function loadDLQ(): DeadLetterItem[] {
  return safeRead<DeadLetterItem[]>(DLQ_KEY, []);
}

function saveDLQ(items: DeadLetterItem[]): void {
  if (items.length > MAX_DLQ) items.length = MAX_DLQ;
  safeWrite(DLQ_KEY, items);
}

/**
 * Add a failed operation to the dead letter queue.
 * It will be retried automatically or manually by an admin.
 */
export function enqueueDeadLetter(
  type: DeadLetterItem["type"],
  payload: Record<string, unknown>,
  error: string,
): string {
  const items = loadDLQ();
  const id = `dlq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  items.unshift({
    id,
    createdAt: new Date().toISOString(),
    type,
    payload,
    attempts: 1,
    lastAttempt: new Date().toISOString(),
    lastError: error,
    status: "pending",
  });
  saveDLQ(items);
  logger.warn(`Dead letter queued: ${type} (${id})`, "dlq", { error });
  return id;
}

/**
 * Get all items in the dead letter queue.
 */
export function getDeadLetterQueue(
  status?: DeadLetterItem["status"],
): DeadLetterItem[] {
  const items = loadDLQ();
  return status ? items.filter((i) => i.status === status) : items;
}

/**
 * Mark a dead letter as resolved (manually by admin).
 */
export function resolveDeadLetter(id: string): void {
  const items = loadDLQ();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.status = "resolved";
    saveDLQ(items);
  }
}

/**
 * Retry a dead letter item with a given handler.
 */
export async function retryDeadLetter(
  id: string,
  handler: (payload: Record<string, unknown>) => Promise<void>,
): Promise<boolean> {
  const items = loadDLQ();
  const item = items.find((i) => i.id === id);
  if (!item || item.status === "resolved") return false;

  if (item.attempts >= MAX_RETRIES) {
    item.status = "failed";
    saveDLQ(items);
    return false;
  }

  item.attempts++;
  item.lastAttempt = new Date().toISOString();
  item.status = "retrying";
  saveDLQ(items);

  try {
    await handler(item.payload);
    item.status = "resolved";
    item.lastError = null;
    saveDLQ(items);
    return true;
  } catch (err) {
    item.lastError = err instanceof Error ? err.message : "Unknown error";
    item.status = item.attempts >= MAX_RETRIES ? "failed" : "pending";
    saveDLQ(items);
    return false;
  }
}

/** Export DLQ as CSV */
export function exportDLQcsv(): string {
  const items = loadDLQ();
  const headers = ["ID", "Fecha", "Tipo", "Intentos", "Último Error", "Estado"];
  const rows = items.map((i) =>
    [
      i.id,
      i.createdAt,
      i.type,
      String(i.attempts),
      `"${(i.lastError ?? "").replace(/"/g, '""')}"`,
      i.status,
    ].join(";"),
  );
  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}
