/**
 * Page de configuration GitHub de l'UI UCM Contract Exporter.
 *
 * Ce module possède le formulaire, sa validation locale et ses états visuels.
 * Le point d'entrée de l'UI ne conserve que le routage des messages Figma.
 */
import { NOM_CONFIGURATION } from '@ucm-kit/core/format';

import type { PublicSettings, SettingsInput } from '../../config';
import type { EtatConnexion, EtatDuDepot } from '../../connexion';
import type { PluginMessage } from '../../messages';
import { createButton } from './Button';
import { versSandbox } from '../pont';

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
  acceptRemoteSettings(settings: PublicSettings): void;
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

/** Valide les erreurs simples avant d'envoyer le secret au sandbox Figma. */
function localErrors(settings: SettingsInput, hasStoredPat: boolean): ErreursDeChamp {
  const errors: ErreursDeChamp = {};
  const markdownLink = settings.repoUrl.trim().match(/^\[[^\]]+\]\((https:\/\/github\.com\/[^)\s]+)\)$/i);
  const repositoryUrl = markdownLink?.[1] ?? settings.repoUrl.trim();
  if (!/^https:\/\/github\.com\/[^/?#\s]+\/[^/?#\s]+\/?(?:[?#].*)?$/i.test(repositoryUrl)) {
    errors.repoUrl = 'Utilisez une URL https://github.com/owner/repo valide.';
  }
  if (!settings.baseBranch.trim()) errors.baseBranch = 'La branche de base est obligatoire.';
  // `githubPat` est optionnel dans `SettingsInput`. Le formulaire en fournit
  // toujours un, fût-il vide, mais un appel construit ailleurs peut l'omettre :
  // sans l'accès optionnel, la validation lève au lieu de refuser la saisie.
  if (!settings.githubPat?.trim() && !hasStoredPat) {
    errors.githubPat = 'Le Personal Access Token est obligatoire.';
  }
  return errors;
}

/**
 * Construit la page de configuration et expose uniquement les opérations que
 * le routeur UI doit déclencher à la réception des messages du plugin.
 */
export function createConfigurationPage(
  onSave: (settings: SettingsInput) => void,
): PageConfigurationUi {
  let hasStoredPat = false;
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
 * français reste. « Personal Access Token » garde son nom parce que c'est celui
 * que GitHub donne à la chose : le traduire enverrait chercher dans ses réglages
 * un intitulé qui n'y figure pas.
 */
  const repoUrl = createField('repoUrl', 'URL du repository', {
    placeholder: 'https://github.com/mon-org/design-system-v3',
  }, markDirty);

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
  const githubPat = createField('githubPat', 'Personal Access Token', {
    type: 'password',
    help: 'Utilisez un fine-grained token limité à ce repo avec Contents: Read and write et Pull requests: Read and write.',
  }, markDirty);
  const fields = { repoUrl, baseBranch, githubPat };

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
    githubPat: githubPat.input.value,
  });

  const saveButton = createButton({
    label: 'Enregistrer',
    variant: 'primary',
    onClick: () => {
      const settings = settingsPayload();
      const errors = localErrors(settings, hasStoredPat);
      renderErrors(errors);
      if (Object.keys(errors).length > 0) return;
      enregistrementEnCours = true;
      saveButton.disabled = true;
      ecrireStatut('loading', 'Enregistrement et test de connexion…');
      onSave(settings);
    },
  });

  element.append(
    status,
    repoUrl.wrapper,
    baseBranch.wrapper,
    destination,
    githubPat.wrapper,
    supprimerToken,
    saveButton,
  );

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
      hasStoredPat = Boolean(settings.hasPat);
      // Le bouton n'existe que s'il y a quelque chose à supprimer.
      supprimerToken.hidden = !hasStoredPat;
      reinitialiserSuppression();
      githubPat.input.value = '';
      githubPat.input.placeholder = hasStoredPat
        ? 'Token enregistré. Laissez ce champ vide pour le conserver.'
        : '';
    },
    acceptRemoteSettings(settings: PublicSettings) {
      settingsDirty = false;
      this.populate(settings);
    },
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
