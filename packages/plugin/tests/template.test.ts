import assert from 'node:assert/strict';
import test from 'node:test';
import type { Contract } from '@ucm-kit/core/format';
import { modeleDeRegles, nombreDeRegles } from '../src/template/modele';
import type { ModeleDeRegles } from '../src/template/modele';

type ContratLu = Pick<Contract, 'props' | 'stateModel'>;

/**
 * Une ligne par section : son tag, puis ses éléments. Une règle s'écrit par sa
 * cible, ou par son tag quand elle n'en a pas ; un séparateur s'écrit `|`.
 */
function resume(modele: ModeleDeRegles): string[] {
  return modele.sections.map((section) => `${section.tag} : ${section.elements
    .map((element) => (element.genre === 'separateur' ? '|' : element.cible ?? `@${element.tag}`))
    .join(' ')}`);
}

const contratDeRoot: ContratLu = {
  props: {
    tone: { type: 'enum', values: ['a', 'b'] },
    scale: { type: 'enum', values: ['s', 'm', 'l'] },
    mark: { type: 'boolean', default: false },
  },
};

test('le modèle pose une @usage, une @prop par valeur groupée par axe, une @boolean et une @icons', () => {
  const modele = modeleDeRegles('Root', contratDeRoot);

  assert.equal(modele.nom, 'Root');
  assert.deepEqual(resume(modele), [
    'usage : @usage',
    'prop : tone.a tone.b | scale.s scale.m scale.l',
    'boolean : mark',
    'icons : @icons',
  ]);
  assert.equal(nombreDeRegles(modele), 8);
});

test('un axe renommé par la couche sémantique écrit sa clé publiée, jamais son nom Figma', () => {
  const modele = modeleDeRegles('Root', {
    props: { size: { type: 'enum', values: ['small', 'medium'], figmaName: 'Scale' } },
  });

  assert.deepEqual(resume(modele)[1], 'prop : size.small size.medium');
});

test('l’axe d’états vient en dernier groupe, et son disabled ne donne aucune @boolean', () => {
  const modele = modeleDeRegles('Root', {
    props: {
      tone: { type: 'enum', values: ['a', 'b'] },
      disabled: { type: 'boolean', default: false },
      mark: { type: 'boolean', default: true },
    },
    stateModel: {
      axis: 'states',
      states: { default: {}, hover: { selector: ':hover' }, disable: { selector: '[disabled]' } },
      precedence: ['disable', 'hover', 'default'],
    },
  });

  assert.deepEqual(resume(modele), [
    'usage : @usage',
    'prop : tone.a tone.b | states.default states.hover states.disable',
    'boolean : mark',
    'icons : @icons',
  ]);
});

test('un booléen disabled sans axe d’états reste une @boolean', () => {
  const modele = modeleDeRegles('Root', { props: { disabled: { type: 'boolean', default: false } } });

  assert.deepEqual(resume(modele)[1], 'boolean : disabled');
});

test('un composant sans propriété donne les sections générale et icônes seules', () => {
  assert.deepEqual(resume(modeleDeRegles('Root', {})), ['usage : @usage', 'icons : @icons']);
});

test('TEXT, INSTANCE_SWAP, SLOT et icône runtime ne donnent aucune règle', () => {
  const modele = modeleDeRegles('Root', {
    props: {
      label: { type: 'string', default: 'Texte' },
      glyph: { type: 'instance-swap', default: '1:2' },
      content: { type: 'slot', default: true },
      leadName: { type: 'icon', policy: 'modifiable' },
    },
  });

  assert.deepEqual(resume(modele), ['usage : @usage', 'icons : @icons']);
  const tags = modele.sections.flatMap((section) => section.elements)
    .flatMap((element) => (element.genre === 'regle' ? [element.tag] : []));
  for (const absent of ['default', 'do', 'dont', 'pairs']) {
    assert.equal(tags.includes(absent as never), false, absent);
  }
});
