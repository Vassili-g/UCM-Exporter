/**
 * Les documents qu'un consommateur QUELCONQUE lit promettent-ils une stack ?
 *
 * **C'est le filet de T2.6 appliqué aux documents, et il manquait.**
 * `packages/kit/tests/registrePortable.test.mjs` interdit « React », « `.tsx` »
 * et « Playground » dans ce que les lecteurs du kit AFFICHENT. La même promesse
 * faite dans un document est aussi fausse et vit plus longtemps : un dépôt Swift
 * qui ouvre `docs/FORMAT.md` pour savoir ce qu'il reçoit y lisait « le composant
 * React et son interface Props ».
 *
 * **Ce que ce test couvre, et pourquoi si peu de fichiers.** Seulement les
 * documents que quelqu'un lit SANS être dans ce projet : le concept, la forme
 * publiée, l'historique des versions. `README.md` et `ROADMAP.md` nomment le
 * Playground parce qu'ils parlent d'un dépôt réel qui existe ; les documents du
 * Playground décrivent l'adaptateur React, qui EST du React ; le plan et les
 * documents de travail racontent l'histoire du projet. Leur interdire le mot
 * juste les ferait mentir dans l'autre sens — c'est la borne que
 * `registrePortable.test.mjs` s'était déjà donnée.
 *
 * ## L'exemption, et pourquoi elle est une LISTE et non une exception
 *
 * `docs/FORMAT.md` porte encore une promesse de stack, et elle ne peut pas être
 * corrigée aujourd'hui : `scissionSpec.test.mjs` exige que chaque ligne du
 * document figé avant la scission (T8.1) survive dans l'un des deux documents
 * produits. Reformuler cette ligne la fait disparaître des deux, et le contrôle
 * passe au rouge — mesuré, pas supposé. Le temps 2 de T8.1 dédoublonne, il ne
 * réécrit pas ; il retirera la fixture figée, et cette ligne deviendra
 * corrigeable ce jour-là.
 *
 * D'ici là, elle est INSCRITE, pas tolérée. La différence tient en deux
 * refus que ce test oppose :
 *
 * - une promesse de stack NON inscrite est refusée — l'exemption ne s'étend pas
 *   toute seule au prochain paragraphe qu'on écrira ;
 * - une exemption qui ne correspond plus à rien est refusée AUSSI. Une liste qui
 *   garde une ligne corrigée depuis longtemps est exactement l'information
 *   périmée que ce dépôt poursuit partout — et le jour où elle se vide, elle
 *   dit toute seule que T8.7 est enfin entière.
 */
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
const INSCRITES: { fichier: string; ligne: string; jusqua: string }[] = [
  {
    fichier: 'docs/FORMAT.md',
    ligne: "dossier, le composant React et son interface `<IdentifiantCode>Props`, sans",
    jusqua:
      'le temps 2 de T8.1, qui retire la fixture figée de scissionSpec.test.mjs. '
      + 'Reformuler cette ligne avant le fait disparaître du document figé, et ce '
      + 'contrôle-là passe au rouge : vérifié le 5 septembre 2026 en le tentant.',
  },
];

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
