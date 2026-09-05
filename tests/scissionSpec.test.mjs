/**
 * La preuve du TEMPS 1 de la scission de la spécification (T8.1).
 *
 * `UCM-EXPORTER-SPEC.md` décrivait le format ET le moteur, et sa découpe
 * traverse les paragraphes. Une relecture à l'œil de 1 651 lignes ne dit pas si
 * une règle a disparu : ce test le dit mécaniquement. Il compare le document
 * FIGÉ juste avant la scission — `fixtures/spec-avant-scission.md`, qui n'a
 * aucun autre emploi — aux deux documents produits.
 *
 * Ce qu'il prouve, et ce qu'il ne prouve pas. Il prouve qu'aucune ligne n'a été
 * perdue. Il ne dit JAMAIS qu'une ligne est allée du bon côté, et il ne voit pas
 * les lignes ajoutées : une duplication intégrale le satisferait. D'où le second
 * test, qui n'assène rien mais COMPTE ce qui vit encore dans les deux fichiers.
 * Ce nombre est la cible du temps 2, et sa décroissance en est la seule mesure.
 *
 * Durée de vie : ces deux tests meurent avec le temps 2, remplacés par le test
 * d'ancres et de liens de `docLinks.test.ts` — et la fixture figée part avec
 * eux. Un contrôle qui survit à sa cause devient une information périmée.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const lire = (relatif) =>
  fs.readFileSync(path.join(racine, relatif), 'utf8').split(/\r?\n/);

const FIGE = 'tests/fixtures/spec-avant-scission.md';
const PRODUITS = ['docs/FORMAT.md', 'packages/plugin/SPEC.md'];

/**
 * Les lignes porteuses : le vide et l'indentation ne se comparent pas.
 *
 * La cible d'un lien relatif perd sa profondeur (`./` et `../`). C'est la seule
 * chose que le déplacement des documents avait le DROIT de changer : une
 * adresse n'est pas une règle, et `[CONCEPT.md](./CONCEPT.md)` lu depuis
 * `packages/plugin/` doit s'écrire `../../CONCEPT.md` sous peine de pointer
 * dans le vide. Tout le reste de la ligne se compare au caractère près.
 */
const porteuses = (lignes) =>
  lignes
    .map((l) => l.trim().replace(/\]\((?:\.\.?\/)+/g, ']('))
    .filter((l) => l !== '');

test('aucune ligne de la spécification figée n’a disparu de la scission', () => {
  const avant = porteuses(lire(FIGE));
  const apres = new Set(PRODUITS.flatMap((f) => porteuses(lire(f))));

  const perdues = [...new Set(avant)].filter((ligne) => !apres.has(ligne));
  assert.deepEqual(
    perdues,
    [],
    `${perdues.length} ligne(s) de ${FIGE} n’apparaissent dans aucun des deux documents :\n` +
      perdues.map((l) => `  ${l.slice(0, 100)}`).join('\n'),
  );
});

test('la duplication restante est comptée, et elle ne remonte pas', () => {
  const avant = porteuses(lire(FIGE));
  const [format, moteur] = PRODUITS.map((f) => new Set(porteuses(lire(f))));

  // Seules les lignes UNIQUES dans le document figé sont comptées. Une ligne
  // qui s'y répétait déjà — un ``` de bloc de code, un séparateur de tableau,
  // un `---` — se retrouve des deux côtés sans qu'aucun paragraphe ait été
  // dupliqué : la compter ferait un plancher que le temps 2 ne pourrait pas
  // atteindre, donc une cible qui ment.
  const occurrences = new Map();
  for (const ligne of avant) occurrences.set(ligne, (occurrences.get(ligne) ?? 0) + 1);

  const partagees = [...occurrences]
    .filter(([ligne, n]) => n === 1 && format.has(ligne) && moteur.has(ligne))
    .map(([ligne]) => ligne);

  // Le plafond est le relevé du jour de la scission, pas un objectif. Il
  // n'autorise aucune remontée : le temps 2 le fait baisser, et chaque commit
  // qui résorbe un paragraphe le descend d'autant. À zéro, ces deux tests et la
  // fixture figée s'en vont.
  const PLAFOND = 756;
  assert.ok(
    partagees.length <= PLAFOND,
    `La duplication est remontée : ${partagees.length} lignes vivent dans les deux ` +
      `documents, contre ${PLAFOND} au plus. Le temps 2 la fait baisser, jamais monter.`,
  );
  console.log(
    `Duplication restante entre docs/FORMAT.md et packages/plugin/SPEC.md : ` +
      `${partagees.length} lignes (plafond ${PLAFOND}).`,
  );
});
