/**
 * OÙ vit l'implémentation d'un contrat, et SI elle est là.
 *
 * Ces deux questions sont universelles : un contrat exporté depuis Figma peut
 * être implémenté en React, en Swift ou en Kotlin, et dans les trois cas la
 * réponse à « ce composant est-il écrit ? » est la même — un fichier existe, ou
 * il n'existe pas. C'est pour cela que ce module est dans le noyau.
 *
 * Ce qu'il ne fait PAS, et c'est la coupure de T2.3 : il ne lit pas le fichier,
 * ne connaît aucun langage, et ne compare rien au contrat. Comparer une API
 * publique à des props demande un vérificateur de types propre à une cible ;
 * c'est le travail d'un ADAPTATEUR, qui vit chez le consommateur.
 *
 * Sans cette coupure, le moteur répondait « implémentation en attente » à tout
 * repo non-TypeScript, y compris quand le composant était écrit — et il le
 * répondait sur la pull request d'export elle-même, celle que le designer lit.
 * Une affirmation fausse au seul endroit qui compte.
 */
import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/**
 * Le motif retenu par défaut, parce que le premier consommateur est React et
 * qu'un défaut absent obligerait chaque appelant à réécrire la convention.
 *
 * Il n'y en a que deux, volontairement : `{dir}` le dossier du contrat, `{id}`
 * son identifiant. Les transformations de casse (`{id:snake}`, `{id:kebab}`)
 * s'ajouteront le jour où une cible réelle les demande — les inventer
 * maintenant, ce serait figer une grammaire sur des besoins supposés.
 */
export const MOTIF_IMPLEMENTATION_PAR_DEFAUT = "{dir}/{id}.tsx";

/** L'identifiant d'artefact que porte un chemin de contrat : son nom de base. */
export function identifiantDuContrat(cheminContrat) {
  return basename(cheminContrat, ".contract.json");
}

/**
 * Le chemin où l'implémentation de ce contrat est censée se trouver.
 *
 * Le motif est résolu, pas interprété : aucun glob, aucune recherche. Un
 * emplacement calculable est ce qui permet de dire « absente » sans avoir à
 * fouiller le repo, donc sans jamais confondre « pas écrite » et « pas
 * trouvée ».
 */
export function cheminImplementation(cheminContrat, motif = MOTIF_IMPLEMENTATION_PAR_DEFAUT) {
  const remplace = motif
    .replaceAll("{dir}", dirname(cheminContrat))
    .replaceAll("{id}", identifiantDuContrat(cheminContrat));
  // `join` normalise les séparateurs : le motif s'écrit avec des `/` sur toutes
  // les plateformes, et le chemin rendu est celui du système hôte.
  return join(remplace);
}

/**
 * L'implémentation de ce contrat existe-t-elle ?
 *
 * `existe` est injectable pour que la question se pose sans toucher au disque —
 * un test, ou un jour un lecteur d'archive. Le défaut reste `existsSync` : le
 * cas courant ne doit pas coûter une configuration.
 */
export function implementationPresente(
  cheminContrat,
  { motif = MOTIF_IMPLEMENTATION_PAR_DEFAUT, existe = existsSync } = {},
) {
  return Boolean(existe(cheminImplementation(cheminContrat, motif)));
}
