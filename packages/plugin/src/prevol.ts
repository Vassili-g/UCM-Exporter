/**
 * Décrit l'analyse préalable sans publier. Elle évite d'ouvrir une pull request
 * avant la lecture des avertissements et n'offre l'action que si le contenu change.
 */
import type { EtatDesTokens } from './depot';
import { TEXTES_DE_REPLI } from './connexion';
import type { CauseDeRepli } from './connexion';

export type CodeVerdict = 'a-publier' | 'identique' | 'sans-depot';

export type Verdict = {
  code: CodeVerdict;

  /** Le rang 1 du compte rendu : ce qui décide de l'action suivante. */
  texte: string;

  /** Le libellé de l'action, ou `null` quand il n'y a rien à faire. */
  action: string | null;

  /** `warning` quand un point à corriger ou une consigne sur les tokens accompagne le verdict. */
  etat: '' | 'warning';
};

export type EntreeDeVerdict = {
  code: CodeVerdict;
  genre: 'component' | 'tokens';

  /** Où l'artefact irait, quand c'est connu. */
  chemin?: string | null;

  source?: string | null;

  ou?: string | null;
  avertissements: number;

  /** L'état des tokens du repository, lu pour un composant à publier. */
  tokens?: EtatDesTokens | null;

  /** Le nom de la demande de fusion sur la forge visée. */
  demande?: string;

  /** Le nom du dépôt visé, pour un verdict `a-publier`. */
  nom?: string;

  /** Pourquoi aucun dépôt n'est visé, pour un verdict `sans-depot`. */
  repli?: CauseDeRepli;
};

/**
 * Ce que le designer fait avant de publier un composant : le contrôle du
 * repository refuse sa demande tant que les tokens ne sont pas fusionnés.
 * Seul endroit qui juge des tokens non fusionnés : l'état `warning` du verdict
 * suit cette consigne.
 */
function ordreDesTokens(tokens: EtatDesTokens | null | undefined, demande: string): string | null {
  if (tokens === 'absents') {
    return `Ce repository n’a pas encore de tokens : publiez-les et faites fusionner leur ${demande} avant celle de ce composant, que le contrôle refusera jusque-là.`;
  }
  if (tokens === 'en-attente') {
    return `Les tokens attendent la fusion de leur ${demande} : faites-la fusionner avant celle de ce composant, que le contrôle refusera jusque-là.`;
  }
  return null;
}

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
  const etat = points ? 'warning' : '';

  if (entree.code === 'identique') {
    return {
      code: 'identique',
      texte: joindre(points, `Identique à ce qui est déjà déposé (${entree.ou ?? 'dépôt'}). Rien à publier.`),
      action: null,
      etat,
    };
  }

  if (entree.code === 'sans-depot') {
    return {
      code: 'sans-depot',
      texte: joindre(
        points,
        `${TEXTES_DE_REPLI[entree.repli ?? 'aucun-depot'].verdict} ${majuscule(NOM[entree.genre])} sera téléchargé sur votre poste.`,
      ),
      action: `Télécharger ${NOM[entree.genre]}`,
      etat,
    };
  }

  const ou = entree.chemin ?? 'le repository';
  const decide = entree.source ? ` (d’après ${entree.source})` : '';
  const ordre = entree.genre === 'component' ? ordreDesTokens(entree.tokens, entree.demande ?? 'demande de fusion') : null;
  return {
    code: 'a-publier',
    texte: [points, `Prêt à publier dans ${entree.nom ? `${entree.nom} : ` : ''}${ou}${decide}.`, ordre].filter(Boolean).join(' '),
    action: PUBLIER[entree.genre],
    etat: points || ordre ? 'warning' : '',
  };
}

function joindre(premier: string | null, second: string): string {
  return premier ? `${premier} ${second}` : second;
}

function majuscule(mot: string): string {
  return mot.charAt(0).toUpperCase() + mot.slice(1);
}
