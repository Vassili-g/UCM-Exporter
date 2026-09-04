/**
 * Génère le JSON Schema du contrat depuis `src/format/types.ts`.
 *
 * Le schéma est un artefact DÉRIVÉ, jamais écrit à la main : le rédiger
 * séparément créerait une seconde description de la même forme, et deux
 * descriptions finissent toujours par diverger. `types.ts` reste la source.
 *
 * Ce que le schéma sert : valider un contrat depuis un autre langage, et
 * donner à un éditeur de quoi vérifier un `.contract.json` ouvert à la main.
 * Il ne remplace aucun contrôle : ce qu'il ne sait pas prouver est écrit dans
 * sa propre `description`, et `tests/schema.test.ts` le vérifie sur le corpus.
 *
 * Lancé par « npm run schema ». Le fichier produit est commité ; le test de
 * non-dérive refuse un schéma plus vieux que `types.ts`.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGenerator } from 'ts-json-schema-generator';
import { CONTRACT_VERSION } from '../src/format/version';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Emplacement du schéma commité. Un seul fichier : l'historique est dans Git. */
export const CHEMIN_DU_SCHEMA = join(racine, 'schema', 'ucm-contract.schema.json');

/**
 * Ce que le schéma ne prouve pas.
 *
 * Cette liste voyage DANS le schéma, pas seulement dans un document : un
 * consommateur d'un autre langage n'aura que ce fichier sous les yeux, et un
 * schéma silencieux sur ses limites se lit comme une garantie complète.
 */
const LIMITES = [
  "Ce schéma décrit la FORME d'un contrat, pas sa cohérence interne.",
  'Il ne vérifie pas les renvois internes : une entrée de `variants` peut citer une vue absente de `variantViews`, une icône un slot absent de `structure`, un token une référence inexistante.',
  "Il ne contraint pas non plus le FORMAT des valeurs : une référence de token `{chemin.du.token}`, une mesure `120px` et une piste `1fr` y sont de simples chaînes, parce que TypeScript les décrit par des types que JSON Schema ne sait pas porter.",
  'Un contrat valide au sens de ce schéma reste donc à vérifier par un consommateur.',
].join(' ');

/**
 * Injecte ce que la génération ne peut pas déduire de `types.ts`.
 *
 * `meta.contractVersion` est typé `string` : sans le `const` posé ici, le
 * schéma de la 10.1 validerait un contrat qui se déclare 9.0 dès que sa forme
 * colle, ce qui est précisément l'erreur qu'un consommateur attend de lui.
 */
function identifier(schema: Record<string, unknown>): Record<string, unknown> {
  const definitions = schema.definitions as Record<string, any> | undefined;
  const contractVersion = definitions?.ContractMeta?.properties?.contractVersion;
  if (!contractVersion || contractVersion.type !== 'string') {
    // Mieux vaut échouer bruyamment que publier un schéma qui accepte
    // n'importe quelle version : la forme de `types.ts` a changé.
    throw new Error(
      "Impossible de situer `ContractMeta.properties.contractVersion` dans le schéma généré.",
    );
  }
  contractVersion.const = CONTRACT_VERSION;

  const { $schema, ...reste } = schema;
  return {
    $schema,
    // Identifiant, pas adresse : le dépôt est privé et cette URI ne résout pas.
    $id: `https://github.com/Vassili-g/UCM-Exporter/schema/ucm-contract-${CONTRACT_VERSION}.schema.json`,
    title: `Contrat de composant UCM ${CONTRACT_VERSION}`,
    description: LIMITES,
    'x-ucm-contract-version': CONTRACT_VERSION,
    ...reste,
  };
}

/** Construit le schéma en mémoire. Exporté pour le test de non-dérive. */
export function construireLeSchema(): Record<string, unknown> {
  const genere = createGenerator({
    path: join(racine, 'src', 'format', 'types.ts'),
    tsconfig: join(racine, 'tsconfig.json'),
    type: 'Contract',
    // Un objet à forme fixe refuse les champs qu'il ne déclare pas. Les
    // dictionnaires (`Record<string, …>`) gardent leurs clés libres : ce sont
    // les noms de props, de slots ou de vues, que le contrat invente.
    additionalProperties: false,
  }).createSchema('Contract');
  return identifier(genere as unknown as Record<string, unknown>);
}

/** Texte exact du fichier commité, pour l'écrire comme pour le comparer. */
export function texteDuSchema(): string {
  return `${JSON.stringify(construireLeSchema(), null, 2)}\n`;
}

// Écrit seulement quand le script est lancé directement : le test l'importe
// pour comparer, il ne doit pas réécrire le fichier qu'il contrôle.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(CHEMIN_DU_SCHEMA, texteDuSchema());
  console.log(
    `✓ Schéma du contrat ${CONTRACT_VERSION} écrit dans schema/ucm-contract.schema.json.`,
  );
}
