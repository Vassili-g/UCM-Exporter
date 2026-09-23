/**
 * Ce que le gabarit et le manifest d'un plugin doivent tenir pour que le
 * plugin s'ouvre, et se distribue par la Community.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const exiger = createRequire(__filename);
const { STYLE_MARKER, SCRIPT_MARKER } = exiger('../build/inline-ui.cjs') as {
  STYLE_MARKER: string;
  SCRIPT_MARKER: string;
};

/**
 * Les repères du build absents d'un gabarit. Un repère introuvable laisse la
 * balise en place au lieu de lever : `dist/ui.html` pointerait un fichier
 * absent, et le plugin s'ouvrirait vide sans qu'aucun contrôle échoue.
 */
export function reperesManquants(gabarit: string): string[] {
  return [STYLE_MARKER, SCRIPT_MARKER].filter((repere) => !gabarit.includes(repere));
}

/**
 * Les manifests d'un plugin, source et distribuable, qui déclarent
 * `enablePrivatePluginApi`. Ce drapeau est réservé aux plugins privés d'une
 * organisation : Figma refuserait la soumission à la Community. Le manifest
 * distribuable n'existe qu'après un build ; son absence n'est pas une faute.
 */
export function manifestsAuxDroitsPrives(racine: string): string[] {
  return ['manifest.json', 'dist/manifest.json'].filter((relatif) => {
    const chemin = path.join(racine, relatif);
    if (!fs.existsSync(chemin)) return false;
    return 'enablePrivatePluginApi' in (JSON.parse(fs.readFileSync(chemin, 'utf8')) as Record<string, unknown>);
  });
}

/** Les domaines que le manifest source ouvre au réseau. */
export function domainesOuverts(racine: string): unknown {
  const manifest = JSON.parse(fs.readFileSync(path.join(racine, 'manifest.json'), 'utf8')) as {
    networkAccess?: { allowedDomains?: unknown };
  };
  return manifest.networkAccess?.allowedDomains;
}
