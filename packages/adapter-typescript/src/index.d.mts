import type { AdaptateurDImplementation } from "@ucm-kit/core/lecteurs";

export const adaptateurTypeScript: AdaptateurDImplementation;
export function nomInterfaceAttendue(fichierComposant: string): string;
export function lireApiPublique(
  fichiers: readonly string[],
  racine: string,
): Map<string, unknown>;
export function ecartsDeParite(
  contrat: unknown,
  releve: unknown,
  nomInterface: string,
  options?: { presente?: boolean; chemin?: string },
): {
  implementationAbsente: boolean;
  implementationNonLue: string | null;
  interfaceAbsente: string | null;
  fonctionAbsente: string | null;
  manquantes: string[];
  typesIncorrects: Array<{ prop: string; attendu: string; recu: string }>;
  valeursNonImplementees: Array<{ prop: string; valeurs: string[] }>;
  booleensNonUtilises: string[];
  enumsSansEffet: Array<{ prop: string; valeurs: string[] }>;
  compositionsIncorrectes: Array<{ component: string; attendu: number; rendu: number }>;
};
export function typesDuContrat(contrat: unknown): null | {
  composant: string;
  nombreUnions: number;
  contenu: string;
};
export function genererTypes(
  racine?: string,
  options?: { dossierSortie?: string },
): {
  generes: Array<{ composant: string; nombreUnions: number; contenu: string; chemin: string }>;
  omis: Array<{ chemin: string; raison: string }>;
  dossierSortie: string;
};
export function rendreGeneration(resultat: ReturnType<typeof genererTypes>): string;
