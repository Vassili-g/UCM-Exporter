/**
 * Le JSON canonique d'une valeur et son empreinte ([REC-02]).
 *
 * Le sandbox Figma n'a pas `TextEncoder` : ce module encode lui-même en UTF-8.
 */

/**
 * Le JSON canonique : clés d'objet triées, à toute profondeur, sans espace ;
 * nombres, chaînes et tableaux tels que `JSON.stringify` les écrit. Une clé qui
 * vaut `undefined` est omise, comme `JSON.stringify` l'omet.
 */
export function jsonCanonique(valeur: unknown): string {
  if (Array.isArray(valeur)) return `[${valeur.map((element) => jsonCanonique(element ?? null)).join(',')}]`;
  if (typeof valeur === 'object' && valeur !== null) {
    const objet = valeur as Record<string, unknown>;
    const cles = Object.keys(objet).filter((cle) => objet[cle] !== undefined).sort();
    return `{${cles.map((cle) => `${JSON.stringify(cle)}:${jsonCanonique(objet[cle])}`).join(',')}}`;
  }
  return JSON.stringify(valeur);
}

/** Les octets UTF-8 d'une chaîne. Une moitié de paire de substitution isolée s'encode en `U+FFFD`. */
export function octetsUtf8(texte: string): number[] {
  const octets: number[] = [];
  for (let rang = 0; rang < texte.length; rang += 1) {
    let point = texte.charCodeAt(rang);
    if (point >= 0xd800 && point <= 0xdbff) {
      const suivant = texte.charCodeAt(rang + 1);
      if (suivant >= 0xdc00 && suivant <= 0xdfff) {
        point = 0x10000 + ((point - 0xd800) << 10) + (suivant - 0xdc00);
        rang += 1;
      } else {
        point = 0xfffd;
      }
    } else if (point >= 0xdc00 && point <= 0xdfff) {
      point = 0xfffd;
    }
    if (point < 0x80) octets.push(point);
    else if (point < 0x800) octets.push(0xc0 | (point >> 6), 0x80 | (point & 0x3f));
    else if (point < 0x10000) octets.push(0xe0 | (point >> 12), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f));
    else {
      octets.push(
        0xf0 | (point >> 18),
        0x80 | ((point >> 12) & 0x3f),
        0x80 | ((point >> 6) & 0x3f),
        0x80 | (point & 0x3f),
      );
    }
  }
  return octets;
}

/** `FNV-1a` 32 bits sur des octets, écrit en huit chiffres hexadécimaux minuscules. */
export function fnv1a(octets: readonly number[]): string {
  let empreinte = 0x811c9dc5;
  for (const octet of octets) {
    empreinte ^= octet;
    empreinte = Math.imul(empreinte, 0x01000193) >>> 0;
  }
  return empreinte.toString(16).padStart(8, '0');
}

/** L'empreinte d'une valeur : `FNV-1a` sur les octets UTF-8 de son JSON canonique ([REC-02]). */
export function empreinte(valeur: unknown): string {
  return fnv1a(octetsUtf8(jsonCanonique(valeur)));
}
