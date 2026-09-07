/**
 * La loi de couverture des localisations, et pourquoi elle se lit dans la source.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { sujet } from '../src/contract/localisation';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(racine, 'src');
const AUTORITE = path.join('contract', 'localisation.ts');

/** Les quatre sujets qui désignent un node, tels que le module les publie. */
const GENRES = ['Layer', 'Variant', 'Component Set', 'Frame'] as const;

function fichiersSource(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return fichiersSource(chemin);
    return entree.isFile() && chemin.endsWith('.ts') ? [chemin] : [];
  });
}

test('un préfixe de sujet ne s’écrit qu’à un seul endroit du moteur', () => {
  const fichiers = fichiersSource(SOURCE);
  // Un contrôle qui balaie une liste vide se lit vert sans rien mesurer. Le
  // dire ici évite qu'un déplacement de dossier désarme la loi en silence.
  assert.ok(fichiers.length > 20, `seulement ${fichiers.length} fichiers balayés`);

  const fautifs: string[] = [];
  for (const fichier of fichiers) {
    if (fichier.endsWith(AUTORITE)) continue;
    const lignes = fs.readFileSync(fichier, 'utf8').split('\n');
    lignes.forEach((ligne, rang) => {
      for (const genre of GENRES) {
        if (!ligne.includes(`${genre} « \${`)) continue;
        fautifs.push(`${path.relative(racine, fichier)}:${rang + 1} — ${genre}`);
      }
    });
  }

  assert.deepEqual(
    fautifs,
    [],
    `${fautifs.length} site(s) forment un sujet à la main au lieu de passer par `
      + `src/contract/localisation.ts, donc sans retenir le node que le message désigne :\n`
      + fautifs.map((f) => `  ${f}`).join('\n'),
  );
});

/**
 * Le contrôle ci-dessus interdit d'écrire le préfixe ailleurs. Celui-ci vérifie
 * que l'endroit autorisé l'écrit bien, sans quoi renommer la convention dans le
 * module rendrait l'autre test vert sur un moteur qui ne dit plus « Layer ».
 */
test('l’autorité produit bien la forme que les messages emploient', () => {
  for (const genre of GENRES) {
    assert.equal(
      sujet(genre, { id: '1:2', name: 'Badge' }).texte,
      `${genre} « Badge »`,
    );
  }
  assert.equal(sujet('Layer', { id: '9:9', name: 'Badge' }).nodeId, '9:9');
});

/**
 * La seconde moitié de la loi, et c'est elle qui la rend utile.
 *
 * *La loi :* **aucun diagnostic ne nomme un calque du composant exporté sans
 * pouvoir mener à un calque.**
 *
 * Sans elle, la première se satisfait d'un déplacement : il suffit de sortir le
 * nom du calque du préfixe et de l'écrire dans le corps du message pour que le
 * contrôle de source ne voie plus rien, et l'interface réafficherait un message
 * qui parle d'un calque sans savoir lequel. C'est le mécanisme exact que cette
 * loi existe pour empêcher : une interface où l'absence de lien enseigne
 * « rien à localiser » alors qu'elle signifie « ce site-là n'a pas été
 * converti ».
 *
 * *Ce que la loi n'interdit pas, et il faut le lire avant de la croire plus
 * stricte qu'elle n'est.* Un message a le droit de nommer un second calque dans
 * son corps, « … mais le layer « Y » lui donne déjà ce rôle » est un contexte
 * utile, et l'interface n'a besoin que d'une cible : celle du sujet. Ce que la loi
 * exige est qu'un message qui parle d'un calque en ait une.
 *
 * *Son univers est les calques du composant exporté*, pas tous les nodes du
 * document. Un message qui cite le calque « icon » d'une instance de règle
 * nomme un calque réel qui n'appartient pas au composant, et aucun clic ne
 * devrait y mener.
 *
 * *Pourquoi ce contrôle-ci s'exécute, quand l'autre lit la source.* Il ne peut
 * pas se lire : savoir si un texte nomme un calque du composant demande de
 * connaître les calques de ce composant, donc d'avoir exporté. Il se pose donc
 * sur la sortie du moteur, avec les autres lois, et il ne prouve que ce que les
 * scénarios déclenchent : c'est précisément pourquoi la première moitié lit la
 * source, et pourquoi les deux ensemble valent mieux que chacune seule.
 */
export function verifierLaLocalisationDesDiagnostics(
  messages: readonly string[],
  localisations: ReadonlyMap<string, string>,
  declarees: ReadonlyMap<string, string>,
  nomsDeCalques: ReadonlySet<string>,
  ou: string,
): void {
  const fautifs: string[] = [];
  for (const message of messages) {
    if (localisations.has(message)) continue;
    // Une absence déclarée n'est pas une absence oubliée : le site d'émission a
    // écrit pourquoi aucun node unique n'existe. C'est toute la différence que
    // cette loi mesure, et la raison pour laquelle les deux tables sont
    // séparées dans `localisation.ts`.
    if (declarees.has(message)) continue;
    // Le sujet est ce qui précède le premier deux-points ; le corps est le
    // reste. Un message sans deux-points est tout entier son propre sujet.
    const nomsCites = [...message.matchAll(/«\s*([^»]*?)\s*»/g)].map(([, nom]) => nom);
    const cites = nomsCites.filter((nom) => nomsDeCalques.has(nom));
    if (cites.length === 0) continue;
    fautifs.push(`${message.slice(0, 110)} — nomme ${cites.map((n) => `« ${n} »`).join(', ')}`);
  }

  assert.deepEqual(
    fautifs,
    [],
    `${ou} : ${fautifs.length} diagnostic(s) nomment un calque du composant sans `
      + `porter de node. Un tel message est celui que l'interface réafficherait sans lien, `
      + `enseignant que l'absence de lien signifie « rien à localiser ». Passez son `
      + `sujet par \`pousserLocalise\`, ou déclarez la raison avec \`sujetSansNode\` `
      + `si aucun node unique n'existe :\n`
      + fautifs.map((f) => `  ${f}`).join('\n'),
  );
}
