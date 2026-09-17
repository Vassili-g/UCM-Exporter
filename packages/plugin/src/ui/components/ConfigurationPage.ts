/**
 * Page de configuration du dépôt de l'UI UCM Contract Exporter.
 *
 * Ce module possède le formulaire, sa validation locale et ses états visuels.
 * Le point d'entrée de l'UI ne conserve que le routage des messages Figma.
 */
import { NOM_CONFIGURATION } from '@ucm-kit/core/format';

import { lireAdresseDuDepot, validateSettings } from '../../config';
import type { PublicSettings, SettingsInput } from '../../config';
import { TERMES, avecMajuscule } from '../../forges/termes';
import type { NomDeForge } from '../../forges/termes';
import type { EtatConnexion, EtatDuDepot } from '../../connexion';
import type { PluginMessage } from '../../messages';
import { createButton } from './Button';
import { createInterrupteur } from './Interrupteur';
import { createOnglets } from './Onglets';
import { versSandbox } from '../pont';

/** Les onglets de la configuration. */
export type OngletConfiguration = 'general' | 'depots';

/** La phrase sous les onglets, qui dit ce que l'onglet sélectionné règle. */
const DESCRIPTIONS: Record<OngletConfiguration, string> = {
  general: 'Les réglages du plugin sur ce poste.',
  depots: 'Les dépôts où les exports sont déposés, et le jeton qui autorise chacun.',
};

/** Le nom d'un champ du formulaire : exactement les clés que le sandbox lit. */
type NomDeChamp = keyof SettingsInput;

/** Les erreurs de saisie, par champ. */
export type ErreursDeChamp = Partial<Record<NomDeChamp, string>>;

/** Un champ monté : son enveloppe, sa saisie, son erreur et son libellé. */
interface ChampUi {
  wrapper: HTMLLabelElement;
  input: HTMLInputElement;
  error: HTMLSpanElement;
  label: HTMLSpanElement;
}

interface OptionsChamp {
  type?: string;
  placeholder?: string;
  help?: string;
}

/** Ce que le routeur UI pilote sur la page de configuration. */
export interface PageConfigurationUi {
  element: HTMLDivElement;
  renderErrors(errors?: ErreursDeChamp): void;
  populate(settings: PublicSettings): void;
  acceptRemoteSettings(settings: PublicSettings & { tokens: boolean }): void;
  ouvrirOnglet(onglet: OngletConfiguration): void;
  ongletActif(): OngletConfiguration;
  updateConnection(state: EtatConnexion['state'], geste: string | null): void;
  afficherDestination(depot: Extract<PluginMessage, { type: 'depot' }>): void;
  showSaveError(): void;
  releaseSaveButton(): void;
}

/**
 * Découpe un texte autour d'un terme, rendu en gras.
 *
 * `textContent` ne sait pas mettre un mot en valeur, et une chaîne HTML
 * injectée ferait passer un texte par un chemin qui accepterait du balisage.
 */
function enGras(texte: string, terme: string): Node[] {
  return texte.split(terme).flatMap((part, index) => {
    if (index === 0) return [document.createTextNode(part)];
    const fort = document.createElement('strong');
    fort.textContent = terme;
    return [fort, document.createTextNode(part)];
  });
}

/** Crée un champ avec son aide et une zone d'erreur de hauteur stable. */
function createField(
  name: NomDeChamp,
  label: string,
  options: OptionsChamp,
  onChange: () => void,
): ChampUi {
  const wrapper = document.createElement('label');
  wrapper.className = 'field';

  const labelNode = document.createElement('span');
  labelNode.className = 'field-label';
  labelNode.textContent = label;

  const input = document.createElement('input');
  input.className = 'input';
  input.name = name;
  input.type = options.type || 'text';
  input.placeholder = options.placeholder || '';
  input.autocomplete = 'off';

  const error = document.createElement('span');
  error.className = 'field-error';
  error.setAttribute('aria-live', 'polite');
  input.addEventListener('input', () => {
    error.textContent = '';
    onChange();
  });

  wrapper.append(labelNode, input);
  if (options.help) {
    const help = document.createElement('span');
    help.className = 'field-help';
    help.textContent = options.help;
    wrapper.appendChild(help);
  }
  wrapper.appendChild(error);
  return { wrapper, input, error, label: labelNode };
}

/**
 * Valide la saisie avant d'envoyer le secret au sandbox Figma, par la même
 * fonction que le sandbox. L'UI ne connaît du jeton enregistré que sa forge :
 * un jeton factice la représente, et la validation n'en lit que la présence.
 */
function localErrors(settings: SettingsInput, forgeDuJeton: NomDeForge | null): ErreursDeChamp {
  return validateSettings(settings, { jeton: forgeDuJeton ? 'enregistré' : '', forge: forgeDuJeton }).errors;
}

