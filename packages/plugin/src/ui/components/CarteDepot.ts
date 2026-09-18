/**
 * Une carte de la liste des dépôts : repliée, le nom et l'état ou « Se
 * connecter » ; dépliée, les champs du dépôt, le geste de son test et
 * l'endroit où ses exports vont.
 *
 * La carte repliée porte deux commandes voisines, le bouton de dépli et
 * « Se connecter » : un bouton ne se place pas dans un autre, et un clic sur
 * « Se connecter » ne déplie pas la carte.
 */
import { NOM_CONFIGURATION } from '@ucm-kit/core/format';

import { lireAdresseDuDepot, validateSettings } from '../../config';
import type { SettingsInput, SettingsValidation } from '../../config';
import type { EtatDeCarte, ResumeDepot } from '../../connexion';
import { TERMES, avecMajuscule } from '../../forges/termes';
import type { DepotPublic } from '../../messages';
import { createButton } from './Button';

type NomDeChamp = keyof SettingsInput;

/** Les erreurs de saisie, par champ, et l'erreur générale. */
export type ErreursDeChamp = SettingsValidation['errors'];

interface ChampUi {
  wrapper: HTMLLabelElement;
  input: HTMLInputElement;
  error: HTMLSpanElement;
  label: HTMLSpanElement;
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

/** Un champ avec son aide et une zone d'erreur qui ne réserve aucune hauteur. */
function createField(name: NomDeChamp, label: string, type: string, onChange: () => void): ChampUi {
  const wrapper = document.createElement('label');
  wrapper.className = 'field';

  const labelNode = document.createElement('span');
  labelNode.className = 'field-label';
  labelNode.textContent = label;

  const input = document.createElement('input');
  input.className = 'input';
  input.name = name;
  input.type = type;
  input.autocomplete = 'off';

  const error = document.createElement('span');
  error.className = 'field-error';
  error.setAttribute('aria-live', 'polite');
  input.addEventListener('input', () => {
    error.textContent = '';
    onChange();
  });

  wrapper.append(labelNode, input, error);
  return { wrapper, input, error, label: labelNode };
}

/** Ce que la liste pilote sur une carte. */
export interface CarteDepotUi {
  element: HTMLElement;
  /** L'identité enregistrée, `null` tant que la carte n'a jamais été enregistrée. */
  id(): string | null;
  /** La saisie en cours depuis la dernière réception des réglages. */
  modifiee(): boolean;
  /** Pose le dépôt reçu dans `settings`, sans remplacer une saisie en cours. */
  poser(depot: DepotPublic, actif: boolean): void;
  /** Le test de ce dépôt : statut, geste et destination. */
  afficherTest(etat: EtatDeCarte, destination: ResumeDepot | null): void;
  /**
   * La réponse à l'enregistrement que cette carte a envoyé. Rend `true` quand il
   * est accepté.
   */
  recevoirEnregistrement(requete: number, id: string | null, erreurs: ErreursDeChamp): boolean;
  deplier(deplie: boolean): void;
  estDepliee(): boolean;
  enEchec(): boolean;
  liberer(): void;
}

export interface OptionsCarteDepot {
  cle: string;
  onEnregistrer: (carte: CarteDepotUi, settings: SettingsInput) => number;
  onSupprimer: (carte: CarteDepotUi) => void;
  onSeConnecter: (id: string) => void;
}

export function createCarteDepot({ cle, onEnregistrer, onSupprimer, onSeConnecter }: OptionsCarteDepot): CarteDepotUi {
  let depot: DepotPublic | null = null;
  let actif = false;
  let modifiee = false;
  let requeteEnVol: number | null = null;
  let jetonEnvoye: string | null = null;
  let echec = false;

  const element = document.createElement('section');
  element.className = 'carte-depot';

  const entete = document.createElement('div');
  entete.className = 'carte-depot-entete';

  const deplier = document.createElement('button');
  deplier.type = 'button';
  deplier.className = 'carte-depot-nom';
  deplier.setAttribute('aria-controls', `corps-${cle}`);
  deplier.textContent = 'Nouveau dépôt';
  deplier.addEventListener('click', () => api.deplier(corps.hidden));

  const statut = document.createElement('span');
  statut.className = 'carte-depot-statut';
  statut.hidden = true;

  const seConnecter = createButton({
    label: 'Se connecter',
    variant: 'secondary',
    onClick: () => { if (depot) onSeConnecter(depot.id); },
  });
  seConnecter.hidden = true;
  entete.append(deplier, statut, seConnecter);

  const corps = document.createElement('div');
  corps.className = 'carte-depot-corps';
  corps.id = `corps-${cle}`;

  const geste = document.createElement('p');
  geste.className = 'carte-depot-geste';
  geste.hidden = true;

  const marquerModifiee = () => { modifiee = true; };
  const repoUrl = createField('repoUrl', 'URL du dépôt', 'text', () => {
    marquerModifiee();
    suivreLaForge();
  });
  repoUrl.input.placeholder = 'https://github.com/mon-org/design-system-v3';

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

  const baseBranch = createField('baseBranch', 'Branche de base', 'text', marquerModifiee);
  baseBranch.input.placeholder = 'main';
  baseBranch.input.value = 'main';

  /* Où les exports de ce dépôt vont, et qui l'a décidé : il se lit, il ne se saisit pas. */
  const destination = document.createElement('div');
  const destinationTitre = document.createElement('p');
  const destinationDetail = document.createElement('p');
  destination.append(destinationTitre, destinationDetail);
  destination.hidden = true;

  const jeton = createField('jeton', 'Jeton d’accès', 'password', marquerModifiee);
  const aideDuJeton = document.createElement('span');
  aideDuJeton.className = 'field-help';
  jeton.wrapper.insertBefore(aideDuJeton, jeton.error);

  const erreurGenerale = document.createElement('p');
  erreurGenerale.className = 'field-error';
  erreurGenerale.setAttribute('aria-live', 'polite');

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
    jeton.input.placeholder = depot?.jeton && depot.forge === adresse?.forge
      ? 'Token enregistré. Laissez ce champ vide pour le conserver.'
      : '';
  }

