// Sonde S1 : `nodechange` est-il émis pour une page non courante, pour une
// modification distante, pour une mise à jour de bibliothèque ?
//
// À coller dans la console d'un plugin de développement lancé sur le fichier
// à sonder (Plugins > Development > Open console). Le script n'écrit rien dans
// le document : il charge les pages et s'abonne à leurs événements.
//
// Déroulé :
// 1. coller le script ; il liste les pages écoutées ;
// 2. rester sur une page A, et faire modifier un calque d'une page B par un
//    second compte (modification distante sur une page non courante) ;
// 3. accepter une mise à jour de bibliothèque qui touche une instance d'une
//    page non courante ;
// 4. modifier soi-même un calque de la page courante (témoin) ;
// 5. appeler `s1Bilan()`, puis `s1Arreter()`.
//
// Consigner, avec la version de Figma : pour chaque geste, la page, l'origine
// (`LOCAL` ou `REMOTE`) et le nombre d'événements reçus, ou leur absence.
(async () => {
  const recus = [];
  const abonnes = [];
  for (const page of figma.root.children) {
    await page.loadAsync();
    const ecouteur = (evenement) => {
      const changements = evenement.nodeChanges || [];
      recus.push({
        page: page.name,
        courante: page === figma.currentPage,
        instant: new Date().toISOString(),
        changements: changements.length,
        origines: Array.from(new Set(changements.map((c) => c.origin))).join(','),
        types: Array.from(new Set(changements.map((c) => c.type))).join(','),
      });
      console.log('[S1]', recus[recus.length - 1]);
    };
    try {
      page.on('nodechange', ecouteur);
      abonnes.push({ page, ecouteur });
    } catch (erreur) {
      console.log('[S1] abonnement refusé', page.name, String(erreur));
    }
  }
  console.log('[S1] pages écoutées :', abonnes.map((a) => a.page.name).join(', '));
  globalThis.s1Bilan = () => {
    console.table(recus);
    return recus;
  };
  globalThis.s1Arreter = () => {
    for (const { page, ecouteur } of abonnes) page.off('nodechange', ecouteur);
    console.log('[S1] abonnements retirés');
  };
})();
