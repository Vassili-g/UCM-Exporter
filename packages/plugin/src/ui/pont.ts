/**
 * Porte d'envoi de l'interface vers le sandbox, symétrique de `versUi` dans
 * `code.ts`.
 *
 * `messages.ts` porte le vocabulaire des deux sens de la frontière. Une liste
 * ne contraint que ce qui passe par une porte typée, et l'interface envoyait
 * ses demandes par cinq `parent.postMessage` dispersés.
 *
 * `parent` et `'*'` ne sont écrits qu'ici : une iframe de plugin Figma n'a pas
 * d'autre destinataire.
 */
import type { UiRequest } from '../messages';

/** Envoie une demande au sandbox. Le type refuse ce que le sandbox ne route pas. */
export function versSandbox(message: UiRequest): void {
  parent.postMessage({ pluginMessage: message }, '*');
}
