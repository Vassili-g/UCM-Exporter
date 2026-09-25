/**
 * Les effect styles des calques publiés : le catalogue `effectStyles` et les
 * usages de chaque vue exacte.
 *
 * Même modèle que `extractVariantTypography.ts` : le style fait autorité, ses
 * liaisons se lisent sur `style.effects[i].boundVariables` et jamais sur le
 * calque, et un chargeur injectable rend le style d'un identifiant. Les
 * porteurs viennent de `extractLayout`, qui ne les relève que sur les calques
 * publiés d'une vue exacte : une dépendance garde ses effets pour son contrat.
 */
import { normalizeName, toRef } from '@ucm-kit/core/format';
import type {
  BlurEffect,
  EffectStyleDefinition,
  EffectStyleUse,
  ShadowEffect,
} from '@ucm-kit/core/format';
import { firstVariableAlias } from '../variables';
import type { TokenResolver } from '../variables';
import {
  estUneRacineDeVariant,
  pousserLocalise,
  pousserPourLesVariants,
  pousserSansNode,
} from './localisation';

/** Un calque publié qui porte des effets, et son chemin dans la vue. */
export type EffectCarrier = { node: SceneNode; slotPath: string[] };

export type EffectStyleLoader = (id: string) => Promise<BaseStyle | null>;

/** Un effet tel que Figma le rend : ses champs varient selon son type. */
type EffetFigma = {
  type?: unknown;
  visible?: unknown;
  blendMode?: unknown;
  blurType?: unknown;
  showShadowBehindNode?: unknown;
  color?: unknown;
  offset?: { x?: unknown; y?: unknown };
  radius?: unknown;
  spread?: unknown;
  boundVariables?: Record<string, unknown>;
};

function effetsVisibles(valeur: unknown): EffetFigma[] {
  return Array.isArray(valeur)
    ? (valeur as EffetFigma[]).filter((effet) => effet && effet.visible !== false)
    : [];
}

function styleIdDe(node: SceneNode): string {
  const id = (node as unknown as { effectStyleId?: unknown }).effectStyleId;
  return typeof id === 'string' ? id : '';
}

/** Vrai si ce calque porte un effect style ou un effet visible. */
export function porteDesEffets(node: SceneNode): boolean {
  return styleIdDe(node) !== ''
    || effetsVisibles((node as unknown as { effects?: unknown }).effects).length > 0;
}

/**
 * Un champ d'effet : sa clé publiée, sa liaison Figma, le libellé du panneau,
 * ce qu'il décrit, et sa valeur lue. Une valeur nulle ou absente n'a rien à
 * tokeniser ; `color` n'a pas de valeur neutre.
 */
type ChampDEffet = {
  cle: 'color' | 'offsetX' | 'offsetY' | 'blur' | 'spread';
  liaison: 'color' | 'offsetX' | 'offsetY' | 'radius' | 'spread';
  libelle: string;
  decrit: string;
  valeur: (effet: EffetFigma) => unknown;
};

const CHAMPS_D_OMBRE: readonly ChampDEffet[] = [
  { cle: 'color', liaison: 'color', libelle: 'color', decrit: 'la couleur de cette ombre', valeur: () => undefined },
  { cle: 'offsetX', liaison: 'offsetX', libelle: 'x', decrit: 'le décalage horizontal de cette ombre', valeur: (effet) => effet.offset?.x },
  { cle: 'offsetY', liaison: 'offsetY', libelle: 'y', decrit: 'le décalage vertical de cette ombre', valeur: (effet) => effet.offset?.y },
  { cle: 'blur', liaison: 'radius', libelle: 'blur', decrit: 'le flou de cette ombre', valeur: (effet) => effet.radius },
  { cle: 'spread', liaison: 'spread', libelle: 'spread', decrit: 'l’étendue de cette ombre', valeur: (effet) => effet.spread },
];

const CHAMPS_DE_FLOU: readonly ChampDEffet[] = [
  { cle: 'blur', liaison: 'radius', libelle: 'blur', decrit: 'le rayon de ce flou', valeur: (effet) => effet.radius },
];

const OMBRES: Readonly<Record<string, { type: ShadowEffect['type']; nom: string }>> = {
  DROP_SHADOW: { type: 'drop-shadow', nom: 'Drop shadow' },
  INNER_SHADOW: { type: 'inner-shadow', nom: 'Inner shadow' },
};

const FLOUS: Readonly<Record<string, BlurEffect['type']>> = {
  LAYER_BLUR: 'layer-blur',
  BACKGROUND_BLUR: 'backdrop-blur',
};

/** Le nom qu'affiche le panneau Figma pour un effet que le contrat n'écrit pas. */
const NOMS_NON_PRIS: Readonly<Record<string, string>> = {
  NOISE: 'Noise',
  TEXTURE: 'Texture',
  GLASS: 'Glass',
  SHADER: 'Shader',
};

