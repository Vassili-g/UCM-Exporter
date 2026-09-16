/**
 * Un composant publié avant les tokens ouvre une demande que le contrôle du
 * repository refuse jusqu'à la fusion des tokens. L'analyse le dit avant la
 * publication, sans la bloquer.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { lireAvantEcriture } from '../src/depot';
import type { RepositoryArtifact } from '../src/depot';
import type { DemandeOuverte, FichierLu, Forge } from '../src/forges/forge';
import { TERMES_GITLAB } from '../src/forges/termes';
import { verdictDePrevol } from '../src/prevol';

const BRANCHE_TOKENS = 'ucm-exporter/export-tokens-20260916-100000';

/** Une forge en mémoire : des fichiers par branche, et des demandes ouvertes. */
function forgeEnMemoire(fichiers: Record<string, Record<string, string>>, demandes: DemandeOuverte[] = []): Forge {
  return {
    termes: TERMES_GITLAB,
    baseBranch: 'main',
    testerDepot: async () => undefined,
    lireFichier: async (chemin: string, ref = 'main'): Promise<FichierLu | null> => {
      const contenu = fichiers[ref]?.[chemin];
      return contenu === undefined ? null : { contenu, version: { commitId: 'c', lastCommitId: 'l' } };
    },
    demandesOuvertes: async () => demandes,
    publier: async () => 'https://gitlab.com/mon-groupe/design-system/-/merge_requests/1',
    sansLienAutomatique: (texte: string) => texte,
  };
}

const composant: RepositoryArtifact = {
  kind: 'component',
  filename: 'Button.contract.json',
  content: '{"contractVersion":"13.0"}',
  warnings: [],
};

test('pour un composant, la lecture dit si les tokens sont fusionnés, en attente ou absents', async () => {
  const fusionnes = await lireAvantEcriture(forgeEnMemoire({ main: { 'tokens.json': '{}' } }), composant, { avecTokens: true });
  assert.equal(fusionnes.tokens, 'fusionnes');

  const enAttente = await lireAvantEcriture(
    forgeEnMemoire({ main: {}, [BRANCHE_TOKENS]: { 'tokens.json': '{}' } }, [{ branche: BRANCHE_TOKENS, url: null }]),
    composant,
    { avecTokens: true },
  );
  assert.equal(enAttente.tokens, 'en-attente');

  const absents = await lireAvantEcriture(forgeEnMemoire({ main: {} }), composant, { avecTokens: true });
  assert.equal(absents.tokens, 'absents');
});

test('pour les tokens eux-mêmes, la lecture ne rend aucun état des tokens', async () => {
  const tokens = await lireAvantEcriture(forgeEnMemoire({ main: {} }), { ...composant, kind: 'tokens', filename: 'tokens.json' }, { avecTokens: true });
  assert.equal(tokens.tokens, null);
});

test('le verdict avertit sans bloquer quand les tokens ne sont pas fusionnés, et nomme la demande de la forge', () => {
  const base = { code: 'a-publier', genre: 'component', chemin: 'components/Button/Button.contract.json', avertissements: 0, demande: 'merge request' } as const;

  const absents = verdictDePrevol({ ...base, tokens: 'absents' });
  assert.equal(absents.action, 'Publier le composant');
  assert.match(absents.texte, /Ce repository n’a pas encore de tokens : publiez-les et faites fusionner leur merge request avant celle de ce composant/);

  const enAttente = verdictDePrevol({ ...base, tokens: 'en-attente' });
  assert.equal(enAttente.action, 'Publier le composant');
  assert.match(enAttente.texte, /Les tokens attendent la fusion de leur merge request/);

  const fusionnes = verdictDePrevol({ ...base, tokens: 'fusionnes' });
  assert.doesNotMatch(fusionnes.texte, /tokens/);
  assert.doesNotMatch(verdictDePrevol({ ...base, genre: 'tokens', tokens: 'absents' }).texte, /pas encore de tokens/);
});
