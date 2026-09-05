/**
 * La loi de couverture de U4.3, et pourquoi elle se lit dans la SOURCE.
 *
 * *La loi :* **tout diagnostic dont le sujet désigne un node porte ce node.**
 * Elle existe pour U4.4, qui rendra ces messages cliquables — et une interface
 * où certains avertissements mènent à leur calque et d'autres pas enseignerait
 * une leçon fausse : que l'absence de lien signifie « rien à localiser », quand
 * elle signifierait « ce site-là n'a pas été converti ».
 *
 * *Pourquoi la source et pas seulement l'exécution.* Le faux `figma` des tests
 * n'excite qu'une poignée des quarante sites d'émission. Une loi qui ne
 * s'exercerait que sur ce qui a été déclenché serait verte parce que personne
 * n'a écrit le scénario qui la mettrait en défaut — du théâtre. Le contrôle
 * ci-dessous ne dépend d'aucun scénario : il rougit à la SECONDE où un site
 * recopie la convention de préfixe à la main, qu'un test l'atteigne ou non.
 *
 * C'est le même raisonnement que `monorepoCoherent.test.mjs` et
 * `docLinks.test.ts`, qui lisent des fichiers plutôt que d'exécuter du code :
 * certaines règles portent sur ce qui est ÉCRIT, et les vérifier à l'exécution
 * revient à espérer que l'exécution passe par là.
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
 * que l'endroit autorisé l'écrit bien — sans quoi renommer la convention dans le
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
