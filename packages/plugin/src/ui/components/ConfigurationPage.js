/**
 * Page de configuration GitHub de l'UI Unified Component Exporter.
 *
 * Ce module possède le formulaire, sa validation locale et ses états visuels.
 * Le point d'entrée de l'UI ne conserve que le routage des messages Figma.
 */
import { createButton } from './Button.js';

/** Crée un champ avec son aide et une zone d'erreur de hauteur stable. */
function createField(name, label, options, onChange) {
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
function localErrors(settings, hasStoredPat) {
  const errors = {};
  const markdownLink = settings.repoUrl.trim().match(/^\[[^\]]+\]\((https:\/\/github\.com\/[^)\s]+)\)$/i);
  const repositoryUrl = markdownLink?.[1] ?? settings.repoUrl.trim();
  if (!/^https:\/\/github\.com\/[^/?#\s]+\/[^/?#\s]+\/?(?:[?#].*)?$/i.test(repositoryUrl)) {
    errors.repoUrl = 'Utilisez une URL https://github.com/owner/repo valide.';
  }
  if (!settings.baseBranch.trim()) errors.baseBranch = 'La branche de base est obligatoire.';
  if (!settings.componentsPath.trim()) errors.componentsPath = 'Le chemin des composants est obligatoire.';
  if (!settings.tokensPath.trim()) errors.tokensPath = 'Le chemin des tokens est obligatoire.';
  if (!settings.githubPat.trim() && !hasStoredPat) {
    errors.githubPat = 'Le Personal Access Token est obligatoire.';
  }
  return errors;
}

/**
 * Construit la page de configuration et expose uniquement les opérations que
 * le routeur UI doit déclencher à la réception des messages du plugin.
 */