/**
 * Construit la page de configuration et expose uniquement les opérations que
 * le routeur UI doit déclencher à la réception des messages du plugin.
 */
export function createConfigurationPage(
  onSave: (settings: SettingsInput) => void,
): PageConfigurationUi {
  let forgeDuJeton: NomDeForge | null = null;
  let settingsDirty = false;
  /*
   * « Réglages enregistrés » ne se dit que si un enregistrement a eu lieu.
   * Le statut l'affirmait à chaque test de connexion, y compris celui de
   * l'ouverture, où personne n'avait rien enregistré. Seule l'UI sait qu'un
   * clic vient de partir : le sandbox, lui, teste la connexion pour deux
   * raisons différentes et n'a pas à les distinguer.
   */
  let enregistrementEnCours = false;
  const element = document.createElement('div');
  element.className = 'page-stack';
  element.hidden = true;

  /*
 * Ni carte, ni titre de section. La configuration est un formulaire : lui donner le
 * poids visuel de la zone d'action en faisait une troisième zone de rang égal. Et «
 * Configuration du repository » répétait le titre de la page qui le porte, que
 * rend déjà exact.
 */
  const markDirty = () => { settingsDirty = true; };
  /*
 * Les libellés sont en français. Ils étaient les quatre seuls mots d'anglais d'une
 * interface entièrement française, et le geste attendait l'arbitrage de langue que
 * la publication sur la Figma Community a rendu exigible : il est tranché, le
 * français reste. Le nom du jeton suit la forge de l'URL saisie, parce que c'est
 * celui que la forge donne à la chose : le traduire enverrait chercher dans ses
 * réglages un intitulé qui n'y figure pas.
 */
  const repoUrl = createField('repoUrl', 'URL du repository ou du projet', {
    placeholder: 'https://github.com/mon-org/design-system-v3',
  }, () => {
    markDirty();
    suivreLaForge();
  });

  /*
   * Ce que l'adresse désigne, lu par la fonction du sandbox. Une adresse de
   * page est acceptée ; la seconde ligne dit que son dossier ne décide de rien.
   */
  const projetRetenu = document.createElement('span');
  projetRetenu.className = 'field-help';
  const dossierRetire = document.createElement('span');
  dossierRetire.className = 'field-help';
  dossierRetire.textContent = 'Cette adresse désignait un dossier : le ucm.config.json du dépôt décide où vont les exports.';
  repoUrl.wrapper.insertBefore(projetRetenu, repoUrl.error);
  repoUrl.wrapper.insertBefore(dossierRetire, repoUrl.error);

  /*
 * Où les exports vont atterrir, et qui l'a décidé. Le formulaire ne porte
 * aucun chemin : ce bloc est la seule chose à en dire ici. Il porte un filet de
 * sévérité quand le repository n'a pas choisi cet endroit.
 */
  const destination = document.createElement('div');
  const destinationTitre = document.createElement('p');
  const destinationDetail = document.createElement('p');
  destination.append(destinationTitre, destinationDetail);
  destination.hidden = true;
  const baseBranch = createField('baseBranch', 'Branche de base', { placeholder: 'main' }, markDirty);
  const jeton = createField('jeton', 'Jeton d’accès', {
    type: 'password',
    help: ' ',
  }, markDirty);
  const aideDuJeton = jeton.wrapper.querySelector('.field-help') as HTMLSpanElement;
  const fields = { repoUrl, baseBranch, jeton };

  /**
   * Le libellé, l'aide et le texte du jeton enregistré suivent la forge de
   * l'URL saisie. Sans URL lisible, l'aide nomme les deux forges.
   */
  function suivreLaForge() {
    const adresse = lireAdresseDuDepot(repoUrl.input.value);
    const termes = adresse ? TERMES[adresse.forge] : null;
    projetRetenu.hidden = !adresse;
    dossierRetire.hidden = !adresse?.cheminRetire;
    if (adresse && termes) projetRetenu.textContent = `${avecMajuscule(termes.depot)} ${termes.forge} : ${adresse.projet}`;
    jeton.label.textContent = termes ? avecMajuscule(termes.nomDuJeton) : 'Jeton d’accès';
    aideDuJeton.textContent = termes?.aideDuJeton
      ?? 'Un Personal Access Token GitHub ou un jeton d’accès GitLab, selon l’adresse saisie.';
    jeton.input.placeholder = forgeDuJeton !== null && forgeDuJeton === adresse?.forge
      ? 'Token enregistré. Laissez ce champ vide pour le conserver.'
      : '';
  }
  suivreLaForge();

  /*
   * Retirer le jeton du poste. La confirmation est un second clic sur le
   * même bouton, et non une boîte de dialogue : la sandbox n'en offre pas, et
   * un `confirm()` bloquerait l'iframe. Le libellé de confirmation dit ce qui
   * disparaît, parce que c'est irréversible.
   */
  const supprimerToken = createButton({
    label: 'Supprimer le token enregistré',
    variant: 'secondary',
    onClick: () => {
      if (supprimerToken.dataset.confirme !== 'oui') {
        supprimerToken.dataset.confirme = 'oui';
        supprimerToken.setLabel('Confirmer la suppression du token');
        return;
      }
      reinitialiserSuppression();
      versSandbox({ type: 'supprimer-token' });
    },
  });
  supprimerToken.hidden = true;

  function reinitialiserSuppression() {
    supprimerToken.dataset.confirme = 'non';
    supprimerToken.setLabel('Supprimer le token enregistré');
  }
  reinitialiserSuppression();

  /*
 * L'état de la configuration se lit en haut, sous la pastille.
 */
  const status = document.createElement('div');
  status.className = 'config-status';
  status.hidden = true;
  status.setAttribute('aria-live', 'polite');

  /** Écrit l'état de la configuration, ou l'efface s'il n'y a rien à dire. */
  const ecrireStatut = (etat: string, texte: string) => {
    status.dataset.state = etat;
    status.textContent = texte;
    status.hidden = !texte;
  };

  const renderErrors = (errors: ErreursDeChamp = {}) => {
    for (const [name, field] of Object.entries(fields) as [NomDeChamp, ChampUi][]) {
      field.error.textContent = errors[name] ?? '';
    }
  };

  const settingsPayload = () => ({
    repoUrl: repoUrl.input.value,
    baseBranch: baseBranch.input.value,
    jeton: jeton.input.value,
  });

  const saveButton = createButton({
    label: 'Enregistrer',
    variant: 'primary',
    onClick: () => {
      const settings = settingsPayload();
      const errors = localErrors(settings, forgeDuJeton);
      renderErrors(errors);
      if (Object.keys(errors).length > 0) return;
      enregistrementEnCours = true;
      saveButton.disabled = true;
      ecrireStatut('loading', 'Enregistrement et test de connexion…');
      onSave(settings);
    },
  });

  const panneauDepots = document.createElement('div');
  panneauDepots.className = 'page-stack';
  panneauDepots.append(
    status,
    repoUrl.wrapper,
    baseBranch.wrapper,
    destination,
    jeton.wrapper,
    supprimerToken,
    saveButton,
  );

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
    renderErrors,
    /*
 * Les valeurs sont celles du sandbox, sans défaut inventé ici.
 */
    populate(settings: PublicSettings) {
      if (settingsDirty) return;
      repoUrl.input.value = settings.repoUrl ?? '';
      baseBranch.input.value = settings.baseBranch ?? '';
      forgeDuJeton = settings.forgeDuJeton ?? null;
      // Le bouton n'existe que s'il y a quelque chose à supprimer.
      supprimerToken.hidden = forgeDuJeton === null;
      reinitialiserSuppression();
      jeton.input.value = '';
      suivreLaForge();
    },
    acceptRemoteSettings(settings: PublicSettings & { tokens: boolean }) {
      settingsDirty = false;
      gestionDesTokens.poser(settings.tokens);
      this.populate(settings);
    },
    ouvrirOnglet: onglets.selectionner,
    ongletActif: onglets.actif,
    /*
 * Le statut est écrit même quand la page est cachée : ainsi le designer qui arrive
 * par la pastille trouve la cause déjà là, au lieu d'un cadre vide. C'est la phrase
 * fausse (« Configuration enregistrée » sans enregistrement) qui imposait
 * auparavant de ne rien écrire hors de la vue.
 */
    updateConnection(state: EtatConnexion['state'], geste: string | null) {
      if (state === 'checking') return;
      saveButton.disabled = false;
      const prefixe = enregistrementEnCours ? 'Réglages enregistrés. ' : '';
      enregistrementEnCours = false;
      if (state === 'connected') {
        ecrireStatut('success', `${prefixe}La connexion au repository fonctionne.`);
        return;
      }
      ecrireStatut('error', `${prefixe}${geste ?? ''}`.trim());
    },
    /**
     * L'endroit où l'export ira, dit là où le designer configure le repository.
     * Il ne se saisit pas ici : il se lit, parce que c'est le repository qui en
     * décide.
     */
    afficherDestination({ resume }: EtatDuDepot) {
      destination.hidden = !resume;
      if (!resume) return;
      const { ton, titre, detail } = resume;
      destination.className = `destination-${ton}`;
      destinationTitre.textContent = titre;
      // Le nom du fichier est le sujet de la phrase, et c'est lui qu'un
      // développeur devra chercher dans le repository.
      destinationDetail.replaceChildren(...enGras(detail, NOM_CONFIGURATION));
    },
    showSaveError() {
      enregistrementEnCours = false;
      saveButton.disabled = false;
      ecrireStatut('error', 'Réglages non enregistrés. Corrigez les champs signalés.');
    },
    releaseSaveButton() {
      saveButton.disabled = false;
    },
  };
}
