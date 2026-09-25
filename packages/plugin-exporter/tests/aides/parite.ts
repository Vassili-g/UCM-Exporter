/**
 * Le banc de parité : un export dans la portée d'analyse doit produire le même
 * contrat qu'un export qui ne garde rien.
 *
 * Il se pose sur le chemin d'appel de `figmaFaux.handleExportComponent`, comme
 * les lois : chaque scénario qui passe par là y est soumis, y compris ceux
 * qu'on ajoutera.
 */
import assert from 'node:assert/strict';
import exporterLeComposant from '../../src/contract/exportComponent';
import { desactiverLaPorteePourLeBanc } from '../../src/contract/porteeDAnalyse';

/** Le contrat sérialisé, date d'export remplacée par une valeur fixe. */
export function sansDate(content: string): string {
  return content.replace(/("exportedAt"\s*:\s*)"[^"]*"/, '$1"-"');
}

/**
 * Réexporte la sélection courante sans mémoire, et compare au contrat produit
 * dans la portée.
 */
export async function verifierLaParite(avecPortee: string, contexte: string): Promise<void> {
  desactiverLaPorteePourLeBanc(true);
  let sansPortee: string;
  try {
    sansPortee = (await exporterLeComposant()).content;
  } finally {
    desactiverLaPorteePourLeBanc(false);
  }
  assert.equal(
    sansDate(avecPortee),
    sansDate(sansPortee),
    `${contexte} : le contrat produit dans la portée d'analyse diffère de celui produit sans mémoire`,
  );
}
