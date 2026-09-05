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
  assert.deepEqual(parseGithubRepository('https://github.com/Vassili-g/UCM-Playground'), {
    owner: 'Vassili-g',
    repo: 'UCM-Playground',
  });
  assert.deepEqual(
    parseGithubRepository('[Vassili-g/UCM-Playground](https://github.com/Vassili-g/UCM-Playground)'),
    { owner: 'Vassili-g', repo: 'UCM-Playground' },
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
  // `tokensPath` vide n'est PLUS une erreur : c'est un repli absent (U5.1).
  assert.deepEqual(Object.keys(result.errors).sort(), [
    'baseBranch',
    'componentsPath',
    'githubPat',
    'repoUrl',
  ]);
});

test('un chemin vide laisse le repository décider, un chemin fautif est refusé', () => {
  // U5.1 : les deux chemins sont un repli. Leur absence est une réponse, et
  // `repositoryLayout` la remplace par ce que le repository dit de lui-même.
  // Leur FORME reste vérifiée : un chemin qui remonte hors du repository
  // n'écrirait pas là où on croit.
  const vides = validateSettings({
    repoUrl: 'https://github.com/acme/design-system',
    baseBranch: 'main',
    componentsPath: '',
    tokensPath: '   ',
    githubPat: 'github_pat_secret',
  });

  assert.equal(vides.valid, true);
  assert.equal(vides.config?.componentsPath, null);
  assert.equal(vides.config?.tokensPath, null);

  const fautif = validateSettings({
    repoUrl: 'https://github.com/acme/design-system',
    baseBranch: 'main',
    componentsPath: '../ailleurs',
    tokensPath: '',
    githubPat: 'github_pat_secret',
  });

  assert.equal(fautif.valid, false);
  assert.deepEqual(Object.keys(fautif.errors), ['componentsPath']);
});
