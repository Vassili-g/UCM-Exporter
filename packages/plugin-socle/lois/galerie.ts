/**
 * La loi de la galerie d'un plugin : chaque état se déclare entier, chaque
 * message que le sandbox peut envoyer a un état où le regarder, et le décalque
 * sert les variables de thème que les feuilles demandent. Chaque plugin
 * l'appelle depuis son propre test, avec ses états et ses sources.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Une étape du pilote du banc : un seul geste par étape. */
export interface Etape {
  message?: { type: string };
  clic?: string;
  saisie?: { dans: string; valeur: string };
  erreurUi?: string;
  /** Le pointeur entre sur l'élément désigné. */
  survol?: string;
  /** Une touche pressée sur l'élément désigné, qui reçoit d'abord le focus. */
  touche?: { dans: string; cle: string };
}

/** Un état de la galerie, tel que `galerie/etats.cjs` le déclare. */
export interface EtatDeGalerie {
  id: string;
  titre: string;
  quand: string;
  regarder: string | null;
  existe: boolean;
  attendu?: string;
  atteinte?: Etape[];
}

/** Le décalque des variables de thème, commun aux plugins. */
export const DECALQUE = path.resolve(__dirname, '..', 'galerie', 'theme-figma.css');

/** Les fautes d'identité : identifiant dupliqué ou mal formé, titre ou situation absents. */
export function fautesDIdentite(etats: readonly EtatDeGalerie[]): string[] {
  const fautes: string[] = [];
  const vus = new Set<string>();
  for (const etat of etats) {
    if (vus.has(etat.id)) fautes.push(`${etat.id} : identifiant dupliqué`);
    vus.add(etat.id);
    if (!/^[a-z0-9-]+$/.test(etat.id)) fautes.push(`${etat.id} : identifiant non conforme`);
    if (!etat.titre) fautes.push(`${etat.id} : aucun titre`);
    if (!etat.quand) fautes.push(`${etat.id} : aucune situation`);
  }
  return fautes;
}

/**
 * Les fautes d'un état qui n'existe pas encore : il nomme la case du plan qui
 * le créera, selon le motif que le plugin donne, et ne porte aucun scénario.
 */
export function fautesDAttente(etats: readonly EtatDeGalerie[], motifDeCase: RegExp): string[] {
  const fautes: string[] = [];
  for (const etat of etats.filter((candidat) => !candidat.existe)) {
    if (!motifDeCase.test(etat.attendu ?? '')) fautes.push(`${etat.id} : aucune case attendue`);
    if (etat.atteinte !== undefined) fautes.push(`${etat.id} : scénario sur un état absent`);
  }
  return fautes;
}

/**
 * Les fautes d'un état atteignable : il dit ce qu'on regarde sur sa capture,
 * et chaque étape de son scénario porte un seul geste.
 */
export function fautesDeScenario(etats: readonly EtatDeGalerie[]): string[] {
  const fautes: string[] = [];
  for (const etat of etats.filter((candidat) => candidat.existe)) {
    if (!etat.regarder) fautes.push(`${etat.id} : rien à regarder`);
    if ((etat.atteinte ?? []).length === 0) fautes.push(`${etat.id} : aucune étape`);
    for (const etape of etat.atteinte ?? []) {
      const gestes = [etape.message, etape.clic, etape.saisie, etape.erreurUi, etape.survol, etape.touche].filter(Boolean);
      if (gestes.length !== 1) fautes.push(`${etat.id} : une étape porte ${gestes.length} gestes`);
    }
  }
  return fautes;
}

/**
 * Retire les commentaires avant de lire une structure : le point-virgule d'une
 * phrase fermerait sinon une union trop tôt, et la loi ne lirait qu'une partie
 * de la liste.
 */
function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Les littéraux de `type` d'une union TypeScript, lus en suivant la profondeur
 * des accolades : l'union se termine au premier `;` de profondeur zéro.
 */
export function typesDeLUnion(brut: string, nom: string): Set<string> {
  const source = sansCommentaires(brut);
  const depart = source.indexOf(`export type ${nom} =`);
  if (depart === -1) throw new Error(`Union ${nom} introuvable`);
  let profondeur = 0;
  let fin = source.length;
  for (let rang = depart; rang < source.length; rang += 1) {
    const caractere = source[rang];
    if (caractere === '{') profondeur += 1;
    else if (caractere === '}') profondeur -= 1;
    else if (caractere === ';' && profondeur === 0) {
      fin = rang;
      break;
    }
  }
  const trouves = new Set<string>();
  for (const litteral of source.slice(depart, fin).matchAll(/type:\s*'([^']+)'/g)) {
    for (const membre of litteral[1].split('|')) trouves.add(membre.trim());
  }
  return trouves;
}

/**
 * Les messages du sandbox que la galerie ne joue jamais, et ceux qu'elle joue
 * sans que `messages.ts` les déclare.
 */
export function ecartsDesMessages(
  declares: ReadonlySet<string>,
  etats: readonly EtatDeGalerie[],
): { jamaisRegardes: string[]; inventes: string[] } {
  const joues = new Set<string>();
  for (const etat of etats) {
    for (const etape of etat.atteinte ?? []) if (etape.message) joues.add(etape.message.type);
  }
  return {
    jamaisRegardes: [...declares].filter((type) => !joues.has(type)),
    inventes: [...joues].filter((type) => !declares.has(type)),
  };
}

/** Les variables de thème déclarées par un sélecteur du décalque. */
function variablesDeclarees(css: string, selecteur: string): Set<string> {
  const debut = css.indexOf(`${selecteur} {`);
  if (debut === -1) throw new Error(`Sélecteur ${selecteur} absent du décalque`);
  const bloc = css.slice(debut, css.indexOf('}', debut));
  return new Set([...bloc.matchAll(/(--figma-color-[\w-]+)\s*:/g)].map((trouve) => trouve[1]));
}

/**
 * Les variables `--figma-color-*` que les feuilles demandent et que le
 * décalque ne sert pas, par sélecteur : la galerie montrerait un repli en dur.
 */
export function variablesAbsentesDuDecalque(feuilles: string): string[] {
  const demandees = new Set([...feuilles.matchAll(/var\(\s*(--figma-color-[\w-]+)/g)].map((trouve) => trouve[1]));
  if (demandees.size === 0) throw new Error('aucune variable de thème dans les feuilles');
  const decalque = fs.readFileSync(DECALQUE, 'utf8');
  return [':root', '.figma-dark'].flatMap((selecteur) => {
    const declarees = variablesDeclarees(decalque, selecteur);
    return [...demandees].filter((variable) => !declarees.has(variable)).map((variable) => `${selecteur} ${variable}`);
  });
}

/**
 * Les scripts `.cjs` d'un dossier de galerie que Node ne compile pas. Un
 * script de capture cassé ne se verrait qu'au lancement des captures,
 * qu'aucun autre test ne fait.
 */
export function scriptsQuiNeCompilentPas(dossier: string): string[] {
  return fs.readdirSync(dossier)
    .filter((nom) => nom.endsWith('.cjs'))
    .filter((nom) => spawnSync(process.execPath, ['--check', path.join(dossier, nom)]).status !== 0);
}
