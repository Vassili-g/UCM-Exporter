// Sonde S5 : `node.findAll(() => true)` est-il la tranche du relevé de son
// ancêtre, dans le même ordre ?
//
// À coller dans la console d'un plugin de développement, un component set ou
// un composant sélectionné. Le script ne fait que lire.
//
// Pour chaque descendant qui a des enfants, il compare son propre relevé à la
// tranche du relevé de la racine qui commence juste après lui. Il imprime le
// nombre de descendants comparés et les écarts. Zéro écart sur le corpus est la
// condition du relevé par variant (conception, section 5.7).
(() => {
  const racine = figma.currentPage.selection[0];
  if (!racine || !('findAll' in racine)) {
    console.log('[S5] sélectionner un composant ou un component set');
    return;
  }
  const debut = Date.now();
  const releve = racine.findAll(() => true);
  const rang = new Map(releve.map((node, index) => [node.id, index]));
  let compares = 0;
  const ecarts = [];
  for (const node of releve) {
    if (!('children' in node) || node.children.length === 0) continue;
    compares += 1;
    const propre = node.findAll(() => true);
    const depart = rang.get(node.id) + 1;
    const tranche = releve.slice(depart, depart + propre.length);
    const premierEcart = propre.findIndex((descendant, index) => tranche[index]?.id !== descendant.id);
    if (premierEcart !== -1 || tranche.length !== propre.length) {
      ecarts.push({ node: node.id, nom: node.name, longueur: propre.length, premierEcart });
    }
  }
  console.log('[S5]', {
    racine: racine.name,
    nodes: releve.length,
    compares,
    ecarts: ecarts.length,
    ms: Date.now() - debut,
  });
  if (ecarts.length > 0) console.table(ecarts.slice(0, 20));
})();
