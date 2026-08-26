/**
 * Surface publique des component properties, avec la provenance de chaque source.
 *
 * Un contrat fusionne deux surfaces au plus : celle du composant exporté, puis
 * celle de l'unique wrapper de dimensions élu. Cette décision doit être la même
 * quand le composant est exporté et quand une instance de ce composant est
 * échantillonnée dans un parent.
 */
import {
  definePropOn,
  extractContractPropertyModel,
} from './parsers';
import type { ContractPropertyModel } from './parsers';
import type { ContractProp } from './types';

/** Modèle direct, éventuel complément du wrapper et projection fusionnée. */
export type ContractPropertySurface = {
  direct: ContractPropertyModel;
  wrapper?: {
    model: ContractPropertyModel;
    /** Seules ces clés ont réellement rejoint `props`. */
    acceptedKeys: ReadonlySet<string>;
  };
  props: Record<string, ContractProp>;
  publicPropertyKeyByFigmaName: ReadonlyMap<string, string>;
};

/**
 * Ajoute les props du wrapper sans reprendre une clé déjà possédée par le set.
 *
 * Exportée pour les tests historiques de la règle de priorité. La construction
 * complète passe par `buildContractPropertySurface`, qui conserve aussi la
 * provenance nécessaire aux échantillons.
 */
export function mergeWrapperProps(
  props: Record<string, ContractProp>,
  wrapperProps: Record<string, ContractProp>,
  warnings: string[],
): Set<string> {
  const accepted = new Set<string>();
  for (const [key, prop] of Object.entries(wrapperProps)) {
    if (Object.prototype.hasOwnProperty.call(props, key)) {
      warnings.push(
        `Component property « ${key} » : le composant imbriqué qui porte les dimensions et `
          + `le component set sélectionné l’exposent tous les deux. Seule celle du component `
          + `set sélectionné est exportée. Renommez l’une des deux.`,
      );
      continue;
    }
    definePropOn(props, key, prop);
    accepted.add(key);
  }
  return accepted;
}

/**
 * Construit l'unique surface publique à partir des définitions réellement élues.
 *
 * Le modèle direct garde toujours la priorité. Les correspondances techniques
 * du wrapper ne sont publiées que pour les clés qui ont effectivement rejoint
 * `props` : une collision ne peut donc pas réapparaître dans `samples.args`.
 */
export function buildContractPropertySurface(
  directDefinitions: ComponentPropertyDefinitions,
  wrapperDefinitions?: ComponentPropertyDefinitions,
  warnings: string[] = [],
  directModel?: ContractPropertyModel,
): ContractPropertySurface {
  // L'orchestrateur construit ce modèle avant de connaître le wrapper, car la
  // matrice de variants en dépend. Le réutiliser évite une seconde extraction
  // et, surtout, le doublonnage de ses diagnostics.
  const direct = directModel ?? extractContractPropertyModel(directDefinitions, warnings);
  const props = direct.props;
  const publicPropertyKeyByFigmaName = new Map(direct.publicPropertyKeyByFigmaName);

  if (!wrapperDefinitions) {
    return { direct, props, publicPropertyKeyByFigmaName };
  }

  const wrapperModel = extractContractPropertyModel(wrapperDefinitions, warnings);
  const acceptedKeys = mergeWrapperProps(props, wrapperModel.props, warnings);
  for (const [figmaName, publicKey] of wrapperModel.publicPropertyKeyByFigmaName) {
    if (acceptedKeys.has(publicKey)) publicPropertyKeyByFigmaName.set(figmaName, publicKey);
  }

  return {
    direct,
    wrapper: { model: wrapperModel, acceptedKeys },
    props,
    publicPropertyKeyByFigmaName,
  };
}
