/**
 * Les messages que l'onglet Palettes montre pour la palette ouverte : les
 * points à vérifier et les informations, dans la liste ; les alertes qui
 * comparent les intensités, près du réglage d'intensité ([VER-10],
 * [VER-11]). Les promesses manquées se lisent dans la carte des garanties
 * ([VER-06]).
 */
import { severiteDeLAlerte, type Palette } from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import { ciblesDeLAlerte, placeDeLAlerte } from '../presentation';
import type { Message } from './constats';
import { constatDAlerte, type ContexteDAlerte } from './textes';

export interface MessagesDeLaPalette {
  /** Points à vérifier, puis informations. */
  readonly liste: readonly Message[];
  /** Les alertes qui se lisent près du réglage d'intensité. */
  readonly intensite: readonly Message[];
}

export function messagesDeLaPalette(
  analyse: AnalyseDePalette,
  palette: Palette,
  contexte: ContexteDAlerte,
): MessagesDeLaPalette {
  const alertes = analyse.alertes.map((alerte) => ({
    place: placeDeLAlerte(alerte),
    message: {
      severite: severiteDeLAlerte(alerte),
      constat: constatDAlerte(alerte, contexte),
      cibles: ciblesDeLAlerte(alerte, palette),
      compte: 1,
    } satisfies Message,
  }));
  const liste = alertes.filter(({ place }) => place === 'liste').map(({ message }) => message);
  return {
    liste: [...liste.filter((message) => message.severite === 'alerte'), ...liste.filter((message) => message.severite === 'notice')],
    intensite: alertes.filter(({ place }) => place === 'intensite').map(({ message }) => message),
  };
}
