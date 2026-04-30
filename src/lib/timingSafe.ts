/**
 * Comparación de strings en tiempo constante.
 *
 * `===` en JavaScript hace short-circuit en el primer byte distinto, lo que
 * permite a un atacante con timing preciso descubrir un secreto byte a byte.
 * Esta función recorre la longitud máxima de ambos strings siempre, sin
 * importar dónde está la diferencia.
 *
 * Edge-compatible (no depende de `node:crypto`). Usar para tokens de admin,
 * secrets de webhook, comparaciones de sesión, etc.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0);
  }
  return diff === 0;
}
