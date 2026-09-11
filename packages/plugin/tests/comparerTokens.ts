/**
 * Compare deux fichiers de tokens feuille par feuille, et rend chaque écart que
 * le passage à la version 1 du format de tokens n'autorise pas.
 *
 * Les seules différences admises entre `avant` et `apres` :
 *
 * - la marque racine `{ "com.ucm.formatVersion": 1 }`, absente d'`avant` ;
 * - une couleur hexadécimale devenue objet, dans l'espace attendu, chaque canal
 *   à un demi-pas d'octet près, puisque l'hexadécimal arrondissait à l'octet ;
 * - une dimension `"8px"` devenue `{ "value": 8, "unit": "px" }`, au nombre exact ;
 * - une graisse passée de `string` à `number` : chaque littéral est le poids que
 *   `poidsDeGraisse` donne à son nom, chaque référence vise un token `number`.
 *
 * Tout le reste doit être identique : chemins, types, références, noms de modes,
 * nombres, métadonnées de groupe. Deux valeurs déjà structurées se comparent à
 * l'identique, sans tolérance. Le comparateur lit deux documents JSON reparsés,
 * jamais un objet en mémoire : c'est le fichier écrit qui fait foi.
 */
import { poidsDeGraisse } from '@ucm-kit/core/format';
import { cheminDeReference, indexerTokensDtcg } from '@ucm-kit/core/lecteurs';

/** L'espace colorimétrique qu'`apres` doit déclarer pour une couleur venue de l'hexadécimal. */
export type EspaceAttendu = 'srgb' | 'display-p3';

/** Un demi-pas de quantification de l'octet, plus la marge des flottants. */
export const TOLERANCE_DE_CANAL = 0.5 / 255 + 1e-6;

const MARQUE = 'com.ucm.formatVersion';
const MODES = 'com.ucm.modes';

type Feuille = Record<string, unknown> & { $value: unknown; $type?: string };

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return Boolean(valeur) && typeof valeur === 'object' && !Array.isArray(valeur);
}

