/**
 * Un export de tokens sans aucun constat donne une feuille CSS : `ucm tokens css`
 * n'en refuse aucun. Les fichiers simulés sont tirés au hasard, graine fixe, avec
 * des noms choisis pour se rejoindre une fois normalisés.
 *
 * La commande se charge depuis `packages/cli` par un import dynamique : la
 * question porte sur le code que le repository consommateur exécute, et le
 * plugin n'a aucune dépendance vers la CLI.
 *
 * Une exception, écrite dans la spécification : un cycle d'alias qu'une
 * surcharge d'extension ferme. Le plugin ne le détecte pas, et un fichier
 * Enterprise réel dira si Figma l'accepte.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { axesDeTokens, contextesDesAxes } from '@ucm-kit/core/lecteurs';

import { alias, collection, exporterLeFichier, extension, rgba, variable } from './fichierDeVariables';

type FeuilleDesTokens = (document: unknown, options: { axes: unknown[]; attributs: Map<string, string> }) => { refus: string[] };
type AttributsDesAxes = (axes: unknown[]) => { attributs: Map<string, string>; erreurs: string[] };

const COMMANDE = pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../cli/src/tokens-css.mjs')).href;

const NOMS_DE_COLLECTION = ['Color', 'color', 'Color Extensions', 'Color/Brand', 'Theme', 'Marque_B', 'Marque B', 'UCM/X', 'Espace'];
const MODES = [['Light', 'Dark'], ['Light', 'Dark', 'HC'], ['Mode 1'], ['A', 'B'], ['Base', 'Autre']];
const NOMS_D_EXTENSION = ['Marque B', 'marque-b', 'Sous marque', 'Brand/X', 'Client_1', 'Client 1', 'Base', 'e'];
const NOMS_DE_VARIABLE = ['surface', 'text', 'primary/500', 'Surface', 'x_y', 'x-y', 'extensions/a', 'fond'];

function tirage(graine: number) {
  let etat = graine;
  const suivant = () => {
    etat = (etat * 1103515245 + 12345) % 2147483648;
    return etat / 2147483648;
  };
  return { suivant, choisir: <T>(liste: T[]): T => liste[Math.floor(suivant() * liste.length)] };
}

/** Un fichier de variables : collections, extensions sur deux générations, alias du même type. */
function fichierAleatoire({ suivant, choisir }: ReturnType<typeof tirage>) {
  const collections: VariableCollection[] = [];
  const variables: Variable[] = [];
  const valeurDe = (type: 'FLOAT' | 'COLOR', exclue?: string): VariableValue => {
    const cibles = variables.filter((autre) => autre.resolvedType === type && autre.id !== exclue);
    if (cibles.length > 0 && suivant() < 0.35) return alias(choisir(cibles).id);
    return type === 'FLOAT' ? Math.floor(suivant() * 100) : rgba(suivant(), suivant(), suivant(), 1);
  };

  for (let rang = 0, nombre = 1 + Math.floor(suivant() * 3); rang < nombre; rang += 1) {
    const modes = choisir(MODES);
    const racine = collection(`c${rang}`, `${choisir(NOMS_DE_COLLECTION)}${rang === 0 ? '' : ` ${choisir(['', rang])}`}`.trim(), modes, choisir(modes));
    collections.push(racine);
    const locales: Variable[] = [];
    for (let position = 0, total = 1 + Math.floor(suivant() * 4); position < total; position += 1) {
      const type = suivant() < 0.8 ? 'FLOAT' : 'COLOR';
      const creee = variable(racine, `c${rang}v${position}`, choisir(NOMS_DE_VARIABLE), type, modes.map(() => valeurDe(type)));
      (racine as unknown as { variableIds: string[] }).variableIds.push(creee.id);
      locales.push(creee);
      variables.push(creee);
    }
    if (suivant() < 0.5) continue;
    const parentes: VariableCollection[] = [racine];
    for (let position = 0, total = 1 + Math.floor(suivant() * 3); position < total; position += 1) {
      const surcharges: Record<string, Record<string, VariableValue>> = {};
      for (const cible of locales.filter(() => suivant() < 0.5)) {
        const type = cible.resolvedType as 'FLOAT' | 'COLOR';
        surcharges[cible.id] = Object.fromEntries(modes.flatMap((_, mode) => (suivant() < 0.5 ? [[mode, valeurDe(type, cible.id)]] : [])));
      }
      const etendue = extension(`c${rang}e${position}`, choisir(NOMS_D_EXTENSION), choisir(parentes), racine, surcharges);
      collections.push(etendue);
      parentes.push(etendue);
    }
  }
  return { collections, variables, textStyles: [] };
}

test('un export de tokens sans constat donne une feuille CSS, sur 600 fichiers tirés au hasard', async () => {
  const { attributsDesAxes, feuilleDesTokens } = await import(COMMANDE) as {
    attributsDesAxes: AttributsDesAxes;
    feuilleDesTokens: FeuilleDesTokens;
  };
  const hasard = tirage(7);
  let silencieux = 0;
  const refuses: string[] = [];
  for (let tour = 0; tour < 600; tour += 1) {
    const fichier = fichierAleatoire(hasard);
    const exporte = await exporterLeFichier({ fichier });
    if (exporte.warnings.length > 0) continue;
    silencieux += 1;

    const document = JSON.parse(exporte.content);
    const { etat, axes, constats } = axesDeTokens(document);
    if (etat !== 'complet' && etat !== 'sans-modes') {
      refuses.push(`fichier ${tour}, état ${etat} : ${constats.map(({ message }) => message).join(' ; ')}`);
      continue;
    }
    const { attributs, erreurs } = attributsDesAxes(contextesDesAxes(document, axes));
    const refus = [...erreurs, ...feuilleDesTokens(document, { axes, attributs }).refus]
      .filter((motif) => !motif.startsWith('Cycle d\'alias'));
    for (const motif of refus) {
      refuses.push(`fichier ${tour} (${fichier.collections.map(({ name }) => name).join(', ')}) : ${motif}`);
    }
  }
  assert.ok(silencieux > 80, `${silencieux} exports sans constat sur 600 : le tirage ne couvre plus le cas accepté`);
  assert.deepEqual(refuses, []);
});
