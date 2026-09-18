/**
 * Les phrases que le designer lit, jugées comme le dépôt juge sa prose.
 *
 * `scripts/controle-style.mjs` ne lit que les commentaires d'une source : une
 * tournure refusée partout ailleurs entrait donc librement dans un texte
 * affiché, et deux y sont entrées. Ce test ferme cette porte, sur les fichiers
 * qui portent les textes de l'interface.
 *
 * Il juge les littéraux qui sont des phrases, et eux seuls : un sélecteur, une
 * classe ou une clé n'en est pas une.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

/** Les fichiers dont les chaînes atteignent l'écran du designer. */
const SOURCES = [
  '../src/connexion.ts',
  '../src/forges/termes.ts',
  '../src/prevol.ts',
  '../src/ui/components/ConfigurationPage.ts',
  '../src/ui/components/CarteDepot.ts',
  '../src/ui/components/ListeDesDepots.ts',
];

/**
 * Une phrase : elle porte une espace et se termine par une ponctuation de fin.
 * Ce filtre écarte les sélecteurs, les noms de classe et les clés, qui n'ont
 * pas de lecteur humain.
 */
function estUnePhrase(texte: string): boolean {
  return / /.test(texte) && /[.…:?!]$/.test(texte.trim());
}

/** Les littéraux d'une source, guillemets simples, doubles et gabarits. */
function phrasesDe(contenu: string): string[] {
  const litteraux = contenu.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g);
  return [...litteraux]
    .map((trouve) => trouve[1] ?? trouve[2] ?? trouve[3] ?? '')
    .filter(estUnePhrase);
}

const PHRASES = SOURCES.flatMap((source) => {
  const chemin = join(__dirname, source);
  return phrasesDe(readFileSync(chemin, 'utf8')).map((texte) => ({ source, texte }));
});

test('les fichiers de textes en portent assez pour que la loi contrôle quelque chose', () => {
  assert.ok(PHRASES.length >= 40, `seules ${PHRASES.length} phrases trouvées`);
});

/**
 * L'apostrophe courbe, partout.
 *
 * Deux formes dans une même interface se voient : le designer lit « n'est » à
 * côté de « n’a ». Le clavier pose la droite, et rien ne la rattrapait.
 */
test('aucun texte affiché ne porte d’apostrophe droite', () => {
  const fautifs = PHRASES.filter(({ texte }) => /[a-zà-ÿ]'[a-zà-ÿ]/i.test(texte));
  assert.deepEqual(
    fautifs.map(({ source, texte }) => `${source} : ${texte}`),
    [],
  );
});

/**
 * Les tournures que la skill `rediger-sans-tics-ia` nomme.
 *
 * Elles annoncent un effet sans dire par quel mécanisme. Un commentaire peut
 * les employer en donnant ce mécanisme dans la même phrase ; un texte affiché
 * n'a pas la place de le faire, et le designer attend un geste, pas une
 * promesse.
 */
const TICS = ['permet de', 'permettent de', 'assure', 'améliore', 's’inscrit dans'];

test('aucun texte affiché n’annonce un effet sans son mécanisme', () => {
  const fautifs = PHRASES.flatMap(({ source, texte }) => TICS
    .filter((tic) => texte.toLowerCase().includes(tic))
    .map((tic) => `${source} : « ${tic} » dans « ${texte} »`));
  assert.deepEqual(fautifs, []);
});
