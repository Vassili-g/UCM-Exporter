/**
 * Constantes posées par esbuild à la compilation (`--define`).
 *
 * `build:code` définit `__UCM_MESURE__` à `false`, `build:code:mesure` à
 * `true`. Les tests ne la définissent pas : `contract/mesure.ts` la lit alors
 * sur `globalThis`.
 */
declare const __UCM_MESURE__: boolean | undefined;
