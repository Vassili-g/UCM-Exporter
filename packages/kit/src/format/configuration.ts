/**
 * `ucm.config.json` : ce qu'un repository dit de LUI-MÊME.
 *
 * C'est la deuxième des trois règles de tri du plan — « ce qui décrit le REPO
 * reste dans le repo, en configuration ». Trois chemins, et rien d'autre : où
 * vivent les contrats, où vit le fichier de tokens, où vit l'implémentation
 * d'un contrat.
 *
 * **Pourquoi dans `format` et non dans `lecteurs`, et c'est T4.1 qui l'a
 * imposé.** Ce fichier a deux lecteurs qui ne partagent aucun runtime : la CI
 * du repository, qui l'ouvre avec `node:fs`, et **le plugin Figma**, qui doit
 * savoir où ÉCRIRE et le lit par l'API GitHub depuis un sandbox sans `node:fs`.
 * Tant que la grammaire vivait du seul côté Node, le plugin en gardait sa
 * propre idée — `src/components` et `src/tokens` en dur — et les deux ne
 * coïncidaient que par accident. Le premier repo aux conventions différentes
 * aurait fait écrire l'export à un endroit que la CI ne regarde pas, sans qu'un
 * mot le dise.
 *
 * Ce module ne LIT donc aucun fichier : il dit ce qu'est une configuration et
 * juge celle qu'on lui présente. `lireConfiguration` (dans `lecteurs`) ouvre le
 * fichier sur un disque, le plugin le récupère par l'API ; les deux passent
 * ensuite par ici.
 *
 * **Aucun numéro de version ne s'écrit dans ce fichier, et c'est une règle, pas
 * un oubli.** La fenêtre de versions lues appartient au kit installé (D7, D8) :
 * la republier dans le repo créerait une seconde autorité, qui dériverait au
 * premier `npm update` — et le désaccord serait muet, chacun des deux se
 * croyant le bon. Un repo dit OÙ sont ses fichiers ; il ne dit pas ce que le
 * format est.
 *
 * **Le fichier est facultatif.** Un repo neuf avec un seul dossier
 * `components/` doit fonctionner sans écrire une ligne — c'est le critère de
 * réussite n° 1. L'absence de configuration n'est donc pas une erreur : c'est
 * le cas nominal, et les valeurs par défaut décrivent exactement ce repo-là.
 * Ce qui est une erreur, c'est un fichier PRÉSENT et mal formé : là, quelqu'un
 * a voulu dire quelque chose, et le taire en retombant sur les défauts ferait
 * chercher un contrat là où il n'est pas, sans rien signaler.
 */

/** Le nom du fichier, écrit une fois. */
export const NOM_CONFIGURATION = 'ucm.config.json';

/**
 * Le motif retenu par défaut, parce que le premier consommateur est React et
 * qu'un défaut absent obligerait chaque appelant à réécrire la convention.
 *
 * Il n'y a que deux jetons, volontairement : `{dir}` le dossier du contrat,
 * `{id}` son identifiant. Les transformations de casse (`{id:snake}`,
 * `{id:kebab}`) s'ajouteront le jour où une cible réelle les demande — les
 * inventer maintenant, ce serait figer une grammaire sur des besoins supposés.
 */
export const MOTIF_IMPLEMENTATION_PAR_DEFAUT = '{dir}/{id}.tsx';

/** Ce qu'un repository déclare de lui-même : trois chemins, jamais une version. */
export type ConfigurationRepository = {
  /** Dossier sous lequel les contrats sont cherchés, récursivement. */
  components: string;
  /** Chemin du FICHIER de tokens DTCG — un fichier, pas un dossier. */
  tokens: string;
  /** Motif qui résout le chemin d'une implémentation depuis celui du contrat. */
  implementation: string;
};

