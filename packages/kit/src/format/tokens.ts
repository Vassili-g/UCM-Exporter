/**
 * La forme de `tokens.json` et sa version du format de tokens : l'unique
 * endroit où le numéro courant est écrit, et l'unique lecture de la marque.
 *
 * La version du format de tokens ne suit pas `CONTRACT_VERSION` : le contrat et
 * le fichier de tokens changent de forme séparément. docs/FORMAT.md décrit la
 * forme, docs/COMPATIBILITE.md ce que chaque état de la marque vaut à un
 * repository.
 *
 * Ce module ne dépend de rien, pour que le plugin annonce la version lue dans
 * le fichier qu'il dépose avec la même lecture que le contrôle du repository.
 */

/** La version du format de tokens que le moteur écrit. */
export const TOKENS_FORMAT_VERSION = 2;

/**
 * Les versions marquées que ce paquet sait lire, la courante comprise.
 *
 * La liste est explicite. Une version inférieure à la courante n'est pas
 * présumée lisible : chaque version décide nommément laquelle elle accueille
 * encore, et laquelle sort de la fenêtre.
 */
export const VERSIONS_DE_TOKENS_LUES: readonly number[] = [1, 2];

/** La clé de `$extensions`, à la racine du document, qui porte la version. */
export const EXTENSION_VERSION_TOKENS = 'com.ucm.formatVersion';

/** Une couleur de la version 1 : canaux entre 0 et 1, sans arrondi, `alpha` toujours écrit. */
export type CouleurDeToken = {
  colorSpace: 'srgb' | 'display-p3';
  components: [number, number, number];
  alpha: number;
};

/** Une dimension de la version 1 : l'unité est toujours le pixel. */
export type DimensionDeToken = { value: number; unit: 'px' };

/** Une famille typographique de la version 2 : le nom que Figma publie, seul. */
export type FamilleDeToken = string;

/**
 * Une durée de la version 2. Figma compte une variable `TIMING` en secondes,
 * et l'export recopie ce nombre sans le convertir ni l'arrondir. DTCG accepte
 * aussi `ms`, que le moteur n'écrit pas.
 */
export type DureeDeToken = { value: number; unit: 's' };

/**
 * Une courbe de la version 2 : `[x1, y1, x2, y2]`. DTCG borne les abscisses à
 * `[0, 1]` et laisse les ordonnées libres, ce qui admet les courbes à
 * dépassement.
 */
export type CourbeDeToken = [number, number, number, number];

/**
 * La valeur d'un token dans un mode : une référence `{chemin}` ou un littéral.
 * `null` est écrit quand un alias vise une variable absente.
 */
export type ValeurDeToken =
  | CouleurDeToken
  | CourbeDeToken
  | DimensionDeToken
  | DureeDeToken
  | FamilleDeToken
  | number
  | string
  | boolean
  | null;

/** Une feuille : `com.ucm.modes` porte chaque mode sous la forme de `$value`. */
export interface TokenDeDocument {
  $value: ValeurDeToken;
  $type:
    | 'color'
    | 'cubicBezier'
    | 'dimension'
    | 'duration'
    | 'fontFamily'
    | 'number'
    | 'string'
    | 'boolean';
  $extensions?: { 'com.ucm.modes'?: Record<string, ValeurDeToken> };
}

/** Un groupe ne porte que des groupes et des tokens : aucune métadonnée, aucune marque. */
export interface GroupeDeTokens {
  [cle: string]: GroupeDeTokens | TokenDeDocument;
}

/** Ce que la racine porte sous `$extensions`. */
export type ExtensionsDuDocument = { [EXTENSION_VERSION_TOKENS]: number };

/** Le document entier : la marque à la racine, puis les groupes. */
export type DocumentDeTokens = { $extensions?: ExtensionsDuDocument } & {
  [groupe: string]: GroupeDeTokens | TokenDeDocument | ExtensionsDuDocument | undefined;
};

/**
 * Ce que la marque dit d'un fichier.
 *
 * - `origine` : pas de marque, la forme d'avant la version 1 ;
 * - `courante` : la version que le moteur écrit aujourd'hui ;
 * - `ancienne` : une version antérieure que la fenêtre accueille encore ;
 * - `future` : un entier plus grand, qu'aucune lecture ne présume compatible ;
 * - `invalide` : toute autre valeur, rendue telle quelle pour que le rapport la
 *   cite.
 */
export type EtatDuFormatDeTokens =
  | { etat: 'origine' }
  | { etat: 'courante'; version: number }
  | { etat: 'ancienne'; version: number }
  | { etat: 'future'; version: number }
  | { etat: 'invalide'; valeur: unknown };

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);
}

/** Une clé propre : une marque héritée du prototype n'a pas été écrite dans le fichier. */
function porte(objet: Record<string, unknown>, cle: string): boolean {
  return Object.prototype.hasOwnProperty.call(objet, cle);
}

/**
 * L'état du format d'un fichier de tokens déjà analysé, lu à sa racine et
 * nulle part ailleurs. Ne lève jamais.
 *
 * Un entier positif inférieur à la version courante est `ancienne` s'il figure
 * dans `VERSIONS_DE_TOKENS_LUES`, et `invalide` sinon. Une version suivante
 * retire de cette liste ce qu'elle cesse de lire.
 */
export function etatDuFormatDeTokens(document: unknown): EtatDuFormatDeTokens {
  if (!estObjet(document)) return { etat: 'invalide', valeur: document };
  if (!porte(document, '$extensions')) return { etat: 'origine' };

  const extensions = document.$extensions;
  if (!estObjet(extensions)) return { etat: 'invalide', valeur: extensions };
  if (!porte(extensions, EXTENSION_VERSION_TOKENS)) return { etat: 'origine' };

  const valeur = extensions[EXTENSION_VERSION_TOKENS];
  if (typeof valeur === 'number' && Number.isInteger(valeur)) {
    if (valeur === TOKENS_FORMAT_VERSION) return { etat: 'courante', version: valeur };
    if (valeur > TOKENS_FORMAT_VERSION) return { etat: 'future', version: valeur };
    if (VERSIONS_DE_TOKENS_LUES.includes(valeur)) return { etat: 'ancienne', version: valeur };
  }
  return { etat: 'invalide', valeur };
}
