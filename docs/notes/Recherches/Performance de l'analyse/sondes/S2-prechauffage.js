// Sonde S2 : le préchauffage de l'index fige-t-il Figma ?
//
// À coller dans la console d'un plugin de développement FRAÎCHEMENT lancé
// (mesure à froid), un composant à instances sélectionné. Pendant que le script
// tourne, faire défiler le canevas et noter tout arrêt de l'image. Le script ne
// fait que lire et charger des pages.
//
// Il rejoue le calcul de l'index de L2 (conception, section 5.4) : maîtres des
// instances rendues, page de chaque maître par ses parents, chargement et
// balayage de cette page seule, puis un tour de plus pour les dépendances
// contractées. Un battement `setTimeout(0)` tourne pendant ce temps et relève le
// plus grand écart entre deux battements.
//
// Seuil (conception, section 6) : un écart de plus de 100 ms sur un seul des
// cinq essais à froid d'un fichier du corpus retire L3.
(async () => {
  const racine = figma.currentPage.selection[0];
  if (!racine || !('findAllWithCriteria' in racine)) {
    console.log('[S2] sélectionner un composant ou un component set');
    return;
  }

  let battre = true;
  let dernier = Date.now();
  let plusGrandEcart = 0;
  let battements = 0;
  const battement = () => {
    const maintenant = Date.now();
    plusGrandEcart = Math.max(plusGrandEcart, maintenant - dernier);
    dernier = maintenant;
    battements += 1;
    if (battre) setTimeout(battement, 0);
  };
  setTimeout(battement, 0);
  const respirer = () => new Promise((resolve) => setTimeout(resolve, 0));

  const compacter = (nom) => nom.replace(/\s+/g, '').toLowerCase();
  const pageDe = (node) => {
    let courant = node;
    while (courant && courant.type !== 'PAGE') courant = courant.parent;
    return courant && courant.type === 'PAGE' ? courant : null;
  };
  const nomsDeLaPage = (page) => {
    const avant = figma.skipInvisibleInstanceChildren;
    figma.skipInvisibleInstanceChildren = true;
    try {
      const noms = new Set();
      for (const texte of page.findAllWithCriteria({ types: ['TEXT'] })) {
        try {
          if (texte.name.trim().toLowerCase() !== 'component-name') continue;
          let parent = texte.parent;
          while (parent && parent.type !== 'INSTANCE' && parent.type !== 'PAGE') parent = parent.parent;
          if (!parent || parent.type !== 'INSTANCE') continue;
          const nom = compacter(texte.characters);
          if (nom && !texte.characters.includes('[À compléter]')) noms.add(nom);
        } catch (_) {
          // Un calque que Figma ne sert plus ne déclare rien.
        }
      }
      return noms;
    } finally {
      figma.skipInvisibleInstanceChildren = avant;
    }
  };

  const debut = Date.now();
  const nomsParPage = new Map();
  const contractes = new Set();
  const vus = new Set();
  let racines = racine.type === 'COMPONENT_SET' ? [...racine.children] : [racine];
  let tours = 0;
  while (racines.length > 0) {
    tours += 1;
    const proprietaires = [];
    for (const variant of racines) {
      for (const instance of variant.findAllWithCriteria({ types: ['INSTANCE'] })) {
        const maitre = await instance.getMainComponentAsync().catch(() => null);
        if (!maitre) continue;
        const proprietaire = maitre.parent && maitre.parent.type === 'COMPONENT_SET' ? maitre.parent : maitre;
        if (vus.has(proprietaire.id)) continue;
        vus.add(proprietaire.id);
        proprietaires.push({ proprietaire, maitre });
      }
    }
    racines = [];
    for (const { proprietaire, maitre } of proprietaires) {
      if (maitre.remote) continue;
      const page = pageDe(proprietaire);
      if (!page) continue;
      if (!nomsParPage.has(page.id)) {
        await respirer();
        await page.loadAsync();
        nomsParPage.set(page.id, nomsDeLaPage(page));
      }
      if (!nomsParPage.get(page.id).has(compacter(proprietaire.name))) continue;
      contractes.add(proprietaire.name);
      racines.push(maitre);
      if (proprietaire.type === 'COMPONENT_SET' && proprietaire.defaultVariant) {
        racines.push(proprietaire.defaultVariant);
      }
    }
  }
  const duree = Date.now() - debut;
  battre = false;
  await new Promise((resolve) => setTimeout(resolve, 20));
  console.log('[S2]', {
    racine: racine.name,
    ms: duree,
    tours,
    pagesChargees: nomsParPage.size,
    contractes: Array.from(contractes),
    battements,
    plusGrandEcartMs: plusGrandEcart,
    fige: plusGrandEcart > 100,
  });
})();
