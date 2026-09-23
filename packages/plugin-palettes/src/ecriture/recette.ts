/**
 * Range la recette dans le document ([REC-01], [REC-04], [REC-10]). Avec la
 * planche, c'est l'une des deux écritures du plugin.
 */
import { jsonCanonique, validerRecette, type Refus } from 'ucm-couleur';

import { CLE_RECETTE, ESPACE_PARTAGE, empreinteDuTexte } from '../lecture';

/** Ce que le rangement touche : la racine du document et la pile d'annulation. */
export interface CibleDuRangement {
  readonly root: {
    getSharedPluginData(espace: string, cle: string): string;
    setSharedPluginData(espace: string, cle: string, valeur: string): void;
  };
  commitUndo(): void;
}

export type IssueDuRangement =
  | { readonly issue: 'rangee'; readonly empreinte: string }
  /** La recette rangée n'est plus celle que l'interface a lue ([REC-10]). */
  | { readonly issue: 'modifiee-ailleurs' }
  | { readonly issue: 'invalide'; readonly refus: readonly Refus[] };

/**
 * Range `recette` si elle est valide ([REC-05]) et si la recette rangée a
 * encore l'empreinte `empreinteLue`. Un refus n'écrit rien : la recette rangée
 * reste intacte ([REC-04]). Après l'écriture, `commitUndo` fait du rangement
 * un pas d'annulation à lui seul ([REC-06]).
 */
export function rangerRecette(cible: CibleDuRangement, recette: unknown, empreinteLue: string | null): IssueDuRangement {
  const lue = validerRecette(recette);
  if ('refus' in lue) return { issue: 'invalide', refus: lue.refus };
  const rangee = cible.root.getSharedPluginData(ESPACE_PARTAGE, CLE_RECETTE);
  if (empreinteDuTexte(rangee) !== empreinteLue) return { issue: 'modifiee-ailleurs' };
  const texte = jsonCanonique(lue.recette);
  cible.root.setSharedPluginData(ESPACE_PARTAGE, CLE_RECETTE, texte);
  cible.commitUndo();
  return { issue: 'rangee', empreinte: empreinteDuTexte(texte) as string };
}
