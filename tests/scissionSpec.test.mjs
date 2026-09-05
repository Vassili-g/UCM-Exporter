/**
 * La preuve de la scission de la spécification (T8.1) : rien n'est perdu, et la
 * duplication ne remonte pas.
 *
 * `UCM-EXPORTER-SPEC.md` décrivait le format ET le moteur, et sa découpe
 * traverse les paragraphes. Une relecture à l'œil de 1 651 lignes ne dit pas si
 * une règle a disparu : ces tests le disent mécaniquement, en comparant le
 * document FIGÉ juste avant la scission — `fixtures/spec-avant-scission.md`, qui
 * n'a aucun autre emploi — aux deux documents produits.
 *
 * ## Pourquoi la comparaison porte sur des PHRASES, et plus sur des lignes
 *
 * **Le temps 1 comparait des lignes, et c'était juste : il ne faisait que
 * déplacer.** Chaque ligne partait telle quelle dans l'un des deux fichiers, ou
 * dans les deux. Une comparaison ligne à ligne prouvait exactement ce qu'on
 * voulait prouver, au caractère près.
 *
 * **Le temps 2 ne peut pas tenir cette contrainte, et l'a montré dès son
 * troisième paragraphe.** Résorber un doublon consiste à retirer d'un fichier ce
 * que l'autre garde — mais une LIGNE PHYSIQUE mélange souvent les deux sujets,
 * parce que 53 % des lignes porteuses du document d'origine le faisaient. En
 * section 8, la même ligne portait la fin d'une règle de rendu CSS et le début
 * d'une décision du moteur. La couper au bon endroit fait disparaître la ligne
 * des deux fichiers, sans qu'un mot soit perdu.
 *
 * **La bonne granularité pour le temps 2 est donc la phrase.** Ce n'est pas un
 * relâchement du contrôle : une phrase supprimée reste détectée, une phrase
 * réécrite aussi. Ce qui cesse d'être détecté est le seul geste que le temps 2
 * doit pouvoir faire — reformer les retours à la ligne d'un paragraphe qu'on
 * vient de couper en deux.
 *
 * Ce qu'aucun des deux tests ne dit, et il faut le lire avant de croire un
 * vert : ils ne disent JAMAIS qu'une phrase est allée du bon côté. C'est la
 * revue de diff qui le dit, et c'est pour cela que le temps 2 se fait par
 * petits commits.
 *
 * Durée de vie : ces deux tests meurent quand le compteur atteint zéro,
 * remplacés par le test d'ancres et de liens de `docLinks.test.ts` — et la
 * fixture figée part avec eux. Un contrôle qui survit à sa cause devient une
 * information périmée.
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

/**
 * Le texte d'un document, ramené à une seule ligne d'espaces normalisés.
 *
 * C'est ce qui rend la comparaison insensible aux retours à la ligne, donc au
 * seul geste que le temps 2 impose : recouper un paragraphe dont la moitié
 * part ailleurs.
 */
const texteContinu = (lignes) => porteuses(lignes).join(' ').replace(/\s+/g, ' ');

/**
 * Les BLOCS d'un document : un titre, une puce, une ligne de tableau, ou un
 * paragraphe de lignes consécutives.
 *
 * Le découpage se fait ici et pas sur le texte entier, sinon une phrase courrait
 * d'un paragraphe au titre suivant — un enchaînement qu'aucun des deux documents
 * produits ne peut reproduire, puisque la scission a précisément séparé ce que
 * ce titre annonçait.
 */
function blocs(lignes) {
  const trouves = [];
  let courant = [];
  const fermer = () => {
    if (courant.length > 0) trouves.push(courant.join(' ').replace(/\s+/g, ' '));
    courant = [];
  };
  for (const ligne of porteuses(lignes)) {
    // Un titre, une puce et une ligne de tableau ouvrent leur propre bloc : la
    // ligne du dessus ne les continue pas.
    // Un titre, une puce, une ligne de tableau et une clôture de bloc de code
    // ouvrent leur propre bloc : la ligne du dessus ne les continue pas. Sans
    // la clôture, l'exemple JSON du contrat ne formerait qu'un seul bloc avec
    // la phrase qui l'annonce, et un blanc déplacé suffirait à le perdre.
    if (/^(#|[-*+] |\d+\. |\||```)/.test(ligne)) fermer();
    courant.push(ligne);
    if (/^(#|\||```)/.test(ligne)) fermer();
  }
  fermer();
  return trouves;
}

/**
 * Les morceaux comparés : chaque bloc, découpé en phrases quand il en porte.
 *
 * Découpe après un point suivi d'un blanc et d'un début de phrase — majuscule,
 * guillemet, gras, accent ou dos de code. Un bloc sans point final ressort
 * entier, ce qui convient : on veut des morceaux assez gros pour être
 * reconnaissables, pas une analyse grammaticale.
 *
 * Ce qui est écarté ne l'est PAS par une longueur seule : un morceau n'est exigé
 * que s'il est UNIQUE dans le document figé. Un `---`, une clôture de bloc de
 * code ou un séparateur de tableau se répètent partout et ne prouveraient rien ;
 * une règle, elle, ne s'écrit qu'une fois. Le seuil de longueur qui remplissait
 * ce rôle avant laissait passer les phrases courtes — « Le contrat ne publie
 * aucun index de ses tokens. » en fait 37 caractères, et sa suppression des DEUX
 * fichiers passait au vert. Mesuré en la supprimant.
 */
function morceaux(lignes) {
  return blocs(lignes)
    .flatMap((bloc) => bloc.split(/(?<=\.)\s+(?=[«*`A-ZÀ-ÝÉÈÊ])/u))
    .map((p) => p.trim())
    .filter((p) => p.replace(/[^\p{L}\p{N}]/gu, '').length >= 12);
}

test('aucune phrase de la spécification figée n’a disparu de la scission', () => {
  // Seuls les morceaux UNIQUES du document figé sont exigés : ce qui s'y
  // répétait déjà se retrouve partout sans rien prouver.
  const releve = new Map();
  for (const m of morceaux(lire(FIGE))) releve.set(m, (releve.get(m) ?? 0) + 1);
  const attendues = [...releve].filter(([, n]) => n === 1).map(([m]) => m);
  assert.ok(attendues.length > 100, `seulement ${attendues.length} phrases relevées dans ${FIGE}`);

  const produits = PRODUITS.map((f) => texteContinu(lire(f)));
  const perdues = [...new Set(attendues)].filter((p) => !produits.some((t) => t.includes(p)));

  assert.deepEqual(
    perdues,
    [],
    `${perdues.length} phrase(s) de ${FIGE} n’apparaissent dans aucun des deux documents :\n` +
      perdues.map((p) => `  ${p.slice(0, 120)}`).join('\n'),
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

  // Le plafond est le relevé du jour, pas un objectif. Il n'autorise aucune
  // remontée : chaque commit du temps 2 qui résorbe un paragraphe le descend
  // d'autant. À zéro, ces deux tests et la fixture figée s'en vont.
  const PLAFOND = 695;
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
