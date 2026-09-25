/**
 * Les caractéristiques qu'un contrat porte, et le champ du schéma qui relève
 * chacune.
 *
 * Une caractéristique décide quelles aides à l'implémentation une commande
 * imprime pour un contrat : un composant sans grille ne reçoit pas l'aide des
 * grilles. La lecture porte sur les champs du contrat et de ses catalogues,
 * jamais sur le nom du composant.
 *
 * `CHAMPS` et `SANS_AIDE` couvrent ensemble chaque couple (définition,
 * propriété) du schéma publié, `*` notant une clé de dictionnaire ; un test le
 * vérifie sur le schéma, si bien qu'un champ ajouté sans aide fait échouer la
 * suite.
 */
import { collecterReferences, sansEchantillon } from "./references-token.mjs";
import { axesDuContrat } from "./modes-tokens.mjs";

/** Les caractéristiques, dans l'ordre où une aide les imprime, et ce qui relève chacune. */
export const CARACTERISTIQUES = [
  { id: "toujours", relevee: "tout contrat" },
  { id: "reference-token", relevee: "le contrat cite une référence de token" },
  { id: "liaison-native", relevee: "propertyBindingDefinitions" },
  { id: "disposition", relevee: "un conteneur flex-row ou flex-column" },
  { id: "grille", relevee: "un conteneur grid" },
  { id: "dimensions", relevee: "sizing, size, bounds, padding, radius ou structuralSize" },
  { id: "dimensions-par-taille", relevee: "structure.sizes" },
  { id: "position-absolue", relevee: "un slot position absolute" },
  { id: "rotation", relevee: "une rotation" },
  { id: "opacite", relevee: "une opacity" },
  { id: "peinture", relevee: "une clé de variants[].tokens" },
  { id: "contour-border", relevee: "une clé de variants[].strokes dont le rôle est border" },
  { id: "contour-ring", relevee: "une clé de variants[].strokes dont le rôle est ring" },
  { id: "ombre", relevee: "un usage d'effect style" },
  { id: "typographie", relevee: "un usage de typographie" },
  { id: "troncature", relevee: "un lineClamp" },
  { id: "icone", relevee: "une entrée de icons" },
  { id: "etats", relevee: "un état autre que default" },
  { id: "focus", relevee: "un état dont le selector contient :focus" },
  { id: "composition", relevee: "composes" },
  { id: "echantillon", relevee: "samples ou variants[].sample" },
  { id: "modes", relevee: "un axe de modes touche le contrat" },
  { id: "couverture-partielle", relevee: "meta.coverage.portable vaut partial" },
];

const CONTOURS = ["contour-border", "contour-ring"];
const RENDU = ["peinture", ...CONTOURS];

/**
 * La caractéristique que chaque couple du schéma relève. Une valeur est un
 * identifiant ; une liste nomme les caractéristiques entre lesquelles le rôle
 * de la clé tranche ; `parValeur` associe chaque valeur d'une énumération à la
 * sienne.
 */
