/**
 * Encodage UTF-8/Base64 compatible avec le sandbox Figma.
 *
 * Le runtime du plugin n'expose pas systématiquement `TextEncoder`,
 * `TextDecoder`, `btoa` ou `atob` : cet utilitaire ne dépend d'aucun d'eux.
 */
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Convertit une chaîne Unicode en octets binaires UTF-8. */
function unicodeToBinary(value: string): string {
  return encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex: string) => (
    String.fromCharCode(Number.parseInt(hex, 16))
  ));
}

/** Convertit les octets binaires UTF-8 en chaîne Unicode. */
function binaryToUnicode(value: string): string {
  let encoded = '';
  for (let index = 0; index < value.length; index += 1) {
    encoded += `%${value.charCodeAt(index).toString(16).padStart(2, '0')}`;
  }
  return decodeURIComponent(encoded);
}

/** Encode des octets binaires en Base64. */
function binaryToBase64(value: string): string {
  let result = '';
  for (let index = 0; index < value.length; index += 3) {
    const first = value.charCodeAt(index);
    const second = value.charCodeAt(index + 1);
    const third = value.charCodeAt(index + 2);
    result += BASE64_ALPHABET[first >> 2];
    result += BASE64_ALPHABET[((first & 3) << 4) | (second >> 4)];
    result += Number.isNaN(second) ? '=' : BASE64_ALPHABET[((second & 15) << 2) | (third >> 6)];
    result += Number.isNaN(third) ? '=' : BASE64_ALPHABET[third & 63];
  }
  return result;
}

/** Décode une Base64 en octets binaires après validation de sa forme. */
function base64ToBinary(value: string): string {
  const source = value.replace(/\s/g, '');
  if (source.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(source)) {
    throw new Error('Contenu Base64 GitHub invalide.');
  }

  let result = '';
  for (let index = 0; index < source.length; index += 4) {
    const first = BASE64_ALPHABET.indexOf(source[index]);
    const second = BASE64_ALPHABET.indexOf(source[index + 1]);
    const third = source[index + 2] === '=' ? -1 : BASE64_ALPHABET.indexOf(source[index + 2]);
    const fourth = source[index + 3] === '=' ? -1 : BASE64_ALPHABET.indexOf(source[index + 3]);
    if (first < 0 || second < 0) throw new Error('Contenu Base64 GitHub invalide.');

    result += String.fromCharCode((first << 2) | (second >> 4));
    if (third >= 0) result += String.fromCharCode(((second & 15) << 4) | (third >> 2));
    if (fourth >= 0) result += String.fromCharCode(((third & 3) << 6) | fourth);
  }
  return result;
}

/** Encode une chaîne Unicode en Base64 pour l'API Contents GitHub. */
export function encodeBase64(value: string): string {
  return binaryToBase64(unicodeToBinary(value));
}

/** Décode le contenu Base64 UTF-8 renvoyé par GitHub. */
export function decodeBase64(value: string): string {
  return binaryToUnicode(base64ToBinary(value));
}
