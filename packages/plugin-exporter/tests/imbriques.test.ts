/**
 * Le relevé des imbriqués sans règles, et les points bloquants qu'il donne.
 *
 * Le relevé est pur : il reçoit les racines de la matrice, les maîtres déjà lus
 * et les noms des composants contractés. Les arbres sont synthétiques.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  declarerLesImbriquesSansRegles,
  pointsDesImbriques,
  releverLesImbriques,
  sousUnImbriqueSansRegles,
} from '../src/contract/imbriques';
import type { ReleveDesImbriques } from '../src/contract/imbriques';
import { node } from './aides/figmaFaux';

const variante = (options: string[]) => ({
  type: 'VARIANT', variantOptions: options, defaultValue: options[0],
});
const texte = { type: 'TEXT', defaultValue: 'OK' };

/** Un component set nommé, tel que Figma le rend au-dessus d'un variant. */
function setDe(nom: string, definitions: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return { id: `set-${nom}`, type: 'COMPONENT_SET', name: nom, componentPropertyDefinitions: definitions, ...extra };
}

const setBouton = setDe('Button', { Size: variante(['Small', 'Large']), 'Label#1:2': texte });
const setIcone = setDe('Icon', { 'Name#1:3': texte });

/** Relève ce qu'une racine abrite, à partir des maîtres que le test donne. */
function relever(
  racine: any,
  porteurs: Array<[any, ReturnType<typeof setDe>]>,
  options: { contractes?: string[]; horsDuParent?: string[] } = {},
): ReleveDesImbriques {
  const contractes = new Set(options.contractes ?? []);
  const maitres = new Map(porteurs.map(([instance, set]) => [
    instance.id,
    { id: `maitre-${set.name}`, type: 'COMPONENT', name: 'Size=Small', parent: set } as any,
  ]));
  const composed = new Map(porteurs
    .filter(([, set]) => contractes.has(set.name.toLowerCase()))
    .map(([instance, set]) => [instance.id, { component: set.name, figmaLayer: instance.name }]));
  return releverLesImbriques({
    composant: racine,
    variants: [racine],
    maitres,
    contractes,
    composed,
    horsDuParent: options.horsDuParent ?? [],
  });
}

const titres = (releve: ReleveDesImbriques, racine: any) =>
  pointsDesImbriques(racine, releve).map(({ point }) => point.titre);

test('un imbriqué sans règles donne un point qui nomme les deux composants', () => {
  const bouton = node('INSTANCE', 'Action', []);
  const racine = node('COMPONENT', 'Exemple', [bouton]);

  const releve = relever(racine, [[bouton, setBouton]]);
  const [{ point, nodeIds }] = pointsDesImbriques(racine, releve);

  assert.equal(point.severite, 'danger');
  assert.equal(
    point.titre,
    'Le composant « Exemple » intègre « Button », dont 2 propriétés ne sont pas documentées :',
  );
  assert.deepEqual(point.elements, ['size', 'label']);
  assert.equal(
    point.impact,
    'Sans les règles de « Button », le contrat de « Exemple » décrit les internes de '
    + '« Button » au lieu de le réutiliser.',
  );
  assert.equal(
    point.action,
    'Créez et complétez les règles de « Button », puis relancez l’analyse de « Exemple » '
    + 'avant de l’exporter.',
  );
  assert.deepEqual(nodeIds, [bouton.id]);
});

test('chaque imbriqué sans règles a son propre point, dans l’ordre des calques', () => {
  const bouton = node('INSTANCE', 'Action', []);
  const icone = node('INSTANCE', 'Glyphe', []);
  const second = node('INSTANCE', 'Autre action', []);
  const racine = node('COMPONENT', 'Exemple', [bouton, icone, second]);

  const releve = relever(racine, [[bouton, setBouton], [icone, setIcone], [second, setBouton]]);

  assert.deepEqual(titres(releve, racine), [
    'Le composant « Exemple » intègre « Button », dont 2 propriétés ne sont pas documentées :',
    'Le composant « Exemple » intègre « Icon », dont une propriété n’est pas documentée :',
  ]);
  assert.deepEqual(releve.sansRegles[0].nodeIds, [bouton.id, second.id]);
});

test('un imbriqué qui a ses règles ne donne aucun point, ni lui ni ce qu’il contient', () => {
  const interne = node('INSTANCE', 'Pièce', []);
  const bouton = node('INSTANCE', 'Action', [interne]);
  const racine = node('COMPONENT', 'Exemple', [bouton]);

  const releve = relever(
    racine,
    [[bouton, setBouton], [interne, setDe('.piece', { 'Profondeur#1:4': texte })]],
    { contractes: ['button'], horsDuParent: ['profondeur'] },
  );

  assert.deepEqual(releve.sansRegles, []);
  assert.deepEqual(releve.auParent, []);
});

test('une pièce interne posée sous le composant exporté lui prête ses propriétés', () => {
  const interne = node('INSTANCE', 'Pièce', []);
  const racine = node('COMPONENT', 'Exemple', [interne]);

  const releve = relever(racine, [[interne, setDe('.piece', { 'Taille#1:5': texte })]], {
    horsDuParent: ['taille'],
  });

  assert.deepEqual(releve.auParent, ['taille']);
  assert.deepEqual(releve.sansRegles, []);
});

