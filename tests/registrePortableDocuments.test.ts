/** Refuse toute dépendance à une stack dans les documents portables. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');

/** Les documents lus depuis dehors, et eux seuls. */
const PORTABLES = ['CONCEPT.md', 'docs/FORMAT.md', 'docs/CHANGELOG-FORMAT.md'];

/**
 * Les mots refusés, repris de `registrePortable.test.mjs` sans les élargir.
 *
 * `TypeScript` n'y est pas : un document a le droit de dire qu'un adaptateur
 * TypeScript existe. Ce qu'on refuse est de promettre AU LECTEUR que son code
 * est du React, dans un fichier `.tsx`, ou qu'il ressemble au Playground.
 */
const MOTS_BANNIS = [/\bReact\b/, /\.tsx\b/, /\bTSX\b/, /\bPlayground\b/];

/**
 * La seule exemption de forme, et c'est celle du filet du code : une ligne qui
 * nomme le motif PAR DÉFAUT de `ucm.config.json` décrit une VALEUR qu'un
 * repository remplace par la sienne. Elle n'affirme rien à son lecteur — elle
 * lui dit au contraire où changer ce qu'il n'a pas.
 */
function nommeLeMotifParDefaut(ligne: string): boolean {
  return ligne.includes('ucm.config.json') && ligne.includes('{dir}/{id}');
}

/**
 * Les lignes inscrites, avec la raison qui les tient et ce qui les lèvera.
 *
 * Le texte est celui de la ligne, sans ses espaces de bord. Une ligne qui bouge
 * dans son document ne casse donc rien ; une ligne qui change de mots, si — et
 * c'est voulu, puisque changer ses mots est précisément ce qu'on attend d'elle.
 */
/**
 * **Elle est vide, et c'est le verdict de T8.7.** Elle a porté une entrée : la ligne
 * de `docs/FORMAT.md` qui promettait « le composant React et son interface Props » à
 * qui lit la forme publiée. Elle ne pouvait pas être corrigée tant que
 * `scissionSpec.test.mjs` exigeait que chaque ligne du document figé survive ; le
 * temps 2 de T8.1 a retiré cette fixture le 5 septembre 2026, et la ligne a été
 * reformulée le même jour — le contrat nomme un symbole, pas une stack.
 */
const INSCRITES: { fichier: string; ligne: string; jusqua: string }[] = [];

const lignesDe = (relatif: string): string[] =>
  fs.readFileSync(path.join(racine, relatif), 'utf8').split(/\r?\n/);

test('aucun document portable ne promet une stack à qui le lit', () => {
  const inscrites = new Set(INSCRITES.map(({ fichier, ligne }) => `${fichier}\u0000${ligne}`));

  const fautes: string[] = [];
  for (const relatif of PORTABLES) {
    lignesDe(relatif).forEach((ligne, index) => {
      const nue = ligne.trim();
      if (!MOTS_BANNIS.some((mot) => mot.test(nue))) return;
      if (nommeLeMotifParDefaut(nue)) return;
      if (inscrites.has(`${relatif}\u0000${nue}`)) return;
      fautes.push(`${relatif}:${index + 1} — ${nue}`);
    });
  }

  assert.deepEqual(
    fautes,
    [],
    'Ces lignes promettent une stack à un lecteur qui n\'en a peut-être aucune :\n'
      + `${fautes.join('\n')}\n`
      + "Un contrat décrit ce que Figma publie, pas la langue du code qui le lit. "
      + "Si la ligne ne peut pas être corrigée tout de suite, l'inscrire dans "
      + 'INSCRITES avec ce qui la lèvera — jamais élargir MOTS_BANNIS.',
  );
});

test('aucune exemption ne survit à la ligne qu’elle couvrait', () => {
  const perimees = INSCRITES.filter(
    ({ fichier, ligne }) => !lignesDe(fichier).some((l) => l.trim() === ligne),
  ).map(({ fichier, ligne }) => `${fichier} — ${ligne}`);

  assert.deepEqual(
    perimees,
    [],
    'Ces exemptions ne couvrent plus aucune ligne : la ligne a été corrigée ou '
      + `déplacée, et l'inscription ment depuis.\n${perimees.join('\n')}\n`
      + 'Retirer l’entrée. Si INSCRITES se vide, T8.7 est entière et ce second '
      + 'test peut partir avec la liste.',
  );
});
