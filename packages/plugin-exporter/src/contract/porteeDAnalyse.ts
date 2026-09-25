/**
 * La portée d'une analyse : ce que `handleExportComponent` garde le temps d'un
 * export, et oublie à la fin.
 *
 * Aucune signature de `src/contract/` ne transporte ces mémoires : chaque
 * fonction qui en profite les lit ici, et une fonction appelée hors de toute
 * portée calcule sans mémoire. Le résultat est le même dans les deux cas ; seul
 * le nombre d'allers-retours vers Figma change.
 */
import { compter } from './mesure';

type Portee = {
  /** Le maître de chaque instance déjà demandée, par id d'instance. */
  maitres: Map<string, Promise<ComponentNode | null>>;
  /** Ouvertures refusées en cours : tant qu'il y en a, la mémoire se tait. */
  refusees: number;
  /** Rend la main au sandbox, et lève si l'analyse est annulée. */
  respirer?: () => Promise<void>;
  derniereRespiration: number;
};

/**
 * Le calcul qu'une analyse enchaîne sans rendre la main.
 *
 * Le sandbox n'a qu'un fil : tant que l'analyse calcule, un changement de
 * sélection n'est pas lu, et l'annulation coopérative de `code.ts` attend la
 * fin de l'étape. Au-delà de ce budget, la boucle en cours rend la main.
 */
export const BUDGET_DE_CALCUL_MS = 30;

let portee: Portee | null = null;
let desactivee = false;

/**
 * Exécute `corps` dans une portée d'analyse.
 *
 * Une seule portée est ouverte à la fois : `code.ts` refuse déjà une seconde
 * opération. Une ouverture pendant qu'une portée est ouverte exécute `corps`,
 * et la mémoire se tait pour tous tant qu'il court : le sandbox n'a pas de
 * contexte asynchrone qui dirait à `maitreDe` de quel corps vient l'appel.
 */
export async function dansUnePorteeDAnalyse<T>(
  options: { respirer?: () => Promise<void> },
  corps: () => Promise<T>,
): Promise<T> {
  if (portee) {
    compter('porteeRefusee');
    const ouverte = portee;
    ouverte.refusees += 1;
    try {
      return await corps();
    } finally {
      ouverte.refusees -= 1;
    }
  }
  const ouverte: Portee = {
    maitres: new Map(),
    refusees: 0,
    respirer: options.respirer,
    derniereRespiration: Date.now(),
  };
  portee = ouverte;
  try {
    return await corps();
  } finally {
    if (portee === ouverte) portee = null;
  }
}

/**
 * Le maître d'une instance, ou null quand Figma ne le sert pas.
 *
 * `getMainComponentAsync` lève sur une instance orpheline, et une méthode
 * absente vaut une instance orpheline : aucun des appelants ne fait échouer
 * l'export pour un node cassé. Dans une portée, chaque id d'instance n'est
 * demandé qu'une fois.
 */
export function maitreDe(instance: InstanceNode): Promise<ComponentNode | null> {
  const memoire = portee && portee.refusees === 0 && !desactivee && typeof instance.id === 'string'
    ? portee.maitres
    : null;
  const deja = memoire?.get(instance.id);
  if (deja) {
    compter('maitresReutilises');
    return deja;
  }
  const lecture = lireLeMaitre(instance);
  memoire?.set(instance.id, lecture);
  return lecture;
}

function lireLeMaitre(instance: InstanceNode): Promise<ComponentNode | null> {
  if (typeof instance.getMainComponentAsync !== 'function') return Promise.resolve(null);
  compter('appelsGetMainComponentAsync');
  try {
    return instance.getMainComponentAsync().catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}

/**
 * Rend la main si le budget de calcul est écoulé ; sans effet hors portée, ou
 * dans une portée ouverte sans `respirer`.
 *
 * `respirer` lève sur une analyse annulée : l'exception traverse la boucle qui
 * respire, et la portée se ferme dans son `finally`.
 */
export async function respirerSiBesoin(): Promise<void> {
  const ouverte = portee;
  if (!ouverte?.respirer) return;
  if (Date.now() - ouverte.derniereRespiration < BUDGET_DE_CALCUL_MS) return;
  compter('respirations');
  await ouverte.respirer();
  ouverte.derniereRespiration = Date.now();
}

/**
 * Réservé au banc de parité (`tests/paritePerformance.test.ts`) : vrai, la
 * portée s'ouvre sans rien garder, et l'export calcule comme hors portée.
 */
export function desactiverLaPorteePourLeBanc(valeur: boolean): void {
  desactivee = valeur;
}