export const CHAMPS = {
  "BlurEffect.blur": "ombre",
  "BlurEffect.type": "ombre",
  "BooleanProp.default": "toujours",
  "BooleanProp.description": "toujours",
  "BooleanProp.type": "toujours",
  "ChildStructure.alignItems": "disposition",
  "ChildStructure.alignSelf": "disposition",
  "ChildStructure.bounds": "dimensions",
  "ChildStructure.children": "toujours",
  "ChildStructure.columnGap": "grille",
  "ChildStructure.columnSizes": "grille",
  "ChildStructure.columnSpan": "grille",
  "ChildStructure.columnStart": "grille",
  "ChildStructure.columns": "grille",
  "ChildStructure.composes": "composition",
  "ChildStructure.constraints": "position-absolue",
  "ChildStructure.flexGrow": "disposition",
  "ChildStructure.gap": "disposition",
  "ChildStructure.inset": "position-absolue",
  "ChildStructure.justifyContent": "disposition",
  "ChildStructure.justifySelf": "grille",
  "ChildStructure.layout": { parValeur: { "flex-row": "disposition", "flex-column": "disposition", grid: "grille" } },
  "ChildStructure.opacity": "opacite",
  "ChildStructure.optional": "toujours",
  "ChildStructure.padding": "dimensions",
  "ChildStructure.position": { parValeur: { absolute: "position-absolue" } },
  "ChildStructure.radius": "dimensions",
  "ChildStructure.rotation": "rotation",
  "ChildStructure.rowGap": "disposition",
  "ChildStructure.rowSizes": "grille",
  "ChildStructure.rowSpan": "grille",
  "ChildStructure.rowStart": "grille",
  "ChildStructure.rows": "grille",
  "ChildStructure.size": "dimensions",
  "ChildStructure.slot": "toujours",
  "ChildStructure.structuralSize": "dimensions",
  "ChildStructure.visibilityProp": "toujours",
  "ChildStructure.visibilityTargets": "toujours",
  "ChildStructure.wrap": "disposition",
  "ColorKeyRoles.*": RENDU,
  "ColorKeyRoles.fills": "peinture",
  "ColorKeyRoles.strokes": CONTOURS,
  "ComposedDependency.component": "composition",
  "ComposedDependency.figmaLayer": "composition",
  "ComposedDependency.visibilityProp": "composition",
  "ContainerSizing.height": "dimensions",
  "ContainerSizing.width": "dimensions",
  "Contract.*": "toujours",
  "Contract.composes": "composition",
  "Contract.effectStyles": "ombre",
  "Contract.icons": "icone",
  "Contract.intent": "toujours",
  "Contract.meta": "toujours",
  "Contract.name": "toujours",
  "Contract.propertyBindingDefinitions": "liaison-native",
  "Contract.props": "toujours",
  "Contract.rendering": RENDU,
  "Contract.samples": "echantillon",
  "Contract.stateModel": "etats",
  "Contract.structure": "toujours",
  "Contract.textStyles": "typographie",
  "Contract.variantViews": "toujours",
  "Contract.variants": "toujours",
  "Contract.viewComposes": "composition",
  "Contract.viewEffects": "ombre",
  "Contract.viewIcons": "icone",
  "Contract.viewPaintPlacements": RENDU,
  "Contract.viewStructures": "toujours",
  "Contract.viewTypographies": "typographie",
  "ContractCoverage.portable": { parValeur: { complete: "toujours", partial: "couverture-partielle" } },
  "ContractDiagnostic.code": "toujours",
  "ContractDiagnostic.contractPath": "toujours",
  "ContractDiagnostic.message": "toujours",
  "ContractDiagnostic.property": "toujours",
  "ContractDiagnostic.severity": "toujours",
  "ContractDiagnostic.variantName": "toujours",
  "ContractMeta.contractVersion": "toujours",
  "ContractMeta.coverage": "toujours",
  "ContractMeta.diagnostics": "toujours",
  "ContractReferenceStructure.*": "dimensions-par-taille",
  "ContractReferenceStructure.sizes": "dimensions-par-taille",
  "ContractReferenceStructure.variantAxes": "toujours",
  "ContractReferenceStructure.view": "toujours",
  "ContractSample.*": "echantillon",
  "ContractSample.args": "echantillon",
  "ContractSample.composes": "echantillon",
  "ContractSample.text": "echantillon",
  "ContractVariant.*": "toujours",
  "ContractVariant.bindings": "liaison-native",
  "ContractVariant.sample": "echantillon",
  "ContractVariant.strokes": CONTOURS,
  "ContractVariant.tokens": "peinture",
  "ContractVariant.values": "toujours",
  "ContractVariant.view": "toujours",
  "ContractVariantView.composes": "composition",
  "ContractVariantView.effects": "ombre",
  "ContractVariantView.icons": "icone",
  "ContractVariantView.paintPlacements": RENDU,
  "ContractVariantView.structure": "toujours",
  "ContractVariantView.typography": "typographie",
  "EffectStyleDefinition.effects": "ombre",
  "EffectStyleUse.slotPath": "ombre",
  "EffectStyleUse.style": "ombre",
  "EnumProp.*": "toujours",
  "EnumProp.default": "toujours",
  "EnumProp.descriptions": "toujours",
  "EnumProp.type": "toujours",
  "EnumProp.values": "toujours",
  "GridStructuralSize.height": "grille",
  "GridStructuralSize.width": "grille",
  "IconDefinition.*": "icone",
  "IconDefinition.figmaName": "icone",
  "IconDefinition.policy": "icone",
  "IconDefinition.runtimeProp": "icone",
  "IconDefinition.size": "icone",
  "IconDefinition.slot": "icone",
  "IconDefinition.variants": "icone",
  "IconDefinition.visibilityProp": "icone",
  "IconProp.default": "icone",
  "IconProp.policy": "icone",
  "IconProp.type": "icone",
  "IconProp.visibilityProp": "icone",
  "InstanceSwapProp.default": "toujours",
  "InstanceSwapProp.preferredValues": "toujours",
  "InstanceSwapProp.type": "toujours",
  "Intent.do": "toujours",
  "Intent.dont": "toujours",
  "Intent.pairs": "toujours",
  "Intent.usage": "toujours",
  "LayoutConstraints.horizontal": "position-absolue",
  "LayoutConstraints.vertical": "position-absolue",
  "LayoutInset.bottom": "position-absolue",
  "LayoutInset.left": "position-absolue",
  "LayoutInset.right": "position-absolue",
  "LayoutInset.top": "position-absolue",
  "Padding.x": "dimensions",
  "Padding.y": "dimensions",
  "PreferredComponentValue.key": "toujours",
  "PreferredComponentValue.type": "toujours",
  "PropertyBindingDefinition.figmaPath": "liaison-native",
  "PropertyBindingDefinition.nodeSuffix": "liaison-native",
  "PropertyBindingDefinition.prop": "liaison-native",
  "PropertyBindingDefinition.target": "liaison-native",
  "RenderingRole.cssProperties": RENDU,
  "RenderingRole.fallback": RENDU,
  "RenderingRole.kind": RENDU,
  "RenderingSemantics.*": RENDU,
  "RenderingSemantics.keyRoles": RENDU,
  "RenderingSemantics.roles": RENDU,
  "SampleInstance.*": "echantillon",
  "SampleInstance.args": "echantillon",
  "SampleInstance.component": "echantillon",
  "SampleInstance.composes": "echantillon",
  "SampleInstance.figmaLayer": "echantillon",
  "SampleInstance.overrides": "echantillon",
  "SampleInstance.slotPath": "echantillon",
  "SampleInstance.swaps": "echantillon",
  "SampleOverride.figmaPath": "echantillon",
  "SampleOverride.text": "echantillon",
  "SampleOverride.visible": "echantillon",
  "SampleSwap.component": "echantillon",
  "SampleSwap.masterPath": "echantillon",
  "SampleText.figmaLayer": "echantillon",
  "SampleText.slotPath": "echantillon",
  "SampleText.value": "echantillon",
  "ShadowEffect.blur": "ombre",
  "ShadowEffect.color": "ombre",
  "ShadowEffect.offsetX": "ombre",
  "ShadowEffect.offsetY": "ombre",
  "ShadowEffect.spread": "ombre",
  "ShadowEffect.type": "ombre",
  "SizeBounds.maxHeight": "dimensions",
  "SizeBounds.maxWidth": "dimensions",
  "SizeBounds.minHeight": "dimensions",
  "SizeBounds.minWidth": "dimensions",
  "SizeDimensions.columnGap": "dimensions-par-taille",
  "SizeDimensions.gap": "dimensions-par-taille",
  "SizeDimensions.padding": "dimensions-par-taille",
  "SizeDimensions.radius": "dimensions-par-taille",
  "SizeDimensions.rowGap": "dimensions-par-taille",
  "SlotProp.allowPreferredValuesOnly": "toujours",
  "SlotProp.default": "toujours",
  "SlotProp.description": "toujours",
  "SlotProp.displayEmptyByDefault": "toujours",
  "SlotProp.maxChildren": "toujours",
  "SlotProp.minChildren": "toujours",
  "SlotProp.preferredValues": "toujours",
  "SlotProp.settings": "toujours",
  "SlotProp.stretchChildOnInsert": "toujours",
  "SlotProp.type": "toujours",
  "SlotSize.height": "dimensions",
  "SlotSize.width": "dimensions",
  "SlotStrokes.*": CONTOURS,
  "SlotTokens.*": "peinture",
  "StateDescriptor.description": "etats",
  "StateDescriptor.selector": ["etats", "focus"],
  "StateModel.*": "etats",
  "StateModel.axis": "etats",
  "StateModel.precedence": "etats",
  "StateModel.states": "etats",
  "StringProp.default": "toujours",
  "StringProp.type": "toujours",
  "StrokeTokens.align": CONTOURS,
  "StrokeTokens.color": CONTOURS,
  "StrokeTokens.width": CONTOURS,
  "TextStyleDefinition.literals": "typographie",
  "TextStyleDefinition.tokens": "typographie",
  "TextStyleLiterals.fontStyle": "typographie",
  "TextStyleLiterals.fontVariantCaps": "typographie",
  "TextStyleLiterals.textBox": "typographie",
  "TextStyleLiterals.textDecorationLine": "typographie",
  "TextStyleLiterals.textTransform": "typographie",
  "TextStyleLiterals.textWrapStyle": "typographie",
  "TextStyleUse.alignContent": "typographie",
  "TextStyleUse.lineClamp": "troncature",
  "TextStyleUse.slotPath": "typographie",
  "TextStyleUse.style": "typographie",
  "TextStyleUse.textAlign": "typographie",
  "TextStyleUse.textOverflow": "troncature",
  "TypographyTokens.fontFamily": "typographie",
  "TypographyTokens.fontSize": "typographie",
  "TypographyTokens.fontWeight": "typographie",
  "TypographyTokens.letterSpacing": "typographie",
  "TypographyTokens.lineHeight": "typographie",
  "TypographyTokens.paragraphIndent": "typographie",
  "TypographyTokens.paragraphSpacing": "typographie",
  "VariantIconPlacement.figmaName": "icone",
  "VariantIconPlacement.slotPath": "icone",
  "VariantPaintPlacements.*": RENDU,
  "VariantPaintPlacements.fills": "peinture",
  "VariantPaintPlacements.strokes": CONTOURS,
  "VariantPropertyBinding.definition": "liaison-native",
  "VariantStructure.alignItems": "disposition",
  "VariantStructure.bounds": "dimensions",
  "VariantStructure.children": "toujours",
  "VariantStructure.columnGap": "grille",
  "VariantStructure.columnSizes": "grille",
  "VariantStructure.columns": "grille",
  "VariantStructure.gap": "disposition",
  "VariantStructure.justifyContent": "disposition",
  "VariantStructure.layout": { parValeur: { "flex-row": "disposition", "flex-column": "disposition", grid: "grille" } },
  "VariantStructure.opacity": "opacite",
  "VariantStructure.padding": "dimensions",
  "VariantStructure.radius": "dimensions",
  "VariantStructure.rotation": "rotation",
  "VariantStructure.rowGap": "disposition",
  "VariantStructure.rowSizes": "grille",
  "VariantStructure.rows": "grille",
  "VariantStructure.sizing": "dimensions",
  "VariantStructure.wrap": "disposition",
  "VisibilityTarget.figmaPath": "toujours",
  "VisibilityTarget.visibilityProp": "toujours",
};

