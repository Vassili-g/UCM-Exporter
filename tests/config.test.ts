import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRepositoryPath, parseGithubRepository, validateSettings } from '../src/config';

test('parseGithubRepository extrait owner/repo depuis une URL GitHub HTTPS', () => {
  assert.deepEqual(parseGithubRepository('https://github.com/acme/design-system.git'), {
    owner: 'acme',
    repo: 'design-system',
  });
  assert.equal(parseGithubRepository('https://gitlab.com/acme/design-system'), null);
  assert.equal(parseGithubRepository('https://github.com/acme/design-system/issues'), null);
});

test('parseGithubRepository accepte l’URL exacte du playground et un lien Markdown copié', () => {
  assert.deepEqual(parseGithubRepository('https://github.com/Vassili-g/Components-Playground'), {
    owner: 'Vassili-g',
    repo: 'Components-Playground',
  });
  assert.deepEqual(
    parseGithubRepository('[Vassili-g/Components-Playground](https://github.com/Vassili-g/Components-Playground)'),
    { owner: 'Vassili-g', repo: 'Components-Playground' },
  );
});

test('normalizeRepositoryPath retire les slashes de bord et refuse la traversée', () => {
  assert.equal(normalizeRepositoryPath('/src\\components/'), 'src/components');
  assert.equal(normalizeRepositoryPath('../components'), null);
  assert.equal(normalizeRepositoryPath(''), null);
});

test('validateSettings utilise le PAT stocké quand le champ UI reste vide', () => {
  const result = validateSettings({
    repoUrl: 'https://github.com/acme/design-system',
    baseBranch: 'main',
    componentsPath: 'src/components/',
    tokensPath: 'src/tokens/',
    githubPat: '',
  }, 'github_pat_secret');

  assert.equal(result.valid, true);
  assert.deepEqual(result.config, {
    repoUrl: 'https://github.com/acme/design-system',
    baseBranch: 'main',
    componentsPath: 'src/components',
    tokensPath: 'src/tokens',
    owner: 'acme',
    repo: 'design-system',
    githubPat: 'github_pat_secret',
  });
});

test('validateSettings détaille une configuration invalide sans planter', () => {
  const result = validateSettings({
    repoUrl: 'invalid',
    baseBranch: '',
    componentsPath: '../components',
    tokensPath: '',
  });

  assert.equal(result.valid, false);
  assert.equal(result.config, null);
  assert.deepEqual(Object.keys(result.errors).sort(), [
    'baseBranch',
    'componentsPath',
    'githubPat',
    'repoUrl',
    'tokensPath',
  ]);
});