/**
 * Ce qu'un repository vierge décrit sans rien écrire.
 *
 * `components` à la racine et non `src/components` : le critère de réussite
 * décrit « un repo GitHub neuf, un dossier `components/`, rien d'autre ». Un
 * repo qui range autrement le dit, et c'est précisément à quoi sert ce fichier.
 *
 * `tokens` est un FICHIER, et l'ambiguïté a coûté un défaut : le plugin
 * enregistrait un DOSSIER (`src/tokens`) auquel il ajoutait `/tokens.json`. Les
 * deux conventions ne se distinguaient pas tant que le dossier s'appelait
 * `tokens` — le nom du fichier ressemblait au nom du dossier. Ici, le champ
 * porte le nom du fichier, toujours.
 */
export const CONFIGURATION_PAR_DEFAUT: Readonly<ConfigurationRepository> = Object.freeze({
  components: 'components',
  tokens: 'tokens.json',
  implementation: MOTIF_IMPLEMENTATION_PAR_DEFAUT,
});

const estTexteNonVide = (valeur: unknown): boolean =>
  typeof valeur === 'string' && valeur.trim() !== '';

/**
 * `Object.hasOwn` n'est pas disponible ici, et ce n'est pas un oubli : ce
 * sous-chemin cible ES2019 parce qu'il est bundlé pour le sandbox Figma. Une
 * méthode plus récente compilerait sans broncher et manquerait à l'exécution,
 * dans le seul environnement où l'erreur n'apparaît qu'après le build et après
 * la CI.
 */
const declare = (objet: Record<string, unknown>, cle: string): boolean =>
  Object.prototype.hasOwnProperty.call(objet, cle);

/**
 * Les champs absents ou mal formés d'une configuration.
 *
 * Même forme de réponse que `champsInvalidesDuContrat` — une liste de chemins,
 * vide quand tout va bien — pour que l'appelant traite les deux refus de la
 * même façon. Un champ ABSENT n'est pas invalide : il prend son défaut. Seul
 * un champ écrit et inutilisable l'est.
 */
export function champsInvalidesDeLaConfiguration(configuration: unknown): string[] {
  if (configuration === null || typeof configuration !== 'object' || Array.isArray(configuration)) {
    return [NOM_CONFIGURATION];
  }
  const objet = configuration as Record<string, unknown>;
  const invalides: string[] = [];
  for (const cle of Object.keys(CONFIGURATION_PAR_DEFAUT)) {
    if (declare(objet, cle) && !estTexteNonVide(objet[cle])) invalides.push(cle);
  }
  // Un numéro de version écrit ici est refusé, pas ignoré. L'ignorer laisserait
  // croire qu'il compte : quelqu'un le mettrait à jour en pensant déplacer la
  // fenêtre de lecture, et rien ne bougerait — un geste sans effet est pire
  // qu'un geste refusé.
  for (const cle of ['contractVersion', 'version', 'schemaVersion']) {
    if (declare(objet, cle)) invalides.push(cle);
  }
  return invalides.sort();
}

/**
 * La configuration que porte un JSON déjà analysé, ou l'erreur qui l'en empêche.
 *
 * Rend toujours une configuration COMPLÈTE : l'appelant qui choisit de passer
 * outre une erreur travaille sur les défauts, jamais sur `undefined`. Ce module
 * ne lève pas, pour la même raison que le validateur de contrats ne lève pas —
 * un garde-fou doit diagnostiquer là où il serait tentant d'exploser.
 */
export function configurationDepuisJson(
  brut: unknown,
): { configuration: ConfigurationRepository; erreur: string | null } {
  const invalides = champsInvalidesDeLaConfiguration(brut);
  if (invalides.length > 0) {
    return {
      configuration: { ...CONFIGURATION_PAR_DEFAUT },
      erreur:
        `${NOM_CONFIGURATION} : ${invalides.join(', ')}. ` +
        `Chaque champ est un chemin non vide, et aucun numéro de version ne s'y écrit — ` +
        `la fenêtre de versions lues appartient au paquet installé.`,
    };
  }

  const objet = brut as Record<string, unknown>;
  const configuration = { ...CONFIGURATION_PAR_DEFAUT };
  for (const cle of Object.keys(CONFIGURATION_PAR_DEFAUT) as (keyof ConfigurationRepository)[]) {
    if (declare(objet, cle)) configuration[cle] = objet[cle] as string;
  }
  return { configuration, erreur: null };
}
