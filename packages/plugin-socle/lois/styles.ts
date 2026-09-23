/**
 * La loi des styles d'une interface de plugin : le DOM et les feuilles parlent
 * des mêmes classes, dans les deux sens, et aucune couleur n'est écrite hors
 * du bloc de rôles. Chaque plugin l'appelle depuis son propre test, avec ses
 * sources, ses feuilles et les valeurs de ses gabarits de classe.
 */
import fs from 'node:fs';
import path from 'node:path';

/** Le dossier des composants et de la feuille du socle. */
export const DOSSIER_UI_DU_SOCLE = path.resolve(__dirname, '..', 'src', 'ui');

/** Les sources `.ts` des composants du socle. */
export function sourcesDuSocle(): string[] {
  return fs
    .readdirSync(DOSSIER_UI_DU_SOCLE)
    .filter((nom) => nom.endsWith('.ts'))
    .map((nom) => path.join(DOSSIER_UI_DU_SOCLE, nom));
}

/** La feuille du socle, placée avant celle de chaque plugin. */
export function feuilleDuSocle(): string {
  return fs.readFileSync(path.join(DOSSIER_UI_DU_SOCLE, 'socle.css'), 'utf8');
}

export interface EntreesLoiDesStyles {
  /** Le texte des sources qui posent des classes, composants du socle compris. */
  readonly source: string;
  /** Les feuilles, dans l'ordre où le build les concatène. */
  readonly feuille: string;
  /**
   * Ce que vaut la variable d'un gabarit de classe, lu à sa source : pour
   * `btn-${variant}`, la clé `variant` rend les variantes posées.
   */
  readonly valeursDeGabarit: Readonly<Record<string, () => string[]>>;
  /** Les classes que l'hôte pose, jamais le code du plugin. */
  readonly poseesParLHote: ReadonlySet<string>;
}

/** Les variantes de bouton : leur défaut, et chaque valeur passée à `createButton`. */
export function variantesDeBouton(source: string): string[] {
  const defaut = /variant = '([^']+)'/.exec(source);
  const passees = [...source.matchAll(/variant: '([^']+)'/g)].map((trouve) => trouve[1]);
  return [...new Set([...(defaut ? [defaut[1]] : []), ...passees])];
}

/**
 * Toutes les classes que l'interface peut poser : littérales, puis fabriquées.
 * Une variable de gabarit sans valeur lève : elle masquerait des classes.
 */
export function classesPosees({ source, valeursDeGabarit }: EntreesLoiDesStyles): Set<string> {
  const posees = new Set<string>();
  for (const affectation of source.matchAll(/className = '([^']+)'/g)) {
    for (const classe of affectation[1].split(/\s+/)) posees.add(classe);
  }
  // Un élément SVG n'a pas de `className` modifiable : il reçoit sa classe par
  // `setAttribute('class', …)` ou `classList.add(…)`, littéraux seulement.
  for (const attribut of source.matchAll(/setAttribute\('class', '([^']+)'\)/g)) {
    for (const classe of attribut[1].split(/\s+/)) posees.add(classe);
  }
  for (const ajout of source.matchAll(/classList\.(?:add|toggle)\(([^)]*)\)/g)) {
    const [premiere, ...autres] = [...ajout[1].matchAll(/'([^']+)'/g)].map((trouve) => trouve[1]);
    // `toggle` ne prend qu'une classe ; `add` les prend toutes.
    for (const classe of ajout[0].startsWith('classList.toggle') ? [premiere] : [premiere, ...autres]) {
      if (classe) posees.add(classe);
    }
  }
  // Les gabarits : `btn btn-${variant}` donne `btn`, puis une classe par valeur.
  for (const gabarit of source.matchAll(/className = `([^`]+)`/g)) {
    for (const morceau of gabarit[1].split(/\s+/)) {
      const fabrique = /^([a-z-]+)-\$\{(\w+)\}$/.exec(morceau);
      if (!fabrique) {
        posees.add(morceau);
        continue;
      }
      const valeurs = valeursDeGabarit[fabrique[2]]?.() ?? [];
      if (valeurs.length === 0) throw new Error(`aucune valeur trouvée pour ${morceau}`);
      for (const valeur of valeurs) posees.add(`${fabrique[1]}-${valeur}`);
    }
  }
  return posees;
}

/** Les classes que la feuille stylise, hors pseudo-classes et sélecteurs d'attribut. */
export function classesStylisees(feuille: string): Set<string> {
  const sansCommentaires = feuille.replace(/\/\*[\s\S]*?\*\//g, '');
  const stylisees = new Set<string>();
  for (const selecteur of sansCommentaires.matchAll(/\.([a-z][\w-]*)/g)) stylisees.add(selecteur[1]);
  return stylisees;
}

/** Les classes posées que rien ne stylise. */
export function classesSansRegle(entrees: EntreesLoiDesStyles): string[] {
  const stylisees = classesStylisees(entrees.feuille);
  return [...classesPosees(entrees)].filter((classe) => !stylisees.has(classe));
}

/** Les règles qui visent une classe que ni l'interface ni l'hôte ne pose. */
export function reglesMortes(entrees: EntreesLoiDesStyles): string[] {
  const posees = classesPosees(entrees);
  return [...classesStylisees(entrees.feuille)].filter(
    (classe) => !posees.has(classe) && !entrees.poseesParLHote.has(classe),
  );
}

/**
 * Les couleurs écrites après le bloc de rôles. Les replis vivent dans ce bloc,
 * en tête de la feuille du socle : une couleur écrite dans une règle est un
 * repli que personne ne relira au moment de vérifier les deux thèmes.
 */
export function couleursHorsDesRoles(feuille: string): string[] {
  const apresLesRoles = feuille.slice(feuille.indexOf('* {'));
  return [...apresLesRoles.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((trouve) => trouve[0]);
}
