/**
 * `tokens.json` jugé par le schéma DTCG 2025.10 figé, une autorité extérieure au
 * producteur, puis par les contrôles UCM que ce schéma ne porte pas.
 *
 * Le schéma juge la forme de chaque feuille. Il ne lit ni `$extensions`, ni
 * l'existence d'une cible, ni l'alpha qu'il tient pour facultatif. Le fichier
 * reste un dialecte sur les feuilles que docs/FORMAT.md énumère, et ce test en
 * fixe les chemins exacts : une feuille qui cesserait d'être conforme, ou le
 * redeviendrait, le fait échouer.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import Ajv from 'ajv';
import { EXTENSION_VERSION_TOKENS, TOKENS_FORMAT_VERSION } from '@ucm-kit/core/format';
import { indexerTokensDtcg } from '@ucm-kit/core/lecteurs';

import { exporterLeFichier } from './fichierDeVariables';
import type { ProfilColorimetrique } from './fichierDeVariables';

type Feuille = {
  $type: string;
  $value: unknown;
  $extensions?: Record<string, Record<string, unknown>>;
};

const dossier = path.join(__dirname, 'dtcg-2025.10');
const octets = fs.readFileSync(path.join(dossier, 'format.json'));
const schema = JSON.parse(octets.toString('utf8'));

// Les formats `uri-reference` et `json-pointer-uri-fragment` ne concernent que
// les références JSON Pointer, que l'export n'écrit pas.
const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false, logger: false });
ajv.addSchema(schema);
const validerDocument = ajv.getSchema(schema.$id)!;
const validerToken = ajv.getSchema('https://www.designtokens.org/schemas/2025.10/format/token.json')!;

/**
 * Les feuilles du fichier simulé que le module ne reconnaît pas : les types
 * `string` et `boolean`, qu'il ne définit pas, et le `$value: null` d'un alias
 * dont la cible manque au fichier.
 *
 * La liste se lit dans les deux sens. Une feuille qui cesse d'être conforme
 * doit y entrer, et une feuille qui le redevient doit en sortir : la version 2
 * a fait sortir les deux familles prouvées, et entrer une easing dont la cible
 * est écartée.
 */
const DIALECTE = [
  'brand-tokens.fontweight.incomplete',
  'brand-tokens.fontweight.mixed',
  'brand-tokens.fontweight.numeric',
  'primitives.flags.visible',
  'primitives.fontfamily.conflit',
  'primitives.fontfamily.unbound',
  'primitives.fontweight.free',
  'primitives.fontweight.numeric',
  'semantic.broken.color',
  'semantic.fontweight.broken',
  'semantic.fontweight.loop-a',
  'semantic.fontweight.loop-b',
  'semantic.motion.broken-easing',
];

const PROFILS: ProfilColorimetrique[] = ['SRGB', 'DISPLAY_P3'];

/** Le document écrit, relu depuis son JSON, et ses feuilles par chemin. */
async function exporte(profil: ProfilColorimetrique) {
  const { content } = await exporterLeFichier({ profil });
  const tokens = JSON.parse(content);
  return { content, tokens, feuilles: indexerTokensDtcg(tokens) as Map<string, Feuille> };
}

const estReference = (valeur: unknown) => typeof valeur === 'string' && valeur.startsWith('{');

/** `$value` puis chaque valeur de `com.ucm.modes`. */
function valeursDe(feuille: Feuille): unknown[] {
  return [feuille.$value, ...Object.values(feuille.$extensions?.['com.ucm.modes'] ?? {})];
}

test('le schéma DTCG figé est intact', () => {
  const readme = fs.readFileSync(path.join(dossier, 'README.md'), 'utf8');
  const publiee = readme.match(/^([0-9a-f]{64})\s+format\.json$/m)?.[1];

  assert.ok(publiee, "le README n'expose plus l'empreinte de format.json");
  assert.equal(createHash('sha256').update(octets).digest('hex'), publiee);
  assert.equal(typeof validerDocument, 'function', 'le schéma ne compile plus');
  assert.equal(typeof validerToken, 'function', 'format/token.json n’est plus embarqué');
});

