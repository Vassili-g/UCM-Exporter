/**
 * « Le plugin ne modifie JAMAIS le document Figma » — cette phrase est un
 * invariant du projet, et jusqu'ici rien ne l'empêchait de devenir fausse.
 *
 * **Pourquoi ce filet naît maintenant (U4.5).** Rendre un avertissement
 * cliquable ouvre une porte : le moteur va poser une sélection et déplacer la
 * vue. Ce ne sont pas des écritures — l'un et l'autre sont un état de
 * l'éditeur, et les typings de Figma disent que les actions d'un plugin ne
 * rejoignent l'historique d'annulation que si `commitUndo()` est appelé. Mais
 * une fois la porte ouverte, « toucher à Figma » cesse d'être impensable, et
 * c'est exactement le moment où une règle de prose se met à glisser.
 *
 * **Ce qu'il refuse.** Les appels qui ÉCRIVENT : créer un node, le renommer, le
 * déplacer, le supprimer, écrire une variable ou un style, valider une entrée
 * d'annulation. Il lit la source plutôt que d'exécuter, pour la même raison que
 * la loi de localisation : un test dynamique ne prouverait que ce que les
 * scénarios déclenchent, et une écriture ajoutée dans une branche jamais
 * exercée passerait au vert.
 *
 * **Ce qu'il autorise, et c'est la décision de U4.5 :** lire, sélectionner,
 * cadrer. La différence n'est pas une affaire de degré — c'est celle entre
 * regarder et écrire, et la spécification l'écrit sous « Sélectionner et cadrer
 * ne sont pas modifier ».
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(racine, 'src');

/**
 * Les appels qui écrivent dans le document, et eux seuls.
 *
 * La liste est nommément courte : elle vise les portes d'écriture de l'API, pas
 * tout ce qui ressemble à une mutation. `figma.currentPage.selection = …` n'y
 * est pas, et son absence est la décision de U4.5, pas un oubli.
 */
const ECRITURES: { motif: RegExp; quoi: string }[] = [
  { motif: /figma\.create[A-Z]\w*\s*\(/, quoi: 'création de node' },
  { motif: /figma\.combineAsVariants\s*\(/, quoi: 'création de component set' },
  { motif: /figma\.group\s*\(|figma\.ungroup\s*\(/, quoi: 'regroupement de nodes' },
  { motif: /figma\.commitUndo\s*\(|figma\.triggerUndo\s*\(/, quoi: "entrée d'annulation" },
  { motif: /figma\.variables\.create[A-Z]\w*\s*\(/, quoi: 'écriture de variable' },
  { motif: /figma\.saveVersionHistoryAsync\s*\(/, quoi: "écriture d'historique" },
  { motif: /\.setPluginData\s*\(|\.setSharedPluginData\s*\(/, quoi: 'écriture de plugin data' },
  { motif: /\.remove\s*\(\s*\)/, quoi: 'suppression de node' },
  { motif: /\.appendChild\s*\(|\.insertChild\s*\(/, quoi: 'déplacement de node' },
];

function fichiersSource(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return fichiersSource(chemin);
    return entree.isFile() && chemin.endsWith('.ts') ? [chemin] : [];
  });
}

test('le moteur n’écrit jamais dans le document Figma', () => {
  const fichiers = fichiersSource(SOURCE);
  // Une liste vide passerait ce test sans rien contrôler : un dossier renommé
  // désarmerait le filet en silence.
  assert.ok(fichiers.length > 20, `seulement ${fichiers.length} fichiers balayés`);

  const fautifs: string[] = [];
  for (const fichier of fichiers) {
    fs.readFileSync(fichier, 'utf8').split('\n').forEach((ligne, rang) => {
      const nu = ligne.trim();
      // Un commentaire a le droit de NOMMER ce qu'on s'interdit : c'est même
      // souvent là qu'on explique pourquoi.
      if (nu.startsWith('*') || nu.startsWith('//') || nu.startsWith('/*')) return;
      for (const { motif, quoi } of ECRITURES) {
        if (!motif.test(ligne)) continue;
        fautifs.push(`${path.relative(racine, fichier)}:${rang + 1} — ${quoi}`);
      }
    });
  }

  assert.deepEqual(
    fautifs,
    [],
    `${fautifs.length} appel(s) écriraient dans le document Figma. Le plugin lit, `
      + `sélectionne et cadre ; il n'écrit pas. Si cette règle doit changer, elle se `
      + `change ici et dans packages/plugin/SPEC.md, jamais par un appel ajouté :\n`
      + fautifs.map((f) => `  ${f}`).join('\n'),
  );
});
