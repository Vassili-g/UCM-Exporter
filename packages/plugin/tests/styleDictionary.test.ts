/**
 * Style Dictionary 5, à la version exacte que le consommateur de référence
 * installe, lit ce que `exportTokens.ts` écrit.
 *
 * Le JSON sérialisé est écrit sur disque, construit par le groupe `css`
 * standard, et le test lit le CSS que Style Dictionary écrit à son tour. Il ne
 * lit pas la configuration du Playground : la preuve qu'elle compile est son
 * propre build.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import StyleDictionary from 'style-dictionary';
import { tokenCssVariable } from '@ucm-kit/core/format';
import { indexerTokensDtcg } from '@ucm-kit/core/lecteurs';

import { exporterLeFichier, fichierDeVariables } from './fichierDeVariables';
import type { ProfilColorimetrique } from './fichierDeVariables';

/**
 * Le fichier simulé sans sa boucle d'alias. Figma refuse de créer une boucle,
 * et Style Dictionary refuse de construire un fichier qui en porte une.
 */
function fichierSansBoucle() {
  const fichier = fichierDeVariables();
  fichier.variables = fichier.variables.filter((variable) => !variable.id.startsWith('boucle-'));
  return fichier;
}

/** Le CSS que Style Dictionary écrit pour ce contenu, ou l'erreur qui l'en empêche. */
async function cssDeStyleDictionary(contenu: string): Promise<{ css: string | null; erreur: string | null }> {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'ucm-style-dictionary-'));
  // Style Dictionary lit `source` comme un motif glob : un antislash Windows y
  // serait un échappement.
  const posix = dossier.split(path.sep).join('/');
  try {
    fs.writeFileSync(path.join(dossier, 'tokens.json'), contenu);
    const style = new StyleDictionary({
      usesDtcg: true,
      log: { verbosity: 'silent', warnings: 'disabled' },
      source: [`${posix}/tokens.json`],
      platforms: {
        css: {
          transformGroup: 'css',
          buildPath: `${posix}/css/`,
          files: [{ destination: 'tokens.css', format: 'css/variables', options: { outputReferences: true } }],
        },
      },
    });
    await style.buildAllPlatforms();
    return { css: fs.readFileSync(path.join(dossier, 'css', 'tokens.css'), 'utf8'), erreur: null };
  } catch (erreur) {
    return { css: null, erreur: erreur instanceof Error ? erreur.message : String(erreur) };
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
}

/** Les déclarations `--nom: valeur;` d'une feuille CSS, dans l'ordre. */
function declarations(css: string): Map<string, string> {
  return new Map([...css.matchAll(/^\s*(--[A-Za-z0-9_-]+):\s*(.*?);\s*$/gm)].map((trouve) => [trouve[1], trouve[2]]));
}

/**
 * Les défauts du CSS au regard du fichier de tokens : propriété absente,
 * `[object Object]`, valeur vide, référence non résolue, `null` qu'aucune cible
 * absente n'explique.
 *
 * Style Dictionary ignore depuis sa version 5.4.4 toute clé qui contient
 * `__proto__` : ces feuilles ne sont pas attendues.
 */
function defautsDuCss(css: string, tokens: unknown): string[] {
  const ecrites = declarations(css);
  const defauts: string[] = [];
  for (const [chemin, feuille] of indexerTokensDtcg(tokens) as Map<string, { $value: unknown }>) {
    if (chemin.split('.').some((segment) => segment.includes('__proto__'))) continue;
    const nom = tokenCssVariable(chemin);
    const valeur = ecrites.get(nom);
    if (valeur === undefined) {
      defauts.push(`${nom} : propriété absente`);
      continue;
    }
    if (valeur.includes('[object Object]')) defauts.push(`${nom} : [object Object]`);
    if (valeur.trim() === '') defauts.push(`${nom} : valeur vide`);
    if (/[{}]/.test(valeur)) defauts.push(`${nom} : référence non résolue ${valeur}`);
    if (valeur === 'null' && feuille.$value !== null) defauts.push(`${nom} : null`);
  }
  return defauts;
}

for (const profil of ['SRGB', 'DISPLAY_P3'] as ProfilColorimetrique[]) {
  test(`${profil} : Style Dictionary construit l’export sans défaut, une déclaration par token`, async () => {
    const { content } = await exporterLeFichier({ profil, fichier: fichierSansBoucle() });
    const { css, erreur } = await cssDeStyleDictionary(content);

    assert.equal(erreur, null);
    assert.deepEqual(defautsDuCss(css!, JSON.parse(content)), []);
    // 38 feuilles, moins `keys.__proto__.primary`.
    assert.equal(declarations(css!).size, 37);
  });
}

test('une référence reste une var() dans le CSS, et un littéral structuré devient une valeur CSS', async () => {
  const { content } = await exporterLeFichier({ fichier: fichierSansBoucle() });
  const ecrites = declarations((await cssDeStyleDictionary(content)).css!);

  assert.equal(ecrites.get('--brand-tokens-primary-chain'), 'var(--brand-tokens-primary-default)');
  assert.equal(ecrites.get('--primitives-color-half'), 'rgba(255, 255, 255, 0.5)');
  assert.equal(ecrites.get('--primitives-dimensions-0-5'), '0.5px');
  assert.equal(ecrites.get('--primitives-fontweight-bold'), '700');
});

test('Style Dictionary refuse un fichier qui porte une boucle d’alias', async () => {
  // Le même fichier, boucle comprise. En verbosité silencieuse, Style Dictionary
  // ne nomme pas la boucle ; les deux tests sans elle construisent sans erreur.
  const { content } = await exporterLeFichier();
  const { erreur } = await cssDeStyleDictionary(content);

  assert.match(erreur ?? '', /Reference Errors/);
});
