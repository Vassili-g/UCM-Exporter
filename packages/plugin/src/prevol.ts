/**
 * Décrit l'analyse préalable sans publier. Elle évite d'ouvrir une pull request
 * avant la lecture des avertissements et n'offre l'action que si le contenu change.
 */
export type CodeVerdict = 'a-publier' | 'identique' | 'sans-depot';

export type Verdict = {
  code: CodeVerdict;

  /** Le rang 1 du compte rendu : ce qui décide de l'action suivante. */
  texte: string;

  /** Le libellé de l'action, ou `null` quand il n'y a rien à faire. */
  action: string | null;
};

export type EntreeDeVerdict = {
  code: CodeVerdict;
  genre: 'component' | 'tokens';

  /** Où l'artefact irait, quand c'est connu. */
  chemin?: string | null;

  source?: string | null;

  ou?: string | null;
  avertissements: number;
};

const NOM = { component: 'le contrat', tokens: 'les tokens' } as const;

const PUBLIER = { component: 'Publier le composant', tokens: 'Publier les tokens' } as const;

/**
 * Choisit le constat et l'action. Les points à corriger passent en premier mais
 * n'interdisent pas la publication : un avertissement n'est pas un refus.
 */
export function verdictDePrevol(entree: EntreeDeVerdict): Verdict {
  const points = entree.avertissements > 0
    ? `${entree.avertissements} point${entree.avertissements === 1 ? '' : 's'} à corriger dans Figma.`
    : null;

  if (entree.code === 'identique') {
    return {
      code: 'identique',
      texte: joindre(points, `Identique à ce qui est déjà déposé (${entree.ou ?? 'dépôt'}). Rien à publier.`),
      action: null,
    };
  }

  if (entree.code === 'sans-depot') {
    return {
      code: 'sans-depot',
      texte: joindre(
        points,
        `Aucun repository connecté. ${majuscule(NOM[entree.genre])} sera téléchargé sur votre poste.`,
      ),
      action: `Télécharger ${NOM[entree.genre]}`,
    };
  }

  const ou = entree.chemin ?? 'le repository';
  const decide = entree.source ? ` (d’après ${entree.source})` : '';
  return {
    code: 'a-publier',
    texte: joindre(points, `Prêt à publier dans ${ou}${decide}.`),
    action: PUBLIER[entree.genre],
  };
}

function joindre(premier: string | null, second: string): string {
  return premier ? `${premier} ${second}` : second;
}

function majuscule(mot: string): string {
  return mot.charAt(0).toUpperCase() + mot.slice(1);
}