function identiques(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Les canaux d'un hexadécimal `#rrggbb` ou `#rrggbbaa`, entre 0 et 1, ou `null`. */
function canauxHexadecimaux(valeur: unknown): number[] | null {
  if (typeof valeur !== 'string' || !/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(valeur)) return null;
  const octets = valeur.slice(1).match(/../g)!.map((paire) => parseInt(paire, 16) / 255);
  return octets.length === 3 ? [...octets, 1] : octets;
}

/** Les canaux d'un objet couleur de la version 1, alpha en dernier, ou le défaut de forme. */
function canauxStructures(valeur: unknown, espace: EspaceAttendu): number[] | string {
  if (!estObjet(valeur)) return 'la couleur n’est pas un objet';
  const cles = Object.keys(valeur).sort().join(',');
  if (cles !== 'alpha,colorSpace,components') return `la couleur porte les clés ${cles}`;
  if (valeur.colorSpace !== espace) return `espace ${String(valeur.colorSpace)}, attendu ${espace}`;
  const { components, alpha } = valeur;
  if (!Array.isArray(components) || components.length !== 3) return 'trois composantes attendues';
  const canaux = [...components, alpha];
  if (!canaux.every((canal) => typeof canal === 'number' && canal >= 0 && canal <= 1)) {
    return 'une composante ou l’alpha sort de [0, 1]';
  }
  return canaux as number[];
}

/** Le nombre d'une dimension d'origine `"8px"`, ou `null`. */
function pixelsDOrigine(valeur: unknown): number | null {
  if (typeof valeur !== 'string' || !valeur.endsWith('px')) return null;
  const nombre = Number(valeur.slice(0, -2));
  return valeur.length > 2 && Number.isFinite(nombre) ? nombre : null;
}

type Contexte = {
  espace: EspaceAttendu;
  typeApres: string | undefined;
  typeAvant: string | undefined;
  indexApres: Map<string, Feuille>;
};

/** L'écart entre deux valeurs d'un même mode, ou `null` quand le passage est admis. */
function ecartDeValeur(avant: unknown, apres: unknown, contexte: Contexte): string | null {
  if (identiques(avant, apres)) {
    if (contexte.typeAvant === contexte.typeApres) return null;
    // Une référence identique garde son sens si sa cible a changé de type avec elle.
    const cible = cheminDeReference(apres);
    const typeCible = cible === null ? undefined : contexte.indexApres.get(cible)?.$type;
    return cible !== null && typeCible === contexte.typeApres
      ? null
      : `type ${contexte.typeAvant} devenu ${contexte.typeApres}`;
  }
  if (cheminDeReference(avant) !== null || cheminDeReference(apres) !== null) {
    return `référence ${JSON.stringify(avant)} devenue ${JSON.stringify(apres)}`;
  }
  if (avant === null || apres === null) return `${JSON.stringify(avant)} devenu ${JSON.stringify(apres)}`;

  if (contexte.typeApres === 'color' && contexte.typeAvant === 'color') {
    const origine = canauxHexadecimaux(avant);
    if (origine === null) return 'couleur modifiée';
    const canaux = canauxStructures(apres, contexte.espace);
    if (typeof canaux === 'string') return canaux;
    const ecart = Math.max(...canaux.map((canal, rang) => Math.abs(canal - origine[rang])));
    return ecart <= TOLERANCE_DE_CANAL ? null : `canal écarté de ${ecart} de ${avant}`;
  }

  if (contexte.typeApres === 'dimension' && contexte.typeAvant === 'dimension') {
    const origine = pixelsDOrigine(avant);
    if (origine === null) return 'dimension modifiée';
    if (!estObjet(apres) || Object.keys(apres).sort().join(',') !== 'unit,value') {
      return 'la dimension n’est pas un objet { value, unit }';
    }
    if (apres.unit !== 'px') return `unité ${String(apres.unit)}, attendue px`;
    return apres.value === origine ? null : `${apres.value} au lieu de ${origine}`;
  }

  if (contexte.typeAvant === 'string' && contexte.typeApres === 'number') {
    const poids = poidsDeGraisse(avant);
    return poids !== null && poids === apres
      ? null
      : `${JSON.stringify(avant)} n’est pas la graisse ${JSON.stringify(apres)}`;
  }

  return `${JSON.stringify(avant)} devenu ${JSON.stringify(apres)}`;
}

/** Les valeurs d'une feuille, par mode ; `$value` sous la clé vide. */
function valeursParMode(feuille: Feuille): Map<string, unknown> {
  const valeurs = new Map<string, unknown>([['', feuille.$value]]);
  const extensions = estObjet(feuille.$extensions) ? feuille.$extensions : {};
  const modes = estObjet(extensions[MODES]) ? extensions[MODES] : {};
  for (const [mode, valeur] of Object.entries(modes)) valeurs.set(mode, valeur);
  return valeurs;
}

/** Les métadonnées `$…` de chaque groupe, par chemin ; la racine sous le chemin vide. */
function metadonneesDeGroupes(arbre: unknown, chemin = '', releve = new Map<string, Record<string, unknown>>()) {
  if (!estObjet(arbre) || '$value' in arbre) return releve;
  const propres: Record<string, unknown> = {};
  for (const [cle, enfant] of Object.entries(arbre)) {
    if (cle.startsWith('$')) propres[cle] = enfant;
    else metadonneesDeGroupes(enfant, chemin ? `${chemin}.${cle}` : cle, releve);
  }
  if (Object.keys(propres).length > 0) releve.set(chemin, propres);
  return releve;
}

/** Les écarts de métadonnées de groupe, la marque racine admise une fois. */
function ecartsDeGroupes(avant: unknown, apres: unknown): string[] {
  const groupesAvant = metadonneesDeGroupes(avant);
  const groupesApres = metadonneesDeGroupes(apres);
  const racineApres = groupesApres.get('');
  if (!groupesAvant.has('') && racineApres && identiques(racineApres, { $extensions: { [MARQUE]: 1 } })) {
    groupesApres.delete('');
  }
  const ecarts: string[] = [];
  for (const chemin of new Set([...groupesAvant.keys(), ...groupesApres.keys()])) {
    if (!identiques(groupesAvant.get(chemin), groupesApres.get(chemin))) {
      ecarts.push(`groupe « ${chemin || 'racine'} » : métadonnées ${JSON.stringify(groupesAvant.get(chemin) ?? null)} `
        + `devenues ${JSON.stringify(groupesApres.get(chemin) ?? null)}`);
    }
  }
  return ecarts;
}

/**
 * Les écarts non admis entre deux documents de tokens, un par ligne, triés.
 * Un tableau vide signifie que le passage de l'un à l'autre est admis.
 */
export function ecartsDeTokens(
  avant: unknown,
  apres: unknown,
  { espace = 'srgb' }: { espace?: EspaceAttendu } = {},
): string[] {
  const indexAvant = indexerTokensDtcg(avant) as Map<string, Feuille>;
  const indexApres = indexerTokensDtcg(apres) as Map<string, Feuille>;
  const ecarts = ecartsDeGroupes(avant, apres);

  for (const chemin of new Set([...indexAvant.keys(), ...indexApres.keys()])) {
    const feuilleAvant = indexAvant.get(chemin);
    const feuilleApres = indexApres.get(chemin);
    if (!feuilleAvant || !feuilleApres) {
      ecarts.push(`${chemin} : token ${feuilleAvant ? 'perdu' : 'ajouté'}`);
      continue;
    }

    const clesAvant = Object.keys(feuilleAvant).sort().join(',');
    const clesApres = Object.keys(feuilleApres).sort().join(',');
    if (clesAvant !== clesApres) ecarts.push(`${chemin} : clés ${clesAvant} devenues ${clesApres}`);

    const autresExtensions = (feuille: Feuille) => {
      const { [MODES]: _modes, ...reste } = estObjet(feuille.$extensions) ? feuille.$extensions : {};
      return reste;
    };
    if (!identiques(autresExtensions(feuilleAvant), autresExtensions(feuilleApres))) {
      ecarts.push(`${chemin} : $extensions modifiées`);
    }

    const modesAvant = valeursParMode(feuilleAvant);
    const modesApres = valeursParMode(feuilleApres);
    const contexte: Contexte = {
      espace, indexApres, typeAvant: feuilleAvant.$type, typeApres: feuilleApres.$type,
    };
    for (const mode of new Set([...modesAvant.keys(), ...modesApres.keys()])) {
      const ou = mode ? `${chemin} (mode ${mode})` : chemin;
      if (!modesAvant.has(mode) || !modesApres.has(mode)) {
        ecarts.push(`${ou} : mode ${modesAvant.has(mode) ? 'perdu' : 'ajouté'}`);
        continue;
      }
      const ecart = ecartDeValeur(modesAvant.get(mode), modesApres.get(mode), contexte);
      if (ecart) ecarts.push(`${ou} : ${ecart}`);
    }
  }

  return ecarts.sort();
}