export function createConfigurationPage(onSave) {
  let hasStoredPat = false;
  let settingsDirty = false;
  /*
   * « Réglages enregistrés » ne se dit que si un enregistrement a eu lieu.
   * Le statut l'affirmait à CHAQUE test de connexion, y compris celui de
   * l'ouverture, où personne n'avait rien enregistré. Seule l'UI sait qu'un
   * clic vient de partir : le sandbox, lui, teste la connexion pour deux
   * raisons différentes et n'a pas à les distinguer.
   */
  let enregistrementEnCours = false;
  const element = document.createElement('div');
  element.className = 'page-stack';
  element.hidden = true;

  /*
   * Ni carte, ni titre de section (U1.7 et U1.2). La configuration est un
   * formulaire : lui donner le poids visuel de la zone d'action en faisait une
   * troisième zone de rang égal. Et « Configuration du repository » répétait le
   * titre de la page qui le porte, que U0.3 rend déjà exact.
   */
  const markDirty = () => { settingsDirty = true; };
  /*
   * Les libellés sont en français (U0.5). Ils étaient les quatre seuls mots
   * d'anglais d'une interface entièrement française, et le geste attendait
   * l'arbitrage de langue que la publication sur la Figma Community a rendu
   * exigible : il est tranché — le français reste. « Personal Access Token »
   * n'est pas une exception à cette règle, c'est le nom que GitHub donne à la
   * chose, et le traduire enverrait chercher dans ses réglages un intitulé qui
   * n'y figure pas.
   */
  const repoUrl = createField('repoUrl', 'URL du repository', {
    placeholder: 'https://github.com/mon-org/design-system-v3',
  }, markDirty);

  /*
   * Qui gouverne les chemins, dit AVANT de les saisir (U5.1).
   *
   * `repositoryLayout` ignore ces deux champs dès qu'un `ucm.config.json`
   * lisible existe. Le designer l'apprenait par une ligne de journal, après
   * publication : il avait donc rempli deux champs sans effet, et rien ne le
   * lui avait dit. La phrase vient du sandbox, seul à savoir ce que le
   * repository répond.
   */
  const gouvernance = document.createElement('p');
  gouvernance.className = 'field-help';
  gouvernance.hidden = true;
  const baseBranch = createField('baseBranch', 'Branche de base', { placeholder: 'main' }, markDirty);
  const componentsPath = createField(
    'componentsPath',
    'Chemin des composants',
    { placeholder: 'src/components' },
    markDirty,
  );
  const tokensPath = createField('tokensPath', 'Chemin des tokens', { placeholder: 'src/tokens' }, markDirty);
  const githubPat = createField('githubPat', 'Personal Access Token', {
    type: 'password',
    help: 'Utilisez un fine-grained token limité à ce repo avec Contents: Read and write et Pull requests: Read and write.',
  }, markDirty);
  const fields = { repoUrl, baseBranch, componentsPath, tokensPath, githubPat };

  /*
   * Retirer le jeton du poste (U5.4). La confirmation est un second clic sur le
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
      parent.postMessage({ pluginMessage: { type: 'supprimer-token' } }, '*');
    },
  });
  supprimerToken.hidden = true;

  function reinitialiserSuppression() {
    supprimerToken.dataset.confirme = 'non';
    supprimerToken.setLabel('Supprimer le token enregistré');
  }
  reinitialiserSuppression();

  /*
   * L'état de la configuration se lit EN HAUT, sous la pastille (U5.2).
   *
   * Il vivait sous le bouton « Enregistrer », c'est-à-dire hors de l'écran :
   * le designer qui arrive par la pastille rouge y trouvait un formulaire et
   * aucune raison. Le formulaire dépasse la fenêtre dès que le repository se
   * décrit, donc l'un des deux bouts sera toujours à faire défiler ; c'est
   * l'arrivée qu'il faut servir, parce que c'est le moment où l'on ne sait pas
   * quoi faire. Le résultat d'un enregistrement s'écrit au même endroit : deux
   * emplacements pour un même fait en feraient deux faits.
   */
  const status = document.createElement('div');
  status.className = 'config-status';
  status.hidden = true;
  status.setAttribute('aria-live', 'polite');

  /** Écrit l'état de la configuration, ou l'efface s'il n'y a rien à dire. */
  const ecrireStatut = (etat, texte) => {
    status.dataset.state = etat;
    status.textContent = texte;
    status.hidden = !texte;
  };

  const renderErrors = (errors = {}) => {
    for (const [name, field] of Object.entries(fields)) {
      field.error.textContent = errors[name] || '';
    }
  };

  const settingsPayload = () => ({
    repoUrl: repoUrl.input.value,
    baseBranch: baseBranch.input.value,
    componentsPath: componentsPath.input.value,
    tokensPath: tokensPath.input.value,
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
    gouvernance,
    componentsPath.wrapper,
    tokensPath.wrapper,
    githubPat.wrapper,
    supprimerToken,
    saveButton,
  );

  return {
    element,
    renderErrors,
    /*
     * Les valeurs sont celles du sandbox, sans défaut inventé ici (U5.1).
     *
     * Ce composant en écrivait trois de son côté — `main`, `src/components`,
     * `src/tokens` — que `loadPublicSettings` écrit déjà. Deux autorités sur la
     * même valeur, et leur désaccord était muet : `config.ts` conserve une
     * chaîne vide, ce `populate` la remplaçait. Une branche de base
     * délibérément vidée se réaffichait donc « main ». Les placeholders portent
     * la suggestion ; le champ ne porte que ce qui est enregistré.
     */
    populate(settings) {
      if (settingsDirty) return;
      repoUrl.input.value = settings.repoUrl ?? '';
      baseBranch.input.value = settings.baseBranch ?? '';
      componentsPath.input.value = settings.componentsPath ?? '';
      tokensPath.input.value = settings.tokensPath ?? '';
      hasStoredPat = Boolean(settings.hasPat);
      // Le bouton n'existe que s'il y a quelque chose à supprimer.
      supprimerToken.hidden = !hasStoredPat;
      reinitialiserSuppression();
      githubPat.input.value = '';
      githubPat.input.placeholder = hasStoredPat
        ? 'Token enregistré. Laissez ce champ vide pour le conserver.'
        : '';
    },
    acceptRemoteSettings(settings) {
      settingsDirty = false;
      this.populate(settings);
    },
    /*
     * Le statut est écrit même quand la page est cachée (U5.2) : ainsi le
     * designer qui arrive par la pastille trouve la cause déjà là, au lieu d'un
     * cadre vide. C'est la phrase fausse — « Configuration enregistrée » sans
     * enregistrement — qui imposait auparavant de ne rien écrire hors de la vue.
     *
     * `geste` vient du sandbox, et il nomme quoi corriger. L'UI ne le formule
     * pas : elle ne connaît ni le statut HTTP ni la validité des réglages.
     */
    updateConnection(state, geste) {
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
     * Marque les deux chemins pour ce qu'ils sont : un repli, ou la décision.
     * Le libellé le dit, parce qu'un champ dont personne ne se sert doit le
     * dire là où on le lit, pas dans une note à côté.
     */
    afficherGouvernance({ gouverne, resume }) {
      gouvernance.textContent = resume ?? '';
      gouvernance.hidden = !resume;
      const repli = gouverne === 'repository' ? ' (repli)' : '';
      componentsPath.label.textContent = `Chemin des composants${repli}`;
      tokensPath.label.textContent = `Chemin des tokens${repli}`;
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
