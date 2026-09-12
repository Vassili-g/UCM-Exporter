/**
 * Le type d'une famille typographique stockée en `STRING` : `fontFamily` ou
 * `string`, décidé sur une composante entière du graphe d'alias, avant que
 * l'export n'écrive une seule feuille.
 *
 * La décision porte sur la composante et non sur la feuille courante. Une
 * sémantique reliée à un text style cite une primitive : typer la première
 * seule produirait une référence `fontFamily` vers une feuille `string`. Un
 * conflit sur un seul membre rend donc toute la composante ambiguë.
 *
 * Deux preuves positives existent, et elles ne se valent pas. Une liaison
 * `TextStyle.boundVariables.fontFamily` prouve l'usage. Un scope `FONT_FAMILY`
 * déclare une intention et ne limite que les sélecteurs de Figma : l'API
 * autorise encore une liaison dans un autre champ, d'où les conflits relevés
 * à côté. `packages/plugin/SPEC.md` énumère les règles appliquées ici.
 */
import { firstVariableAlias } from '../variables';

/** Ce que la décision lit : l'index des variables exportées, et leurs collections. */
export type GrapheDesVariables = {
  collectionById: ReadonlyMap<string, VariableCollection>;
  variableById: ReadonlyMap<string, Variable>;
  pathById: ReadonlyMap<string, string>;
};

/** Ce que les text styles locaux du fichier lient, par identifiant de variable. */
export type LiaisonsDeTextStyles = {
  /** Variables reliées au champ `fontFamily` d'un text style local. */
  parFontFamily: ReadonlySet<string>;
  /** Variables reliées à un autre champ de chaîne, tel que `fontStyle`. */
  parAutreChampDeChaine: ReadonlySet<string>;
};

/** Ce que la décision rend, en identifiants de variables rangés par chemin. */
export type DecisionDesFamilles = {
  /** Variables publiées en `fontFamily`. */
  familles: Set<string>;
  /** Composantes qui portent une preuve et un conflit : elles restent `string`. */
  ambigues: string[];
  /** Variables nommées comme une famille, sans preuve dans le fichier. */
  probables: string[];
};

/**
 * Scopes de chaîne qui contredisent l'usage exclusif de famille.
 *
 * `ALL_SCOPES` en fait partie : une variable disponible partout n'est pas
 * limitée à la famille, même lorsqu'elle déclare aussi `FONT_FAMILY`.
 */
const SCOPES_EN_CONFLIT = new Set<VariableScope>(['ALL_SCOPES', 'FONT_STYLE', 'TEXT_CONTENT']);

/** Vrai si un segment du chemin, tirets retirés, nomme la famille. */
function cheminDeFamille(chemin: string): boolean {
  return chemin.split('.').some((segment) => segment.replace(/-/g, '') === 'fontfamily');
}

/** Les identifiants dont l'export décide le type ici : les `STRING` non retenues par les graisses. */
function candidates(graphe: GrapheDesVariables, graisses: ReadonlySet<string>): string[] {
  const retenues: string[] = [];
  for (const id of graphe.pathById.keys()) {
    if (graisses.has(id)) continue;
    if (graphe.variableById.get(id)?.resolvedType === 'STRING') retenues.push(id);
  }
  return retenues;
}

/**
 * Les composantes connexes du graphe d'alias, et les membres dont un alias en
 * sort.
 *
 * Un alias qui quitte l'ensemble des candidates change de type ou vise une
 * variable absente de l'index : dans les deux cas la composante ne peut plus
 * recevoir un type commun, et le membre est relevé comme conflit.
 */
function composantes(
  graphe: GrapheDesVariables,
  membres: string[],
): { groupes: string[][]; fuyantes: Set<string> } {
  const parent = new Map(membres.map((id) => [id, id]));
  const fuyantes = new Set<string>();

  const racine = (id: string): string => {
    let courant = id;
    while (parent.get(courant) !== courant) courant = parent.get(courant)!;
    let remonte = id;
    while (parent.get(remonte) !== courant) {
      const suivant = parent.get(remonte)!;
      parent.set(remonte, courant);
      remonte = suivant;
    }
    return courant;
  };

  for (const id of membres) {
    const variable = graphe.variableById.get(id)!;
    const collection = graphe.collectionById.get(variable.variableCollectionId);
    if (!collection) continue;
    for (const mode of collection.modes) {
      const valeur = variable.valuesByMode[mode.modeId];
      if (valeur === undefined) continue;
      const alias = firstVariableAlias(valeur);
      if (!alias) continue;
      if (!parent.has(alias.id)) {
        fuyantes.add(id);
        continue;
      }
      parent.set(racine(id), racine(alias.id));
    }
  }

  const groupes = new Map<string, string[]>();
  for (const id of membres) {
    const cle = racine(id);
    groupes.set(cle, [...(groupes.get(cle) ?? []), id]);
  }
  return { groupes: [...groupes.values()], fuyantes };
}

/**
 * Les familles typographiques du fichier, décidées composante par composante.
 *
 * Une composante devient `fontFamily` si elle porte au moins une preuve
 * positive et aucun conflit. Une composante sans preuve reste `string`, et
 * celles de ses membres que leur nom annonce comme familles sont rendues à
 * part : le nom ne décide jamais le type, il signale seulement où la preuve
 * manque.
 */
export function famillesDeTokens(
  graphe: GrapheDesVariables,
  graisses: ReadonlySet<string>,
  liaisons: LiaisonsDeTextStyles,
): DecisionDesFamilles {
  const membres = candidates(graphe, graisses);
  const { groupes, fuyantes } = composantes(graphe, membres);

  const familles = new Set<string>();
  const ambigues: string[] = [];
  const probables: string[] = [];

  for (const groupe of groupes) {
    let preuve = false;
    let conflit = false;
    for (const id of groupe) {
      const scopes = graphe.variableById.get(id)?.scopes ?? [];
      const scopeDeFamille = scopes.includes('FONT_FAMILY');
      const scopeContraire = scopes.some((scope) => SCOPES_EN_CONFLIT.has(scope));
      if (liaisons.parFontFamily.has(id) || (scopeDeFamille && !scopeContraire)) preuve = true;
      if (liaisons.parAutreChampDeChaine.has(id) || fuyantes.has(id)) conflit = true;
      if (scopeDeFamille && scopeContraire) conflit = true;
    }

    if (preuve && !conflit) {
      for (const id of groupe) familles.add(id);
      continue;
    }
    if (preuve) {
      ambigues.push(...groupe);
      continue;
    }
    probables.push(...groupe.filter((id) => cheminDeFamille(graphe.pathById.get(id)!)));
  }

  // L'ordre de visite des variables, des collections et des modes ne doit pas
  // changer le document ni les messages : les deux listes sortent rangées par
  // chemin, et l'appartenance à une composante n'en dépend pas.
  const parChemin = (gauche: string, droite: string) =>
    graphe.pathById.get(gauche)!.localeCompare(graphe.pathById.get(droite)!);
  return { familles, ambigues: ambigues.sort(parChemin), probables: probables.sort(parChemin) };
}
