/**
 * Ce sur quoi l'export va porter, et pourquoi il ne peut pas porter (U2.1).
 *
 * **Le défaut refermé ici.** Le nom du composant n'existait que dans une
 * PHRASE, envoyée à la note d'état : le premier clic l'écrasait par
 * « Traitement en cours… », et le message de succès ne le renommait pas. Le
 * designer perdait donc de vue ce qu'il exportait au moment précis où il
 * l'exportait. Une structure survit à un changement de texte ; une phrase, non.
 *
 * **Et deux situations que l'interface confondait.** Rien de sélectionné,
 * plusieurs layers, un layer qui n'est pas un composant : `reportSelectionState`
 * envoyait le même message dans les trois cas, alors que le geste diffère. La
 * galerie l'a montré en produisant deux captures identiques pour deux états
 * déclarés distincts.
 */

/** Un layer de la sélection, réduit à ce qui décide. */
export type LayerSelectionne = {
  type: string;
  name: string;
  /** Nombre de variants, pour un component set seulement. */
  variants?: number;
};

/** La cible, telle que l'interface l'affiche. */
export type Cible = {
  nom: string;
  /** Le mot que Figma emploie dans son panneau : « Component », « Component set ». */
  genre: string;
  /** `null` pour un component seul : il n'a pas de variants, il en EST un. */
  variants: number | null;
};

export type EtatDeCible = {
  cible: Cible | null;
  /** Ce qui manque pour exporter, quand rien n'est exportable. */
  raison: string | null;
};

/**
 * Lit la sélection et rend la cible, ou la raison qui l'empêche.
 *
 * Les raisons nomment un geste et se distinguent l'une de l'autre : « aucune
 * sélection » et « ce layer n'est pas un composant » ne se corrigent pas de la
 * même façon, et les confondre laissait le designer chercher lequel des deux
 * cas était le sien.
 */
export function etatDeCible(selection: LayerSelectionne[]): EtatDeCible {
  if (selection.length === 0) {
    return { cible: null, raison: 'Sélectionnez un component ou un component set dans Figma.' };
  }

  if (selection.length > 1) {
    return {
      cible: null,
      raison: `Sélectionnez un seul layer. L’export porte sur un composant à la fois, et ${selection.length} layers sont sélectionnés.`,
    };
  }

  const [layer] = selection;
  if (layer.type === 'COMPONENT_SET') {
    return { cible: { nom: layer.name, genre: 'Component set', variants: layer.variants ?? 0 }, raison: null };
  }
  if (layer.type === 'COMPONENT') {
    return { cible: { nom: layer.name, genre: 'Component', variants: null }, raison: null };
  }

  return {
    cible: null,
    raison: `« ${layer.name} » n’est ni un component ni un component set. Sélectionnez le composant à exporter.`,
  };
}

/** Ce que la cible affiche sous son nom : son genre, et ses variants s'il en a. */
export function detailDeCible(cible: Cible | null): string | null {
  if (!cible) return null;
  if (cible.variants === null) return cible.genre;
  const pluriel = cible.variants === 1 ? 'variant' : 'variants';
  return `${cible.genre} · ${cible.variants} ${pluriel}`;
}
