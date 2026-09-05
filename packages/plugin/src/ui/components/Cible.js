/**
 * Le bloc cible : ce sur quoi l'export va porter (U2.1).
 *
 * Il est PERSISTANT. Le nom du composant ne vivait que dans la note d'état, que
 * `requestExport` écrase par « Traitement en cours… » : le designer perdait de
 * vue ce qu'il exportait au moment où il l'exportait, et le message de succès
 * ne le renommait pas.
 *
 * C'est le rang 1 de la hiérarchie (CONTRIBUTING.md) : la position, en haut et
 * hors de toute carte, et la taille. Rien d'autre ne le signale.
 */
export function createCible() {
  const section = document.createElement('section');
  section.className = 'cible';

  const nom = document.createElement('div');
  nom.className = 'cible-nom';

  const detail = document.createElement('div');
  detail.className = 'cible-detail';

  const avertissement = document.createElement('p');
  avertissement.className = 'cible-avertissement';
  avertissement.hidden = true;

  section.append(nom, detail, avertissement);

  return {
    element: section,
    /**
     * `cible` et `raison` s'excluent : ou bien il y a une cible, ou bien il y a
     * ce qui manque pour en avoir une. Le sandbox tranche, l'interface place.
     */
    afficher(message) {
      const { cible, raison, avertissement: texte } = message;
      section.dataset.state = cible ? 'prete' : 'vide';
      nom.textContent = cible ? cible.nom : 'Aucun composant sélectionné';
      detail.textContent = cible ? message.detail : raison ?? '';
      avertissement.textContent = texte ?? '';
      avertissement.hidden = !texte;
    },
  };
}
