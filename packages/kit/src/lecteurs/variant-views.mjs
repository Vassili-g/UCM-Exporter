/**
 * L'unique endroit où ce repository résout les renvois d'un contrat.
 *
 * Depuis la 11.0, un contrat ne recopie plus rien : une vue est cinq renvois
 * vers cinq catalogues de parties, `structure` renvoie au catalogue des
 * structures, le nom Figma d'un variant se rebâtit depuis une table
 * d'étiquettes, et deux champs qui se dérivaient — l'index des tokens, le
 * miroir des avertissements — ne sont plus publiés du tout.
 *
 * Tout cela se résout ICI, et nulle part ailleurs. Un second résolveur, même
 * équivalent en apparence, finirait par lire une vue que le contrat ne contient
 * pas.
 */

/** Majeure du schéma déclaré, ou 0 si elle est illisible. */
function majeure(contrat) {
  const lu = Number.parseInt(String(contrat?.meta?.contractVersion), 10);
  return Number.isInteger(lu) ? lu : 0;
}

/** Résout un renvoi vers un catalogue, ou rend la valeur si elle est inline. */
function resoudre(catalogue, renvoi, defaut) {
  if (renvoi === undefined || renvoi === null) return defaut;
  if (typeof renvoi !== "string") return renvoi;
  const trouve = catalogue?.[renvoi];
  return trouve === undefined ? defaut : trouve;
}

/**
 * La vue exacte d'un variant, toujours rendue sous la même forme : un objet à
 * cinq parties. Inline en v8, cataloguée en bloc de la v9 à la 10.3, cataloguée
 * partie par partie depuis la 11.0.
 */
export function vueExacteDuVariant(contrat, variant) {
  if (majeure(contrat) < 9) return variant;
  const vue = contrat?.variantViews?.[variant?.view];
  if (!vue) return undefined;
  if (majeure(contrat) < 11) return vue;
  return {
    structure: resoudre(contrat.viewStructures, vue.structure, undefined),
    typography: resoudre(contrat.viewTypographies, vue.typography, []),
    composes: resoudre(contrat.viewComposes, vue.composes, []),
    icons: resoudre(contrat.viewIcons, vue.icons, {}),
    paintPlacements: resoudre(contrat.viewPaintPlacements, vue.paintPlacements, {}),
  };
}

/** Dépendances exactes d'un variant, quelle que soit sa représentation. */
export function compositionsExactesDuVariant(contrat, variant) {
  const vue = vueExacteDuVariant(contrat, variant);
  return Array.isArray(vue?.composes) ? vue.composes : [];
}

/**
 * La projection de référence, rendue comme le contrat l'écrivait jusqu'à la
 * 10.3 : l'arbre de slots, plus `sizes` et `variantAxes`.
 *
 * Depuis la 11.0, `structure` ne porte qu'un renvoi. Le résoudre ici évite que
 * chaque contrôle ait à savoir si la version qu'il lit recopie l'arbre ou le
 * désigne.
 */
export function projectionDeReference(contrat) {
  const structure = contrat?.structure;
  if (!structure || typeof structure !== "object") return structure;
  if (majeure(contrat) < 11) return structure;
  const { view, ...reste } = structure;
  const arbre = resoudre(contrat.viewStructures, view, undefined);
  return arbre ? { ...arbre, ...reste } : reste;
}

/**
 * Le nom Figma d'un variant.
 *
 * Il vit sur le variant jusqu'à la 10.3. Depuis la 11.0, il se rebâtit depuis
 * `figmaVariantLabels` — une étiquette par axe et par valeur, au lieu du même
 * nom recopié sur chaque combinaison. Le variant garde son `figmaName` dès
 * qu'une seule combinaison ne se reconstruit pas à l'identique, et la table est
 * alors absente : les deux chemins ne coexistent jamais.
 */
export function nomFigmaDuVariant(contrat, variant) {
  if (typeof variant?.figmaName === "string") return variant.figmaName;
  const etiquettes = contrat?.figmaVariantLabels;
  const axes = contrat?.structure?.variantAxes;
  if (!etiquettes || !Array.isArray(axes) || axes.length === 0) return undefined;
  const valeurs = variant?.values ?? {};
  const parts = axes.map((axe) => {
    const nomDAxe = etiquettes.axes?.[axe];
    const etiquette = etiquettes.values?.[axe]?.[valeurs[axe]];
    return nomDAxe === undefined || etiquette === undefined
      ? undefined
      : `${nomDAxe}=${etiquette}`;
  });
  return parts.some((part) => part === undefined) ? undefined : parts.join(", ");
}

/**
 * L'identifiant du calque visé par une liaison native.
 *
 * Depuis la 11.0, la fin commune à toutes les occurrences d'une définition —
 * l'id du calque dans le composant maître, que Figma écrit après le dernier
 * point-virgule — est hissée dans la définition. La recoller redonne l'id exact.
 */
export function nodeIdDeLiaison(contrat, placement) {
  const suffixe = contrat?.propertyBindingDefinitions?.[placement?.definition]?.nodeSuffix;
  return typeof suffixe === "string" ? `${placement?.nodeId}${suffixe}` : placement?.nodeId;
}

/**
 * Les messages de l'export, dans l'ordre où il les a produits.
 *
 * Le contrat publiait la même liste deux fois : en texte brut sous
 * `meta.warnings`, en objets sous `meta.diagnostics`. Le miroir est parti en
 * 11.0. Aucun filtre sur `severity` : un diagnostic est un diagnostic, et
 * filtrer ferait disparaître en silence une sévérité ajoutée demain.
 */
export function messagesDExport(contrat) {
  const diagnostics = contrat?.meta?.diagnostics;
  if (Array.isArray(diagnostics)) {
    return diagnostics
      .map((diagnostic) => diagnostic?.message)
      .filter((message) => typeof message === "string");
  }
  return Array.isArray(contrat?.meta?.warnings) ? contrat.meta.warnings : [];
}
