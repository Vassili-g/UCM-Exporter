/** Un document Figma réduit à ce que la lecture et le rangement de la recette touchent. */
import type { ProfilDuDocument } from '../src/lecture';

export interface DocumentDeTest {
  readonly donnees: Map<string, string>;
  readonly annulations: string[];
  readonly root: {
    readonly documentColorProfile: ProfilDuDocument;
    getSharedPluginData(espace: string, cle: string): string;
    setSharedPluginData(espace: string, cle: string, valeur: string): void;
  };
  commitUndo(): void;
}

/**
 * Un document dont la donnée partagée vit dans une table. Chaque écriture et
 * chaque `commitUndo` s'inscrivent, dans l'ordre, dans `annulations`.
 */
export function documentDeTest(recette = '', profil: ProfilDuDocument = 'SRGB'): DocumentDeTest {
  const donnees = new Map<string, string>();
  if (recette !== '') donnees.set('ucm_palettes/recette', recette);
  const annulations: string[] = [];
  return {
    donnees,
    annulations,
    root: {
      documentColorProfile: profil,
      getSharedPluginData: (espace, cle) => donnees.get(`${espace}/${cle}`) ?? '',
      setSharedPluginData: (espace, cle, valeur) => {
        donnees.set(`${espace}/${cle}`, valeur);
        annulations.push(`ecrire ${espace}/${cle}`);
      },
    },
    commitUndo: () => {
      annulations.push('commitUndo');
    },
  };
}
