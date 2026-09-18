/**
 * Ce que la page active offre pour créer les règles d'un composant.
 *
 * Le module lit, et rien d'autre : il dit quel bouton l'interface montre, et
 * il trouvera les maîtres que l'écriture emploiera. La recherche ne quitte
 * jamais la page active, sans `loadAllPagesAsync` ni `importComponentByKeyAsync` :
 * un conteneur rangé sur une autre page n'est pas cherché, et le bouton en
 * crée un ici.
 */
import type { ReleveDeSource } from '../contract/extractRules';

/**
 * Ce que le bouton de création propose.
 *
 * `remplir` vise une instance collée et jamais remplie, que le designer a
 * posée où il la voulait ; `creer` en pose une neuve à côté du composant ;
 * `sans-source` dit que la page ne porte aucun modèle à copier, et le bouton
 * reste inactif sous la note qui mène au kit.
 */
export type Offre = 'creer' | 'remplir' | 'sans-source';

/**
 * L'offre que le relevé de la page justifie, ou `null` quand il n'y a rien à
 * proposer.
 *
 * Un composant qui a déjà son conteneur n'en reçoit aucune : le créer une
 * seconde fois ferait deux instances revendiquant le même nom, ce que
 * l'analyse signale ensuite comme un doublon.
 */
export function offreDeCreation(releve: ReleveDeSource): Offre | null {
  if (releve.conteneurDuComposant) return null;
  if (releve.conteneurMarque) return 'remplir';
  if (releve.maitreLocal || releve.instanceSource) return 'creer';
  return 'sans-source';
}