  function afficherErreurs(erreurs: ErreursDeChamp) {
    for (const [nom, champ] of Object.entries(fields) as [NomDeChamp, ChampUi][]) {
      champ.error.textContent = erreurs[nom] ?? '';
    }
    erreurGenerale.textContent = erreurs.general ?? '';
    erreurGenerale.hidden = !erreurs.general;
  }

  const enregistrer = createButton({
    label: 'Enregistrer',
    variant: 'primary',
    onClick: () => {
      const settings = { repoUrl: repoUrl.input.value, baseBranch: baseBranch.input.value, jeton: jeton.input.value };
      // La même validation que le sandbox. Le jeton enregistré n'est connu que
      // par sa présence : un jeton factice le représente.
      const erreurs = validateSettings(
        settings,
        { jeton: depot?.jeton ? 'enregistré' : '', forge: depot?.forge ?? null },
      ).errors;
      afficherErreurs(erreurs);
      if (Object.keys(erreurs).length > 0) return;
      enregistrer.disabled = true;
      jetonEnvoye = settings.jeton;
      requeteEnVol = onEnregistrer(api, settings);
    },
  });

  /*
   * Retirer le dépôt, jeton compris. La confirmation est un second clic sur le
   * même bouton, et non une boîte de dialogue : la sandbox n'en offre pas, et
   * un `confirm()` bloquerait l'iframe. Une carte jamais enregistrée
   * s'abandonne sans confirmation : rien n'est stocké.
   */
  const supprimer = createButton({
    label: 'Supprimer',
    variant: 'secondary',
    onClick: () => {
      if (depot && supprimer.dataset.confirme !== 'oui') {
        supprimer.dataset.confirme = 'oui';
        supprimer.setLabel('Confirmer la suppression');
        return;
      }
      onSupprimer(api);
    },
  });

  const actions = document.createElement('div');
  actions.className = 'carte-depot-actions';
  actions.append(enregistrer, supprimer);

  corps.append(geste, repoUrl.wrapper, baseBranch.wrapper, destination, jeton.wrapper, erreurGenerale, actions);
  element.append(entete, corps);

  /** Le statut à droite du nom : celui du dépôt actif, ou « Se connecter ». */
  function rafraichirEntete() {
    seConnecter.hidden = !depot || actif;
    statut.hidden = !depot || !actif || !statut.textContent;
  }

  const api: CarteDepotUi = {
    element,
    id: () => depot?.id ?? null,
    modifiee: () => modifiee,
    poser(recu: DepotPublic, estActif: boolean) {
      const changeDActif = estActif !== actif;
      depot = recu;
      actif = estActif;
      deplier.textContent = recu.nom;
      if (changeDActif) {
        statut.textContent = estActif ? 'Connexion…' : '';
        statut.dataset.state = 'checking';
      }
      rafraichirEntete();
      // Un jeton reste attaché au projet pour lequel il a été collé : l'adresse
      // d'un dépôt enregistré se lit, elle ne se modifie plus.
      repoUrl.input.readOnly = true;
      if (!modifiee) {
        repoUrl.input.value = recu.repoUrl;
        baseBranch.input.value = recu.baseBranch;
      }
      suivreLaForge();
    },
    afficherTest(etat: EtatDeCarte, resume: ResumeDepot | null) {
      echec = etat.etat === 'disconnected';
      if (actif) {
        statut.textContent = etat.statut;
        statut.dataset.state = etat.etat;
      }
      geste.textContent = etat.geste ?? '';
      geste.hidden = !etat.geste;
      rafraichirEntete();
      destination.hidden = !resume;
      if (!resume) return;
      const { ton, titre, detail } = resume;
      destination.className = `destination-${ton}`;
      destinationTitre.textContent = titre;
      // Le nom du fichier est le sujet de la phrase, et c'est lui qu'un
      // développeur devra chercher dans le dépôt.
      destinationDetail.replaceChildren(...enGras(detail, NOM_CONFIGURATION));
    },
    recevoirEnregistrement(requete: number, _id: string | null, erreurs: ErreursDeChamp) {
      // Une réponse à une ancienne demande ne remplace pas une saisie plus récente.
      if (requete !== requeteEnVol) return false;
      requeteEnVol = null;
      enregistrer.disabled = false;
      afficherErreurs(erreurs);
      if (Object.keys(erreurs).length > 0) return false;
      // Le jeton envoyé est rangé : le champ se vide, sauf s'il a été retapé depuis.
      if (jeton.input.value === jetonEnvoye) jeton.input.value = '';
      jetonEnvoye = null;
      modifiee = false;
      return true;
    },
    deplier(deplie: boolean) {
      corps.hidden = !deplie;
      deplier.setAttribute('aria-expanded', String(deplie));
    },
    estDepliee: () => !corps.hidden,
    enEchec: () => echec,
    liberer() {
      enregistrer.disabled = false;
      requeteEnVol = null;
    },
  };

  suivreLaForge();
  api.deplier(true);
  erreurGenerale.hidden = true;
  return api;
}
