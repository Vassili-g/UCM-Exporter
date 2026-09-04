/**
 * Le manifest décide de la distribution du plugin, et la distribution décide du
 * contenu des contrats.
 *
 * **Ce que T4.4 a tranché.** Le plugin se distribue par la Figma Community :
 * n'importe qui l'installe et produit des contrats. `enablePrivatePluginApi` est
 * réservé aux plugins PRIVÉS d'une organisation — le déclarer rendrait le
 * plugin non publiable, et Figma le refuserait à la soumission.
 *
 * **Pourquoi un test plutôt qu'une ligne de documentation.** Le drapeau ouvre
 * `figma.fileKey`, donc `meta.figma.url`, donc un lien d'un clic vers le
 * composant source en revue de pull request. C'est un confort qu'on regrette, et
 * qu'on remet « juste pour essayer en local » ; il reviendrait alors dans le
 * manifest distribué sans que rien ne le dise, et le plugin publié cesserait
 * d'être publiable. Le coût de la rechute est une soumission refusée, découverte
 * chez Figma et pas ici.
 *
 * **Ce qui remplace le lien perdu :** `fileName` et `nodeId`, que le contrat
 * porte toujours et que le corps de la pull request annonce désormais sur sa
 * page de couverture (`lignesDIdentite`, `src/github.ts`). C'est là que la
 * seconde condition de D6 se constate sur une revue réelle.
 *
 * Le manifest DISTRIBUÉ est vérifié en même temps que celui du dépôt : c'est
 * lui que Figma lit, et `build-manifest.cjs` le recopie champ par champ — un
 * drapeau ajouté à la copie passerait autrement inaperçu.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

test('le manifest ne déclare aucun droit réservé à un plugin privé', () => {
  for (const relatif of ['manifest.json', 'dist/manifest.json']) {
    let brut: string;
    try {
      brut = readFileSync(join(racine, relatif), 'utf8');
    } catch {
      // `dist/` n'existe pas avant une construction. Le manifest source, lui,
      // est toujours là : ne pas trouver la copie n'est pas une faute, la
      // trouver fautive en est une.
      continue;
    }

    const manifest = JSON.parse(brut) as Record<string, unknown>;
    assert.equal(
      'enablePrivatePluginApi' in manifest,
      false,
      `${relatif} déclare enablePrivatePluginApi. Ce drapeau est réservé aux plugins privés `
        + `d'une organisation : Figma refuserait la soumission à la Community, décidée en T4.4. `
        + `Il ouvre figma.fileKey, donc meta.figma.url — la traçabilité passe désormais par `
        + `fileName et nodeId, annoncés dans le corps de la pull request.`,
    );
  }
});
