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
 * ## L'inscription, et pourquoi elle est une LISTE et non une exception
 *
 * Une promesse de stack qu'on ne peut pas retirer tout de suite s'INSCRIT, avec
 * ce qui la lèvera. La liste a porté une entrée le 5 septembre 2026 : la ligne
 * de `docs/FORMAT.md` qui promettait « le composant React et son interface
 * Props ». Elle était gelée par `scissionSpec.test.mjs`, qui exigeait alors que
 * chaque ligne du document figé avant la scission survive — la reformuler la
 * faisait disparaître des deux documents produits, et le contrôle rougissait.
 * Mesuré en le tentant, pas déduit. Le temps 2 de T8.1 a retiré cette fixture le
 * jour même, et la ligne a été reformulée dans la foulée.
 *
 * La liste est vide, et deux refus la gardent utile :
 *
 * - une promesse de stack NON inscrite est refusée — l'inscription ne s'étend
 *   pas toute seule au prochain paragraphe qu'on écrira ;
 * - une inscription qui ne correspond plus à rien est refusée AUSSI. Une liste
 *   qui garde une ligne corrigée depuis longtemps est l'information périmée que
 *   ce dépôt poursuit partout.
 *
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
/**
 * **Elle est vide, et c'est le verdict de T8.7.** Elle a porté une entrée : la
 * ligne de `docs/FORMAT.md` qui promettait « le composant React et son interface
 * Props » à qui lit la forme publiée. Elle ne pouvait pas être corrigée tant que
 * `scissionSpec.test.mjs` exigeait que chaque ligne du document figé survive ;
 * le temps 2 de T8.1 a retiré cette fixture le 5 septembre 2026, et la ligne a
 * été reformulée le même jour — le contrat nomme un symbole, pas une stack.
 *
 * Le second test ci-dessous refuse une entrée qui ne couvrirait plus rien : la
 * liste ne peut donc pas garder un souvenir. Elle reste ici plutôt que de
 * disparaître avec son contenu, parce que c'est elle qui dit ce qu'on fait d'une
 * promesse qu'on ne peut pas retirer tout de suite : on l'inscrit, avec ce qui
 * la lèvera.
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