const IDENTITE_FIGMA = "identité Figma : elle trace la maquette et ne décrit aucun rendu";

/** Les couples du schéma qu'aucune aide ne couvre, et pourquoi. */
export const SANS_AIDE = {
  "BooleanProp.figmaName": IDENTITE_FIGMA,
  "ChildStructure.figmaLayer": IDENTITE_FIGMA,
  "Contract.figmaVariantLabels": IDENTITE_FIGMA,
  "ContractDiagnostic.figma": IDENTITE_FIGMA,
  "ContractDiagnostic.nodeId": IDENTITE_FIGMA,
  "ContractDiagnostic.nodeName": IDENTITE_FIGMA,
  "ContractMeta.componentKey": IDENTITE_FIGMA,
  "ContractMeta.exportedAt": "date de l'export, qui ne change aucun rendu",
  "ContractMeta.figma": IDENTITE_FIGMA,
  "ContractMeta.fileName": IDENTITE_FIGMA,
  "ContractMeta.nodeId": IDENTITE_FIGMA,
  "ContractMeta.url": IDENTITE_FIGMA,
  "ContractVariant.figmaName": IDENTITE_FIGMA,
  "ContractVariant.nodeId": IDENTITE_FIGMA,
  "EffectStyleDefinition.figmaName": IDENTITE_FIGMA,
  "EnumProp.figmaName": IDENTITE_FIGMA,
  "FigmaVariantLabels.*": IDENTITE_FIGMA,
  "FigmaVariantLabels.axes": IDENTITE_FIGMA,
  "FigmaVariantLabels.values": IDENTITE_FIGMA,
  "IconProp.figmaName": IDENTITE_FIGMA,
  "InstanceSwapProp.figmaName": IDENTITE_FIGMA,
  "PropertyBindingDefinition.figmaPropName": IDENTITE_FIGMA,
  "SlotProp.figmaName": IDENTITE_FIGMA,
  "StringProp.figmaName": IDENTITE_FIGMA,
  "TextStyleDefinition.figmaName": IDENTITE_FIGMA,
  "VariantPropertyBinding.nodeId": IDENTITE_FIGMA,
};

