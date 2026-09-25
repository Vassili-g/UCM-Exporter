// Sonde S6 : le maître d'une instance, rendu par `getMainComponentAsync`,
// donne-t-il sa page par ses parents quand cette page n'est pas chargée ?
//
// À coller dans la console d'un plugin de développement FRAÎCHEMENT lancé,
// avant tout autre script : au lancement, seule la page courante est chargée.
// Sélectionner un composant dont des instances ont leur maître sur une autre
// page. Le script ne fait que lire, puis charge les pages trouvées.
//
// Pour chaque instance, il imprime : la page atteinte par la remontée des
// parents, si la lecture des enfants de cette page levait avant `loadAsync`
// (signe qu'elle n'était pas chargée), et si le maître y est retrouvé après le
// chargement. Une remontée qui s'arrête avant un node `PAGE` sur une page non
// chargée impose le repli de L2.8.
(async () => {
  const racine = figma.currentPage.selection[0];
  if (!racine || !('findAllWithCriteria' in racine)) {
    console.log('[S6] sélectionner un composant ou un component set');
    return;
  }
  const lignes = [];
  const instances = racine.findAllWithCriteria({ types: ['INSTANCE'] });
  for (const instance of instances) {
    const maitre = await instance.getMainComponentAsync().catch(() => null);
    if (!maitre) {
      lignes.push({ instance: instance.name, maitre: null });
      continue;
    }
    const chaine = [];
    let courant = maitre;
    while (courant && courant.type !== 'PAGE' && courant.type !== 'DOCUMENT') {
      chaine.push(courant.type);
      courant = courant.parent;
    }
    const page = courant && courant.type === 'PAGE' ? courant : null;
    let lectureAvantChargement = 'non tentée';
    if (page && page !== figma.currentPage) {
      try {
        lectureAvantChargement = `lisible (${page.children.length} enfants)`;
      } catch (erreur) {
        lectureAvantChargement = `lève : ${String(erreur).slice(0, 80)}`;
      }
    }
    let retrouve = null;
    if (page) {
      await page.loadAsync();
      retrouve = page.findOne((node) => node.id === maitre.id) !== null;
    }
    lignes.push({
      instance: instance.name,
      maitre: maitre.name,
      distant: maitre.remote,
      page: page ? page.name : `aucune (arrêt sur ${courant ? courant.type : 'null'})`,
      courante: page === figma.currentPage,
      chaine: chaine.join(' > '),
      lectureAvantChargement,
      retrouveApresChargement: retrouve,
    });
  }
  console.table(lignes);
})();
