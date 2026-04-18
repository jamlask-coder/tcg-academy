/**
 * DataHub — Public API
 * ====================
 * Punto único de entrada al sistema de datos. Cualquier módulo que necesite
 * leer, escribir o suscribirse a una entidad DEBE pasar por aquí.
 *
 * Regla de oro:
 *   ANTES DE CREAR una nueva tabla, clave, colección, endpoint, estado o
 *   servicio, buscar aquí si ya existe la entidad. Si sí → reutilizar.
 *   Si no → añadir al registry (maturity: "partial" o "stable") y luego crear.
 *
 * Uso típico en componentes:
 *   import { DataHub } from "@/lib/dataHub";
 *   useEffect(() => DataHub.on("orders", reload), []);
 *   DataHub.emit("orders"); // tras un write
 *
 * Uso en servicios (escritores canónicos):
 *   saveInvoice(...);
 *   DataHub.emit("invoices");
 *
 * Migración progresiva:
 *   - Los servicios existentes (orderAdapter, couponService, etc.) siguen
 *     exponiendo sus funciones. DataHub es la fachada común, no las reemplaza.
 *   - Gradualmente, consumidores pueden migrar a DataHub.on() en lugar de
 *     addEventListener("tcga:foo:updated", ...) con string literal.
 */

export { DataHubEvents, ENTITY_EVENT, emit, on, type DataHubEventName } from "./events";
export {
  ENTITIES,
  getEntity,
  listEntities,
  getStorageKeyMap,
  allRegisteredKeys,
  getBackupTrackedKeys,
  getCriticalJsonKeys,
  type EntityRegistryEntry,
  type EntityMaturity,
  type EntityCategory,
  type BackupTrackedKey,
} from "./registry";
export {
  buildIntegrityReport,
  findOrphanKeys,
  removeOrphanKey,
  type IntegrityReport,
} from "./integrity";

export * as DataHubTypes from "./types";

import { emit as _emit, on as _on, ENTITY_EVENT } from "./events";
import { getEntity, listEntities, allRegisteredKeys } from "./registry";
import { buildIntegrityReport, findOrphanKeys } from "./integrity";

/**
 * Namespace DataHub con los métodos más usados.
 * Equivalente a los exports individuales, pero más conveniente:
 *   DataHub.emit("orders")
 *   DataHub.on("products", reload)
 *   DataHub.getEntity("users")
 */
export const DataHub = {
  emit: _emit,
  on: _on,
  getEntity,
  listEntities,
  allRegisteredKeys,
  buildIntegrityReport,
  findOrphanKeys,
  ENTITY_EVENT,
} as const;
