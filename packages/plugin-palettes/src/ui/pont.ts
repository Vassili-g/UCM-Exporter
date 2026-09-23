/**
 * Porte d'envoi de l'interface vers le sandbox, symétrique de `versUi` dans
 * `code.ts`. `parent` et `'*'` ne sont écrits qu'ici : une iframe de plugin
 * Figma n'a pas d'autre destinataire.
 */
import type { UiRequest } from '../messages';

/** Envoie une demande au sandbox. Le type refuse ce que le sandbox ne route pas. */
export function versSandbox(message: UiRequest): void {
  parent.postMessage({ pluginMessage: message }, '*');
}
