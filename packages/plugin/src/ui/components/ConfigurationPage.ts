/**
 * Page de configuration de l'UI UCM Contract Exporter : deux onglets, Général
 * pour les réglages du poste, Dépôts pour la liste des dépôts.
 *
 * Le point d'entrée de l'UI ne conserve que le routage des messages Figma.
 */
import type { PluginMessage, ReglagesPublics } from '../../messages';
import { createInterrupteur } from './Interrupteur';
import { createListeDesDepots } from './ListeDesDepots';
import { createOnglets } from './Onglets';
import { versSandbox } from '../pont';

/** Les onglets de la configuration. */
export type OngletConfiguration = 'general' | 'depots';

/** La phrase sous les onglets, qui dit ce que l'onglet sélectionné règle. */
const DESCRIPTIONS: Record<OngletConfiguration, string> = {
  general: 'Les réglages du plugin sur ce poste.',
  depots: 'Les dépôts où les exports sont déposés, et le jeton qui autorise chacun.',
};

/** Ce que le routeur UI pilote sur la page de configuration. */
export interface PageConfigurationUi {
  element: HTMLDivElement;
  acceptRemoteSettings(settings: ReglagesPublics): void;
  recevoirEnregistrement(message: Extract<PluginMessage, { type: 'depot-enregistre' }>): void;
  recevoirTest(message: Extract<PluginMessage, { type: 'depot-teste' }>): void;
  ouvrirOnglet(onglet: OngletConfiguration): void;
  ongletActif(): OngletConfiguration;
  montrerLActifEnEchec(): void;
  releaseSaveButton(): void;
}

export function createConfigurationPage(): PageConfigurationUi {
  const element = document.createElement('div');
  element.className = 'page-stack';
  element.hidden = true;

  const gestionDesTokens = createInterrupteur(
    'gerer-tokens',
    'Gérer les tokens',
    'Affiche la commande d’export des tokens. L’analyse d’un composant vérifie aussi que les tokens '
      + 'sont fusionnés dans le dépôt.',
    (valeur) => versSandbox({ type: 'gerer-tokens', valeur }),
  );
  const panneauGeneral = document.createElement('div');
  panneauGeneral.className = 'page-stack';
  panneauGeneral.append(gestionDesTokens.element);

  const depots = createListeDesDepots();
  const panneauDepots = depots.element;

  const description = document.createElement('p');
  description.className = 'subtitle';
  const onglets = createOnglets<OngletConfiguration>(
    'Configuration',
    [
      { id: 'general', libelle: 'Général', panneau: panneauGeneral },
      { id: 'depots', libelle: 'Dépôts', panneau: panneauDepots },
    ],
    (id) => { description.textContent = DESCRIPTIONS[id]; },
  );

  element.append(onglets.liste, description, panneauGeneral, panneauDepots);

  return {
    element,
    acceptRemoteSettings(settings: ReglagesPublics) {
      gestionDesTokens.poser(settings.tokens);
      depots.accepterReglages(settings);
    },
    recevoirEnregistrement: depots.recevoirEnregistrement,
    recevoirTest: depots.recevoirTest,
    ouvrirOnglet: onglets.selectionner,
    ongletActif: onglets.actif,
    montrerLActifEnEchec: depots.montrerLActifEnEchec,
    releaseSaveButton: depots.liberer,
  };
}
