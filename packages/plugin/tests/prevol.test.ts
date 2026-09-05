/**
 * Le verdict du pré-vol (U3.1).
 *
 * Ce que ces tests tiennent : que le clic supplémentaire ne soit demandé que
 * lorsqu'il achète quelque chose. Un export identique au dépôt n'atteint jamais
 * la publication, et son verdict ne propose donc aucune action — c'est la
 * réponse à la seule objection sérieuse contre le pré-vol.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { verdictDePrevol } from '../src/prevol';

test('un contenu identique ne propose aucune action', () => {
  const verdict = verdictDePrevol({
    code: 'identique',
    genre: 'component',
    ou: 'branche main',
    avertissements: 0,
  });
  assert.equal(verdict.action, null);
  assert.match(verdict.texte, /branche main/);
  assert.match(verdict.texte, /Rien à publier/);
});

test('un contenu à publier propose la publication, et dit où', () => {
  const verdict = verdictDePrevol({
    code: 'a-publier',
    genre: 'component',
    chemin: 'src/components/Button/Button.contract.json',
    avertissements: 0,
  });
  assert.equal(verdict.action, 'Publier et ouvrir la pull request');
  assert.match(verdict.texte, /src\/components\/Button\/Button\.contract\.json/);
});

test('les points à corriger passent en premier, sans rien bloquer', () => {
  const verdict = verdictDePrevol({
    code: 'a-publier',
    genre: 'component',
    chemin: 'src/components/Button/Button.contract.json',
    avertissements: 3,
  });
  assert.match(verdict.texte, /^3 points à corriger dans Figma\./);
  // Un avertissement n'est pas un refus : il change l'ordre de lecture, pas le
  // droit de publier.
  assert.equal(verdict.action, 'Publier et ouvrir la pull request');
});

test('un seul point ne se dit pas au pluriel', () => {
  const { texte } = verdictDePrevol({
    code: 'a-publier',
    genre: 'component',
    chemin: 'x',
    avertissements: 1,
  });
  assert.match(texte, /^1 point à corriger/);
});

test('sans repository, l’action est le téléchargement, et elle nomme l’artefact', () => {
  const contrat = verdictDePrevol({ code: 'sans-depot', genre: 'component', avertissements: 0 });
  const tokens = verdictDePrevol({ code: 'sans-depot', genre: 'tokens', avertissements: 0 });

  assert.equal(contrat.action, 'Télécharger le contrat');
  assert.equal(tokens.action, 'Télécharger les tokens');
  assert.match(contrat.texte, /téléchargé sur votre poste/);
  assert.notEqual(contrat.texte, tokens.texte);
});

test('seul le verdict « identique » se passe d’action', () => {
  const codes = ['a-publier', 'identique', 'sans-depot'] as const;
  for (const code of codes) {
    const { action } = verdictDePrevol({ code, genre: 'tokens', avertissements: 0, chemin: 'x', ou: 'y' });
    assert.equal(action === null, code === 'identique', code);
  }
});