const estObjet = (valeur) => Boolean(valeur) && typeof valeur === "object" && !Array.isArray(valeur);
const nonVide = (valeur) => (Array.isArray(valeur) ? valeur.length > 0 : estObjet(valeur) && Object.keys(valeur).length > 0);

/** Chaque noeud de structure publié, catalogue et projection de référence compris. */
function noeudsDeStructure(contrat) {
  const noeuds = [];
  const visiter = (noeud) => {
    if (!estObjet(noeud)) return;
    noeuds.push(noeud);
    for (const enfant of Array.isArray(noeud.children) ? noeud.children : []) visiter(enfant);
  };
  for (const structure of Object.values(estObjet(contrat.viewStructures) ? contrat.viewStructures : {})) {
    visiter(structure);
  }
  return noeuds;
}

/** Le rôle d'une clé de contour : son entrée de `keyRoles.strokes`, sinon son propre nom. */
function roleDeContour(contrat, cle) {
  const keyRoles = contrat.rendering?.keyRoles?.strokes;
  return estObjet(keyRoles) && Object.hasOwn(keyRoles, cle) ? keyRoles[cle] : cle;
}

/**
 * Les caractéristiques d'un contrat, dans l'ordre de `CARACTERISTIQUES`.
 *
 * `contratsParNom` et `cones` servent à la seule caractéristique `modes`,
 * relevée par `axesDuContrat` ; sans `cones`, elle n'est jamais relevée. Ne
 * lève pas sur un contrat malformé : ce qu'il ne porte pas n'est pas relevé.
 */
