/**
 * La navigation vers la planche ([ARC-15], E18) : ouvrir la page d'un cadre et
 * le cadrer. Elle change la vue du designer, jamais le document.
 */

/** Ce que la navigation demande à Figma. */
export interface FigmaDeLaNavigation {
  getNodeByIdAsync(id: string): Promise<unknown>;
  setCurrentPageAsync(page: PageNode): Promise<void>;
  readonly viewport: { scrollAndZoomIntoView(noeuds: readonly SceneNode[]): void };
}

/** La page qui porte un nœud, en remontant ses parents. */
function pageDu(noeud: BaseNode): PageNode | null {
  let courant = noeud.parent;
  while (courant && courant.type !== 'PAGE') courant = courant.parent;
  return courant as PageNode | null;
}

/**
 * Ouvre la page du premier cadre encore présent, et cadre ceux de cette page :
 * un cadre peut avoir quitté la page de la planche (V8.6). Sans cadre présent,
 * ouvre la page de la planche. Rend faux quand rien ne s'ouvre.
 */
export async function voirSurLaPlanche(figma: FigmaDeLaNavigation, page: string, cadres: readonly string[]): Promise<boolean> {
  const noeuds: SceneNode[] = [];
  for (const id of cadres) {
    const noeud = await figma.getNodeByIdAsync(id) as SceneNode | null;
    if (noeud && !noeud.removed) noeuds.push(noeud);
  }
  const cible = noeuds.length > 0 ? pageDu(noeuds[0]) : await figma.getNodeByIdAsync(page) as PageNode | null;
  if (!cible || cible.type !== 'PAGE' || cible.removed) return false;
  await figma.setCurrentPageAsync(cible);
  const surLaPage = noeuds.filter((noeud) => pageDu(noeud) === cible);
  if (surLaPage.length > 0) figma.viewport.scrollAndZoomIntoView(surLaPage);
  return true;
}
