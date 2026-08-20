/**
 * Vérifie que le corpus de `tests/test-exports/` a été produit par la version
 * courante du schéma.
 *
 * Ce contrôle ne vit pas dans `npm test`, et c'est délibéré. Ce qu'il constate
 * n'est pas une propriété du code : c'est qu'un humain a relancé le plugin
 * dans Figma depuis le dernier changement de forme. Personne ne peut le faire
 * ici — le plugin n'existe que dans Figma — donc le faire échouer à chaque
 * itération locale n'apprend qu'une chose, le contourner. Il est demandé au
 * moment où il porte : avant d'ouvrir une pull request.
 *
 * Le corpus reste de VRAIES sorties du plugin. Les retoucher à la main pour
 * obtenir du vert détruirait exactement ce qui fait leur valeur.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTRACT_VERSION } from '../src/contract/exportComponent';

const corpus = join(dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'test-exports');
const contrats = readdirSync(corpus)
  .filter((nom) => nom.endsWith('.contract.json'))
  .sort();

if (contrats.length === 0) {
  console.error('✗ Aucun contrat dans tests/test-exports/ : le corpus de référence a disparu.');
  process.exit(1);
}

const perimes = contrats.flatMap((nom) => {
  const contrat = JSON.parse(
    readFileSync(join(corpus, nom), 'utf8').replace(/^\uFEFF/, ''),
  ) as { meta?: { contractVersion?: unknown } };
  const version = contrat.meta?.contractVersion;
  return version === CONTRACT_VERSION ? [] : [{ nom, version }];
});

if (perimes.length > 0) {
  console.error(
    `✗ Le moteur écrit du ${CONTRACT_VERSION}, et le corpus de référence ne l'a pas vu :`,
  );
  for (const { nom, version } of perimes) {
    console.error(`    ${nom} — produit par le schéma ${String(version)}`);
  }
  console.error(
    '\n  Personne n\'a encore lancé le plugin dans Figma depuis ce changement de forme.\n' +
      '  Réexportez le petit corpus depuis Figma et déposez-le dans tests/test-exports/.\n' +
      '  Ne modifiez pas ces fichiers à la main : ce sont de vraies sorties du plugin.',
  );
  process.exit(1);
}

console.log(`✓ ${contrats.length} contrats de référence, tous produits par le schéma ${CONTRACT_VERSION}.`);