test('la pièce interne d’un imbriqué publié appartient à cet imbriqué', () => {
  const interne = node('INSTANCE', 'Pièce', []);
  const bouton = node('INSTANCE', 'Action', [interne]);
  const racine = node('COMPONENT', 'Exemple', [bouton]);

  const releve = relever(
    racine,
    [[bouton, setBouton], [interne, setDe('.piece', { 'Profondeur#1:4': texte })]],
    { horsDuParent: ['profondeur'] },
  );

  assert.deepEqual(releve.auParent, []);
  assert.deepEqual(releve.sansRegles[0].cles, ['size', 'label', 'profondeur']);
});

test('une propriété qu’aucun imbriqué ne revendique donne un point qui cible le composant', () => {
  const racine = node('COMPONENT', 'Exemple', []);

  const releve = relever(racine, [], { horsDuParent: ['orpheline'] });
  const [{ point, nodeIds }] = pointsDesImbriques(racine, releve);

  assert.equal(
    point.titre,
    'Une propriété de « Exemple » n’est pas documentée, et le plugin n’a pas su nommer le '
    + 'composant imbriqué qui la porte :',
  );
  assert.deepEqual(point.elements, ['orpheline']);
  assert.deepEqual(nodeIds, [racine.id]);
});

test('une icône ne demande pas ses propres règles', () => {
  const icone = node('INSTANCE', 'duck', [node('VECTOR', 'v1'), node('BOOLEAN_OPERATION', 'v2')]);
  const racine = node('COMPONENT', 'Exemple', [icone]);

  assert.deepEqual(relever(racine, [[icone, setDe('duck', {})]]).sansRegles, []);
});

test('un imbriqué tout en tracés qui déclare une propriété garde son point', () => {
  const tuile = node('INSTANCE', 'tile', [node('VECTOR', 'v1')]);
  const racine = node('COMPONENT', 'Exemple', [tuile]);

  const releve = relever(racine, [[tuile, setDe('TileLink', { Variant: variante(['a']) })]]);

  assert.deepEqual(titres(releve, racine), [
    'Le composant « Exemple » intègre « TileLink », dont une propriété n’est pas documentée :',
  ]);
});

test('un imbriqué sans propriété et sans tracé garde son point', () => {
  const separateur = node('INSTANCE', 'div', [node('RECTANGLE', 'r1')]);
  const racine = node('COMPONENT', 'Exemple', [separateur]);

  const releve = relever(racine, [[separateur, setDe('Divider', {})]]);

  assert.deepEqual(titres(releve, racine), [
    'Le composant « Exemple » intègre « Divider », qui n’a pas ses règles d’usage.',
  ]);
});

test('un imbriqué dont les propriétés ne se lisent pas garde son point', () => {
  const mystere = node('INSTANCE', 'mys', [node('VECTOR', 'v1')]);
  const racine = node('COMPONENT', 'Exemple', [mystere]);
  const illisible = setDe('Mystere', {});
  Object.defineProperty(illisible, 'componentPropertyDefinitions', {
    get() { throw new Error('node retiré'); },
  });

  assert.deepEqual(titres(relever(racine, [[mystere, illisible]]), racine), [
    'Le composant « Exemple » intègre « Mystere », qui n’a pas ses règles d’usage.',
  ]);
});

test('un imbriqué tout en tracés qui abrite une dépendance garde son point', () => {
  const dependance = node('INSTANCE', 'dep', []);
  const cadre = node('INSTANCE', 'cad', [node('VECTOR', 'v1'), dependance]);
  const racine = node('COMPONENT', 'Exemple', [cadre]);

  const releve = relever(racine, [[cadre, setDe('Cadre', {})], [dependance, setIcone]], {
    contractes: ['icon'],
  });

  assert.deepEqual(titres(releve, racine), [
    'Le composant « Exemple » intègre « Cadre », qui n’a pas ses règles d’usage.',
  ]);
});

test('un imbriqué rangé sous un calque masqué ne demande aucun geste', () => {
  const bouton = node('INSTANCE', 'Action', []);
  const racine = node('COMPONENT', 'Exemple', [node('FRAME', 'Masqué', [bouton], { visible: false })]);

  assert.deepEqual(relever(racine, [[bouton, setBouton]]).sansRegles, []);
});

test('un imbriqué venu d’une bibliothèque renvoie au fichier de cette bibliothèque', () => {
  const alerte = node('INSTANCE', 'alr', []);
  const racine = node('COMPONENT', 'Exemple', [alerte]);
  const distant = setDe('Alert', { Severity: variante(['info']) }, { remote: true });

  const [{ point }] = pointsDesImbriques(racine, relever(racine, [[alerte, distant]]));

  assert.equal(
    point.action,
    'Les règles de « Alert » vivent dans le fichier de sa bibliothèque. Créez-les là-bas, '
    + 'republiez la bibliothèque, puis relancez l’analyse de « Exemple ».',
  );
});

test('un dessin sous une instance déclarée se tait, un autre non, et un ancêtre illisible ne tait rien', () => {
  const trace = node('VECTOR', 'Shape');
  const bouton = node('INSTANCE', 'Action', [trace]);
  const ailleurs = node('VECTOR', 'Ailleurs');
  const racine = node('COMPONENT', 'Exemple', [bouton, ailleurs]);
  const canal: string[] = [];
  declarerLesImbriquesSansRegles(canal, relever(racine, [[bouton, setBouton]]));

  assert.equal(sousUnImbriqueSansRegles(canal, trace), true);
  assert.equal(sousUnImbriqueSansRegles(canal, ailleurs), false);
  assert.equal(sousUnImbriqueSansRegles([], trace), false);

  const perdu = { id: 'perdu', get parent(): never { throw new Error('node retiré'); } };
  assert.equal(sousUnImbriqueSansRegles(canal, perdu as unknown as SceneNode), false);
});
