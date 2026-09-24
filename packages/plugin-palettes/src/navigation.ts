/**
 * La navigation vers la planche ([ARC-15], E18) : ouvrir sa page et cadrer
 * les cadres dessinés. Elle change la vue du designer, jamais le document.
 */

/** Ce que la navigation demande à Figma. */
export interface FigmaDeLaNavigation {
  getNodeByIdAsync(id: string): Promise<unknown>;
  setCurrentPageAsync(page: PageNode): Promise<void>;
  readonly viewport: { scrollAndZoomIntoView(noeuds: readonly SceneNode[]): void };
}

/**
 * Ouvre la page de la planche et cadre les cadres encore présents. Rend faux
 * quand la page a disparu depuis le dessin.
 */
export async function voirSurLaPlanche(figma: FigmaDeLaNavigation, page: string, cadres: readonly string[]): Promise<boolean> {
  const trouvee = await figma.getNodeByIdAsync(page) as PageNode | null;
  if (!trouvee || trouvee.type !== 'PAGE' || trouvee.removed) return false;
  await figma.setCurrentPageAsync(trouvee);
  const noeuds: SceneNode[] = [];
  for (const id of cadres) {
    const noeud = await figma.getNodeByIdAsync(id) as SceneNode | null;
    if (noeud && !noeud.removed) noeuds.push(noeud);
  }
  if (noeuds.length > 0) figma.viewport.scrollAndZoomIntoView(noeuds);
  return true;
}
