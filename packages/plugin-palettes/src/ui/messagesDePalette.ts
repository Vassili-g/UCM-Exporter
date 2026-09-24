/**
 * Les messages que l'onglet Palettes montre pour la palette ouverte : les
 * promesses manquées groupées ([VER-06]) et les points à vérifier, dans la
 * liste ; les alertes qui comparent les intensités, près du réglage
 * d'intensité ([VER-10], [VER-11]).
 */
import { severiteDeLAlerte, type Palette } from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import { ciblesDeLAlerte, ciblesDeLaPromesse, groupesManques, placeDeLAlerte, type GroupeDePromesses } from '../presentation';
import type { Message } from './constats';
import { constatDAlerte, constatDeGroupe, type ContexteDAlerte } from './textes';

export interface MessagesDeLaPalette {
  /** Promesses à corriger, puis points à vérifier. */
  readonly liste: readonly Message[];
  /** Les alertes qui se lisent près du réglage d'intensité. */
  readonly intensite: readonly Message[];
}

export function messagesDeLaPalette(
  analyse: AnalyseDePalette,
  palette: Palette,
  contexte: ContexteDAlerte,
  nom: string,
  inspecter: (groupe: GroupeDePromesses) => void,
): MessagesDeLaPalette {
  const promesses: Message[] = groupesManques(analyse.promesses).map((groupe) => ({
    severite: 'promesse',
    constat: constatDeGroupe(groupe, nom),
    cibles: ciblesDeLaPromesse(),
    compte: groupe.manquees,
    inspecter: () => inspecter(groupe),
  }));
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
    liste: [...promesses, ...liste.filter((message) => message.severite === 'alerte'), ...liste.filter((message) => message.severite === 'notice')],
    intensite: alertes.filter(({ place }) => place === 'intensite').map(({ message }) => message),
  };
}