/** `COLOR_BURN` devient « Color burn », comme dans le menu des modes de fusion. */
function libelleDeFusion(mode: unknown): string {
  const texte = String(mode).toLowerCase().replace(/_/g, ' ');
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/**
 * Le nom de l'effet que le contrat n'écrit pas, ou `null` s'il l'écrit.
 *
 * Une ombre hors du mode « Normal » change sa couleur selon ce qu'elle
 * recouvre, et une ombre visible derrière un calque transparent peint sous
 * son fill : `box-shadow` ne rend ni l'une ni l'autre.
 */
function effetNonPris(effet: EffetFigma): string | null {
  const ombre = OMBRES[String(effet.type)];
  if (ombre) {
    if (effet.blendMode !== undefined && effet.blendMode !== 'NORMAL') {
      return `${ombre.nom} en mode de fusion « ${libelleDeFusion(effet.blendMode)} »`;
    }
    if (effet.showShadowBehindNode === true) return `${ombre.nom} visible derrière le calque`;
    return null;
  }
  if (FLOUS[String(effet.type)]) {
    return effet.blurType === 'PROGRESSIVE' ? 'Progressive blur' : null;
  }
  return NOMS_NON_PRIS[String(effet.type)] ?? String(effet.type);
}

/**
 * La liste de Figma, dans l'ordre de CSS : le premier effet peint au-dessus.
 *
 * Supposé : Figma range ses effets comme ses fills, le dernier de la liste
 * peint au-dessus. La recette le vérifie sur un style à deux ombres de
 * couleurs opposées.
 */
function ordreCss<T>(effets: readonly T[]): T[] {
  return [...effets].reverse();
}

type StyleCharge = { id: string; cle: string; definition: EffectStyleDefinition; style: EffectStyle };

/** Traduit un effet que le contrat écrit, en avertissant de chaque champ sans variable. */
async function traduire(
  effet: EffetFigma,
  style: EffectStyle,
  resolver: TokenResolver,
  warnings: string[],
): Promise<ShadowEffect | BlurEffect> {
  const ombre = OMBRES[String(effet.type)];
  const champs = ombre ? CHAMPS_D_OMBRE : CHAMPS_DE_FLOU;
  const traduit: Record<string, string> = {
    type: ombre ? ombre.type : FLOUS[String(effet.type)],
  };
  for (const { cle, liaison, libelle, decrit, valeur } of champs) {
    const alias = firstVariableAlias(effet.boundVariables?.[liaison]);
    const token = alias
      ? await resolver.resolve(alias, { nodeName: style.name, field: libelle })
      : null;
    if (token) {
      traduit[cle] = toRef(token);
      continue;
    }
    // Une variable reliée mais introuvable a déjà son message, écrit par le
    // résolveur. Une valeur nulle n'a rien à tokeniser.
    if (alias) continue;
    const lue = valeur(effet);
    if (cle !== 'color' && (lue === undefined || lue === 0)) continue;
    pousserSansNode(warnings, `Style d’effets « ${style.name} »`, {
      champ: libelle,
      manque: 'aucune variable associée.',
      impact: `Le contrat ne transmettra pas ${decrit}.`,
      action: `Dans le style d’effets, reliez ${libelle} à une variable, puis réexportez.`,
    });
  }
  return traduit as ShadowEffect | BlurEffect;
}

/** Lit un effect style une fois, et le traduit ; `null` quand rien ne s'en publie. */
async function chargerLeStyle(
  id: string,
  resolver: TokenResolver,
  warnings: string[],
  loadStyle: EffectStyleLoader,
): Promise<{ style: EffectStyle; effects: Array<ShadowEffect | BlurEffect> } | null> {
  const lu = await loadStyle(id).catch(() => null);
  if (!lu || lu.type !== 'EFFECT') return null;
  const style = lu as EffectStyle;
  const effects: Array<ShadowEffect | BlurEffect> = [];
  for (const effet of ordreCss(effetsVisibles(style.effects))) {
    const nom = effetNonPris(effet);
    if (nom) {
      pousserSansNode(warnings, `Style d’effets « ${style.name} »`, {
        manque: `l’effet ${nom} n’est pas pris en charge.`,
        impact: `Le contrat transmettra ce style sans l’effet ${nom}.`,
        action: 'Si cet effet est nécessaire, signalez cette limite au mainteneur du plugin. '
          + 'Sinon, retirez-le du style, puis réexportez.',
      });
      continue;
    }
    effects.push(await traduire(effet, style, resolver, warnings));
  }
  return { style, effects };
}

/** JSON aux clés triées : deux listes d'effets égales donnent la même chaîne. */
function signature(valeur: unknown): string {
  return JSON.stringify(valeur, (_cle, contenu) => (
    contenu && typeof contenu === 'object' && !Array.isArray(contenu)
      ? Object.fromEntries(Object.entries(contenu).sort(([a], [b]) => a.localeCompare(b)))
      : contenu
  ));
}

/** Avertit d'un calque qui porte des effets sans effect style. */
function signalerSansStyle(node: SceneNode, warnings: string[]): void {
  if (estUneRacineDeVariant(warnings, node)) {
    pousserPourLesVariants(warnings, node, {
      titre: 'effect : aucun style d’effets appliqué.',
      impact: 'Le contrat ne transmettra pas les ombres ou les flous des variants concernés.',
      action: 'Appliquez un style d’effets à chaque variant concerné, puis réexportez.',
    });
    return;
  }
  pousserLocalise(warnings, 'Layer', node, {
    champ: 'effect',
    manque: 'aucun style d’effets appliqué.',
    impact: 'Le contrat ne transmettra pas l’ombre ou le flou de ce calque.',
    action: 'Appliquez à ce calque un style d’effets qui correspond au rendu souhaité, puis '
      + 'réexportez.',
  });
}

/**
 * Le catalogue des effect styles et les usages de chaque vue exacte.
 *
 * Un style se charge une fois par identifiant ; ses avertissements partent
 * donc une fois. L'écart entre les effets d'un calque et ceux de son style se
 * lit sur chaque calque : Figma garde le style appliqué, marqué modifié. Deux
 * styles dont les noms donnent la même clé se départagent par un suffixe
 * numéroté, `figmaName` gardant le nom d'origine.
 */
export async function extractEffectStyles(
  carriersByComponent: ReadonlyMap<ComponentNode, readonly EffectCarrier[]>,
  resolver: TokenResolver,
  warnings: string[],
  loadStyle: EffectStyleLoader = (id) => figma.getStyleByIdAsync(id),
): Promise<{
  effectStyles: Record<string, EffectStyleDefinition>;
  usesByComponent: Map<ComponentNode, EffectStyleUse[]>;
}> {
  const cache = new Map<string, Promise<StyleCharge | null>>();
  const clesPrises = new Set<string>();
  const effectStyles = new Map<string, EffectStyleDefinition>();
  const usesByComponent = new Map<ComponentNode, EffectStyleUse[]>();

  const charger = (id: string): Promise<StyleCharge | null> => {
    let enCours = cache.get(id);
    if (!enCours) {
      enCours = chargerLeStyle(id, resolver, warnings, loadStyle).then((charge) => {
        if (!charge) return null;
        const base = normalizeName(charge.style.name) || 'effect';
        let cle = base;
        for (let rang = 2; clesPrises.has(cle); rang += 1) cle = `${base}-${rang}`;
        clesPrises.add(cle);
        return {
          id,
          cle,
          definition: { figmaName: charge.style.name, effects: charge.effects },
          style: charge.style,
        };
      });
      cache.set(id, enCours);
    }
    return enCours;
  };

  for (const [component, carriers] of carriersByComponent) {
    const uses: EffectStyleUse[] = [];
    for (const { node, slotPath } of carriers) {
      const id = styleIdDe(node);
      if (!id) {
        if (effetsVisibles((node as unknown as { effects?: unknown }).effects).length > 0) {
          signalerSansStyle(node, warnings);
        }
        continue;
      }
      const charge = await charger(id);
      if (!charge) {
        pousserLocalise(warnings, 'Layer', node, {
          manque: 'le style d’effets appliqué est introuvable.',
          impact: 'Le contrat ne transmettra pas l’ombre ou le flou de ce calque.',
          action: 'Appliquez de nouveau un style d’effets accessible dans Figma, puis réexportez.',
        });
        continue;
      }
      const effetsDuCalque = (node as unknown as { effects?: unknown }).effects;
      if (signature(effetsDuCalque) !== signature(charge.style.effects)) {
        pousserLocalise(warnings, 'Layer', node, {
          manque: `ses effets diffèrent du style « ${charge.style.name} ».`,
          impact: 'Le contrat transmettra les réglages du style, sans les modifications propres '
            + 'à ce calque.',
          action: 'Réappliquez le style pour retrouver ses réglages, ou créez et appliquez un '
            + 'style correspondant au rendu souhaité, puis réexportez.',
        });
      }
      if (charge.definition.effects.length === 0) continue;
      effectStyles.set(charge.cle, charge.definition);
      uses.push({ slotPath: [...slotPath], style: charge.cle });
    }
    usesByComponent.set(component, uses);
  }

  return { effectStyles: Object.fromEntries(effectStyles), usesByComponent };
}
