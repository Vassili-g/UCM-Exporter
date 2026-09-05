/**
 * Le verdict du pré-vol : ce que l'analyse a trouvé, et ce qu'il reste à faire.
 *
 * **Pourquoi une étape de plus (U3.1).** Un clic enchaînait calcul, comparaison,
 * création de branche, commit, pull request et ouverture du navigateur. Le
 * designer lisait donc les avertissements APRÈS que tout avait été écrit ; il
 * corrigeait dans Figma, réexportait, et obtenait une seconde pull request
 * pendant que la première restait ouverte.
 *
 * **Le clic supplémentaire n'est pas payé pour rien.** Il n'apparaît que
 * lorsqu'il y a effectivement quelque chose à publier : un export identique au
 * dépôt n'atteint jamais la publication. Ce qu'il achète est réel — un
 * avertissement corrigé avant publication, c'est une pull request orpheline et
 * un tour de revue en moins.
 */

/** Ce que l'analyse a conclu, et rien d'autre : elle n'écrit jamais. */
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
  /** Où le contenu identique se trouve déjà. */
  ou?: string | null;
  avertissements: number;
};

const NOM = { component: 'le contrat', tokens: 'les tokens' } as const;

/**
 * Compose le verdict.
 *
 * Le compte des points à corriger passe EN PREMIER quand il y en a : c'est lui
 * qui décide si l'on publie maintenant ou si l'on retourne dans Figma. Il ne
 * bloque rien — un avertissement n'est pas un refus —, il change seulement
 * l'ordre de lecture.
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

  return {
    code: 'a-publier',
    texte: joindre(points, `Prêt à publier dans ${entree.chemin ?? 'le repository'}.`),
    action: 'Publier et ouvrir la pull request',
  };
}

function joindre(premier: string | null, second: string): string {
  return premier ? `${premier} ${second}` : second;
}

function majuscule(mot: string): string {
  return mot.charAt(0).toUpperCase() + mot.slice(1);
}