for (const profil of PROFILS) {
  test(`${profil} : chaque feuille est conforme au module Format, hors du dialecte énuméré`, async () => {
    const { feuilles } = await exporte(profil);
    const refusees = [...feuilles].filter(([, feuille]) => !validerToken(feuille)).map(([chemin]) => chemin);

    assert.deepEqual(refusees.sort(), DIALECTE);
    assert.equal(feuilles.size - refusees.length, 39);
  });

  test(`${profil} : chaque valeur de mode a la forme que le module donne à son type`, async () => {
    const { feuilles } = await exporte(profil);
    const refusees: string[] = [];
    for (const [chemin, feuille] of feuilles) {
      if (DIALECTE.includes(chemin)) continue;
      for (const [mode, valeur] of Object.entries(feuille.$extensions?.['com.ucm.modes'] ?? {})) {
        if (!validerToken({ $type: feuille.$type, $value: valeur })) refusees.push(`${chemin} (${mode})`);
      }
    }
    assert.deepEqual(refusees, []);
  });

  test(`${profil} : sans ses feuilles de dialecte, le document entier est valide`, async () => {
    const { tokens } = await exporte(profil);
    for (const chemin of DIALECTE) {
      const segments = chemin.split('.');
      const parent = segments.slice(0, -1).reduce((noeud, segment) => noeud[segment], tokens);
      delete parent[segments.at(-1)!];
    }

    assert.equal(validerDocument(tokens), true, JSON.stringify(validerDocument.errors?.slice(0, 3)));
  });
}

test('la marque est à la racine, en tête du fichier, et sur aucun groupe', async () => {
  const { content, tokens } = await exporte('SRGB');
  const groupesMarques: string[] = [];
  (function parcourir(noeud: Record<string, unknown>, chemin: string[]) {
    if ('$value' in noeud) return;
    if (chemin.length > 0 && '$extensions' in noeud) groupesMarques.push(chemin.join('.'));
    for (const [cle, enfant] of Object.entries(noeud)) {
      if (!cle.startsWith('$') && enfant && typeof enfant === 'object') parcourir(enfant as Record<string, unknown>, [...chemin, cle]);
    }
  })(tokens, []);

  assert.deepEqual(tokens.$extensions, { [EXTENSION_VERSION_TOKENS]: TOKENS_FORMAT_VERSION });
  assert.ok(content.startsWith('{\n  "$extensions":'));
  assert.deepEqual(groupesMarques, []);
});

for (const profil of PROFILS) {
  test(`${profil} : chaque couleur écrit son alpha et chaque dimension son unité px, dans chaque mode`, async () => {
    const { feuilles } = await exporte(profil);
    const fautes: string[] = [];
    for (const [chemin, feuille] of feuilles) {
      for (const valeur of valeursDe(feuille)) {
        if (valeur === null || estReference(valeur)) continue;
        const objet = valeur as Record<string, unknown>;
        if (feuille.$type === 'color' && typeof objet.alpha !== 'number') fautes.push(`${chemin} : alpha absent`);
        if (feuille.$type === 'dimension' && objet.unit !== 'px') fautes.push(`${chemin} : unité ${String(objet.unit)}`);
      }
    }
    assert.deepEqual(fautes, []);
  });
}

test('aucun segment de chemin ne contredit le motif de nom du module', async () => {
  const { feuilles } = await exporte('SRGB');
  const motif = /^[^$.{}][^.{}]*$/;
  const fautifs = [...feuilles.keys()].filter((chemin) => chemin.split('.').some((segment) => !motif.test(segment)));

  assert.deepEqual(fautifs, []);
});

test('deux exports Display P3 du même fichier sont identiques à l’octet', async () => {
  assert.equal((await exporte('DISPLAY_P3')).content, (await exporte('DISPLAY_P3')).content);
});

test('le schéma refuse une composante ou une unité invalide, et tolère un alpha absent', () => {
  const couleur = (valeur: unknown) => validerToken({ $type: 'color', $value: valeur });
  const dimension = (valeur: unknown) => validerToken({ $type: 'dimension', $value: valeur });

  assert.equal(couleur({ colorSpace: 'srgb', components: [1, 0, 0], alpha: 1 }), true);
  assert.equal(couleur({ colorSpace: 'srgb', components: [1.5, 0, 0], alpha: 1 }), false);
  assert.equal(couleur({ colorSpace: 'srgb', components: ['1', 0, 0], alpha: 1 }), false);
  assert.equal(couleur({ colorSpace: 'srgb', components: [1, 0], alpha: 1 }), false);
  assert.equal(dimension({ value: 8, unit: 'px' }), true);
  assert.equal(dimension({ value: 8, unit: 'em' }), false);
  assert.equal(dimension({ value: 8 }), false);
  // L'alpha est facultatif pour le module : seul le contrôle UCM ci-dessus l'exige.
  assert.equal(couleur({ colorSpace: 'srgb', components: [1, 0, 0] }), true);
});
