/**
 * La trace de mesure d'une analyse : durée de chaque étape, compteurs et
 * empreinte du contrat.
 *
 * Elle n'existe que dans le build de mesure (`build:code:mesure`). Le build
 * courant définit `__UCM_MESURE__` à `false`, et `--minify-syntax` retire alors
 * le corps de chaque fonction : sans cette option, esbuild garde un
 * `if (false)` et la chaîne de la trace. La garde s'écrit donc en ligne dans
 * chaque fonction, car esbuild ne replie pas l'appel d'une fonction qui rend
 * `false`. Sans définition, sous Node, la constante se lit sur `globalThis` à
 * chaque appel : un test l'active et la retire à volonté.
 *
 * La trace part en un seul `console.log` à la fin de l'analyse. Elle n'entre
 * jamais dans le contrat, ni dans `meta.diagnostics`, ni dans l'interface.
 */

/** Les compteurs de la trace, décrits dans la conception, section 5.1. */
export type Compteur =
  | 'pagesChargees'
  | 'pagesBalayees'
  | 'pagesReutilisees'
  | 'nodesParcourus'
  | 'appelsGetAllNodes'
  | 'appelsFindAllWithCriteria'
  | 'appelsGetMainComponentAsync'
  | 'maitresReutilises'
  | 'respirations'
  | 'tailleIndex'
  | 'porteeRefusee';

type Trace = {
  debut: number;
  etapes: Array<{ nom: string; ms: number }>;
  enCours: { nom: string; debut: number } | null;
  compteurs: Partial<Record<Compteur, number>>;
};

let trace: Trace | null = null;

/** Ouvre la trace d'une analyse ; une trace restée ouverte par un échec est jetée. */
export function ouvrirLaMesure(): void {
  if (!(typeof __UCM_MESURE__ !== 'undefined' && __UCM_MESURE__ === true)) return;
  trace = { debut: Date.now(), etapes: [], enCours: null, compteurs: {} };
}

function clore(ouverte: Trace, maintenant: number): void {
  if (!ouverte.enCours) return;
  ouverte.etapes.push({ nom: ouverte.enCours.nom, ms: maintenant - ouverte.enCours.debut });
  ouverte.enCours = null;
}

/** Ouvre l'étape `nom` et clôt la précédente. */
export function etape(nom: string): void {
  if (!(typeof __UCM_MESURE__ !== 'undefined' && __UCM_MESURE__ === true)) return;
  if (!trace) return;
  const maintenant = Date.now();
  clore(trace, maintenant);
  trace.enCours = { nom, debut: maintenant };
}

/** Ajoute `n` au compteur ; sans effet hors d'une trace ouverte. */
export function compter(nom: Compteur, n = 1): void {
  if (!(typeof __UCM_MESURE__ !== 'undefined' && __UCM_MESURE__ === true)) return;
  if (!trace) return;
  trace.compteurs[nom] = (trace.compteurs[nom] ?? 0) + n;
}

/**
 * FNV-1a 32 bits du contrat sérialisé, `exportedAt` remplacé par une valeur
 * fixe : deux exports du même composant à deux dates ont la même empreinte.
 */
export function empreinteDuContrat(content: string): string {
  const stable = content.replace(/("exportedAt"\s*:\s*)"[^"]*"/, '$1"-"');
  let hash = 0x811c9dc5;
  for (let index = 0; index < stable.length; index += 1) {
    hash ^= stable.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Clôt la trace et l'imprime, avec l'empreinte du contrat produit. */
export function fermerLaMesure(content: string): void {
  if (!(typeof __UCM_MESURE__ !== 'undefined' && __UCM_MESURE__ === true)) return;
  if (!trace) return;
  const maintenant = Date.now();
  const { debut, etapes, compteurs } = trace;
  clore(trace, maintenant);
  trace = null;
  console.log('[ucm:mesure]', JSON.stringify({
    totalMs: maintenant - debut,
    etapes,
    compteurs,
    empreinte: empreinteDuContrat(content),
  }));
}
