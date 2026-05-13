/**
 * TpvWorker — operario contratado por una tienda física para vender en su TPV.
 *
 * Concepto:
 *   - El usuario `role === "tienda"` (la tienda) es el "owner".
 *   - Puede dar de alta varios `TpvWorker` (sus empleados) con un nick + password.
 *   - Los workers SOLO operan en el TPV de la tienda del owner — no se loguean
 *     en la web pública ni acceden a /admin. No tienen entrada en la tabla `users`:
 *     viven en su propia entidad porque su scope es estrictamente operativo.
 *   - Cada venta TPV captura `operatorId` + `operatorName` con el dato del
 *     worker (o de la tienda si vende ella misma). Eso queda en la BD pero
 *     de momento NO se muestra en otros listados (solo registro interno).
 *
 * Storage: localStorage `tcgacademy_tpv_workers` (array global; filtrar por
 * ownerUserId en lectura).
 *
 * Seguridad: la password se almacena hasheada con bcryptjs (rounds=10).
 * 10 rounds es deliberado — el worker entra varias veces al día por turno,
 * 13 rounds sería 4x más lento sin ganar nada (el TPV ya está gateado por
 * admin/tienda + IP allowlist + store membership en proxy + layout).
 */

import type { TpvStoreSlug } from "@/config/tpvStores";

export interface TpvWorker {
  /** UUID generado al crear el worker. */
  id: string;
  /**
   * userId del owner (cuenta `tienda` que lo dio de alta). Si el owner pierde
   * el rol "tienda" los workers quedan huérfanos y se ocultan en el selector.
   */
  ownerUserId: string;
  /**
   * Tienda física donde opera. Heredado de `owner.tpvStoreSlug` al crear.
   * Se duplica aquí para que el filtrado en el TPV no tenga que resolver el
   * owner cada vez.
   */
  storeSlug: TpvStoreSlug;
  /**
   * Identificador visible: 2–24 chars, case-insensitive único por owner.
   * No tiene que ser email — el worker no recibe comunicaciones.
   */
  nickname: string;
  /** Hash bcryptjs (rounds=10). */
  passwordHash: string;
  /**
   * `false` = baja lógica (no aparece en selector ni puede loguear). El
   * historial de ventas asociadas se conserva intacto: el "seller" de una
   * venta histórica sigue siendo este worker incluso después de la baja.
   */
  active: boolean;
  createdAt: string;
  updatedAt: string;
  /** ISO timestamp del último login exitoso al TPV. Opcional. */
  lastLoginAt?: string;
}

/**
 * Identidad del vendedor activo durante una sesión TPV (sessionStorage).
 * Se inyecta en cada venta como `operatorId` + `operatorName`.
 */
export interface TpvActiveSeller {
  /**
   * `owner` — el usuario auth (admin / tienda / super-user) vende él mismo.
   * `worker` — un trabajador dado de alta por la tienda está vendiendo.
   */
  kind: "owner" | "worker";
  /** Para `owner` → User.id. Para `worker` → TpvWorker.id. */
  id: string;
  /**
   * Etiqueta legible que aparecerá en el ticket / venta. Para owner el
   * nombre completo o email; para worker, su nickname.
   */
  label: string;
  /** Tienda en la que opera (debe coincidir con la URL del TPV). */
  storeSlug: TpvStoreSlug;
  /** ISO timestamp en el que se eligió el seller activo. */
  selectedAt: string;
}
