/**
 * Page de configuration GitHub de l'UI TokenLintel.
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
  return { wrapper, input, error };
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
  const element = document.createElement('div');
  element.className = 'page-stack';
  element.hidden = true;

  const card = document.createElement('section');
  card.className = 'card config-card';
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Configuration du repository';

  const markDirty = () => { settingsDirty = true; };
  const repoUrl = createField('repoUrl', 'Repo URL', {
    placeholder: 'https://github.com/mon-org/design-system-v3',
  }, markDirty);
  const baseBranch = createField('baseBranch', 'Base branch', { placeholder: 'main' }, markDirty);
  const componentsPath = createField(
    'componentsPath',
    'Components path',
    { placeholder: 'src/components' },
    markDirty,
  );
  const tokensPath = createField('tokensPath', 'Tokens path', { placeholder: 'src/tokens' }, markDirty);
  const githubPat = createField('githubPat', 'Personal Access Token', {
    type: 'password',
    help: 'Utilisez un fine-grained token limité à ce repo avec Contents: Read and write et Pull requests: Read and write.',
  }, markDirty);
  const fields = { repoUrl, baseBranch, componentsPath, tokensPath, githubPat };

  const status = document.createElement('div');
  status.className = 'config-status';
  status.setAttribute('aria-live', 'polite');

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
      saveButton.disabled = true;
      status.dataset.state = 'loading';
      status.textContent = 'Enregistrement et test de connexion…';
      onSave(settings);
    },
  });

  card.append(
    title,
    repoUrl.wrapper,
    baseBranch.wrapper,
    componentsPath.wrapper,
    tokensPath.wrapper,
    githubPat.wrapper,
    saveButton,
    status,
  );
  element.appendChild(card);

  return {
    element,
    renderErrors,
    populate(settings) {
      if (settingsDirty) return;
      repoUrl.input.value = settings.repoUrl || '';
      baseBranch.input.value = settings.baseBranch || 'main';
      componentsPath.input.value = settings.componentsPath || 'src/components';
      tokensPath.input.value = settings.tokensPath || 'src/tokens';
      hasStoredPat = Boolean(settings.hasPat);
      githubPat.input.value = '';
      githubPat.input.placeholder = hasStoredPat
        ? 'Token enregistré — laisser vide pour le conserver'
        : '';
    },
    acceptRemoteSettings(settings) {
      settingsDirty = false;
      this.populate(settings);
    },
    updateConnection(state) {
      if (state === 'checking') return;
      saveButton.disabled = false;
      if (element.hidden) return;
      status.dataset.state = state === 'connected' ? 'success' : 'error';
      status.textContent = state === 'connected'
        ? 'Configuration enregistrée · repository connecté.'
        : 'Configuration enregistrée · connexion impossible.';
    },
    showSaveError() {
      saveButton.disabled = false;
      status.dataset.state = 'error';
      status.textContent = 'Configuration non enregistrée : corrigez les champs signalés.';
    },
    releaseSaveButton() {
      saveButton.disabled = false;
    },
  };
}