export function caracteristiquesDuContrat(contrat, contratsParNom = new Map(), cones) {
  const valeur = estObjet(contrat) ? contrat : {};
  const relevees = new Set(["toujours"]);
  const relever = (id, condition) => { if (condition) relevees.add(id); };

  const noeuds = noeudsDeStructure(valeur);
  const variants = Array.isArray(valeur.variants) ? valeur.variants.filter(estObjet) : [];
  const usages = Object.values(estObjet(valeur.viewTypographies) ? valeur.viewTypographies : {})
    .flatMap((liste) => (Array.isArray(liste) ? liste.filter(estObjet) : []));
  const usagesDEffets = Object.values(estObjet(valeur.viewEffects) ? valeur.viewEffects : {})
    .flatMap((liste) => (Array.isArray(liste) ? liste.filter(estObjet) : []));
  const etats = estObjet(valeur.stateModel?.states) ? valeur.stateModel.states : {};

  relever("reference-token", collecterReferences(sansEchantillon(valeur)).size > 0);
  relever("liaison-native", nonVide(valeur.propertyBindingDefinitions));
  relever("disposition", noeuds.some(({ layout }) => layout === "flex-row" || layout === "flex-column"));
  relever("grille", noeuds.some(({ layout }) => layout === "grid"));
  relever("dimensions", noeuds.some((noeud) => (
    ["sizing", "size", "bounds", "padding", "radius", "structuralSize"].some((champ) => noeud[champ] !== undefined)
  )));
  relever("dimensions-par-taille", nonVide(valeur.structure?.sizes));
  relever("position-absolue", noeuds.some(({ position }) => position === "absolute"));
  relever("rotation", noeuds.some(({ rotation }) => rotation !== undefined));
  relever("opacite", noeuds.some(({ opacity }) => opacity !== undefined));
  relever("peinture", variants.some(({ tokens }) => nonVide(tokens)));
  for (const { strokes } of variants) {
    for (const cle of Object.keys(estObjet(strokes) ? strokes : {})) {
      const role = roleDeContour(valeur, cle);
      relever("contour-border", role === "border");
      relever("contour-ring", role === "ring");
    }
  }
  relever("ombre", usagesDEffets.length > 0);
  relever("typographie", usages.length > 0);
  relever("troncature", usages.some(({ lineClamp }) => lineClamp !== undefined));
  relever("icone", nonVide(valeur.icons));
  relever("etats", Object.keys(etats).some((etat) => etat !== "default"));
  relever("focus", Object.values(etats).some((etat) => (
    typeof etat?.selector === "string" && etat.selector.includes(":focus")
  )));
  relever("composition", nonVide(valeur.composes));
  relever("echantillon", nonVide(valeur.samples) || variants.some(({ sample }) => sample !== undefined));
  relever("modes", cones !== undefined && axesDuContrat(valeur, contratsParNom, cones).axes.length > 0);
  relever("couverture-partielle", valeur.meta?.coverage?.portable === "partial");

  return CARACTERISTIQUES.map(({ id }) => id).filter((id) => relevees.has(id));
}
