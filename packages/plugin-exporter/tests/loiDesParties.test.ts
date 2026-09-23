/**
 * La loi des trois parties, et pourquoi elle se mesure deux fois.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { PointACorriger } from '../src/contract/localisation';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(racine, 'src');
const AUTORITE = path.join('contract', 'localisation.ts');

/**
 * Les noms de canaux de diagnostics du moteur.
 *
 * Ils sont écrits ici plutôt que devinés : un canal est un `string[]` comme un
 * autre, et rien dans le type ne dit qu'il porte des messages destinés au
 * designer. La liste est courte et stable ; l'élargir se fait en même temps
 * qu'on ajoute un canal.
 */
const CANAUX = [
  'warnings',
  'notices',
  'infos',
  'canal',
  'pathNotices',
  'variantWarnings',
  'layoutElectionWarnings',
  'matrixWarnings',
  'projectionWarnings',
];

function fichiersSource(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return fichiersSource(chemin);
    return entree.isFile() && chemin.endsWith('.ts') ? [chemin] : [];
  });
}

test('un message ne s’écrit jamais directement dans un canal de diagnostics', () => {
  const fichiers = fichiersSource(SOURCE);
  assert.ok(fichiers.length > 20, `seulement ${fichiers.length} fichiers balayés`);

  const motif = new RegExp(String.raw`\b(?:${CANAUX.join('|')})\.push\(`);
  const fautifs: string[] = [];
  for (const fichier of fichiers) {
    if (fichier.endsWith(AUTORITE)) continue;
    const lignes = fs.readFileSync(fichier, 'utf8').split('\n');
    lignes.forEach((ligne, rang) => {
      const trouve = motif.exec(ligne);
      if (!trouve) return;
      // Ce qui est interdit est d'écrire un message ici. Pousser une valeur
      // déjà formée reste le geste normal : une recopie de canal (`...autres`),
      // un message que l'autorité vient de rendre, un texte rangé dans une
      // seconde liste pour être classé. Le repère est donc le littéral : c'est
      // lui, et lui seul, qui dit qu'une phrase est rédigée à cet endroit.
      const reste = ligne.slice(trouve.index + trouve[0].length).trimStart();
      const debut = reste.length > 0
        ? reste
        : (lignes[rang + 1] ?? '').trimStart();
      if (!/^[`'"]/.test(debut)) return;
      fautifs.push(`${path.relative(racine, fichier)}:${rang + 1}`);
    });
  }

  assert.deepEqual(
    fautifs,
    [],
    `${fautifs.length} site(s) écrivent un message dans un canal sans passer par `
      + `src/contract/localisation.ts, donc sans dire ce qui manque, ce que ça coûte et quel `
      + `geste le corrige. L'interface ne peut alors qu'afficher un paragraphe :\n`
      + fautifs.map((f) => `  ${f}`).join('\n'),
  );
});

/**
 * La seconde moitié : ce que le moteur SORT porte bien ses parties.
 *
 * Elle s'exécute sur la sortie, avec les autres lois, et ne prouve que ce que
 * les scénarios déclenchent — c'est pourquoi la première moitié lit la source.
 */
export function verifierLesPartiesDesDiagnostics(
  messages: readonly string[],
  parties: ReadonlyMap<string, PointACorriger>,
  ou: string,
): void {
  const fautifs: string[] = [];
  for (const message of messages) {
    const point = parties.get(message);
    if (!point) {
      fautifs.push(`sans parties — ${message.slice(0, 100)}`);
      continue;
    }
    const vides = (['titre', 'impact', 'action'] as const)
      .filter((partie) => point[partie].trim().length === 0);
    if (vides.length > 0) {
      fautifs.push(`${vides.join(', ')} vide(s) — ${message.slice(0, 90)}`);
      continue;
    }
    // La phrase compacte se DÉRIVE des parties : si les deux divergent, la pull
    // request et la carte ne disent plus la même chose, et c'est exactement ce
    // que « sans seconde rédaction » interdit.
    const derivee = `${point.titre} ${point.impact} ${point.action}`;
    if (derivee !== message) fautifs.push(`la phrase ne dérive pas des parties — ${derivee}`);
  }

  assert.deepEqual(
    fautifs,
    [],
    `${ou} : ${fautifs.length} diagnostic(s) n'arrivent pas découpés en parties. `
      + `L'interface ne peut alors qu'en faire un paragraphe, où le geste se lit après deux `
      + `phrases de contexte :\n` + fautifs.map((f) => `  ${f}`).join('\n'),
  );
}
