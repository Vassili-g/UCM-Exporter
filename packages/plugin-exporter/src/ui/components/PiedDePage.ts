/**
 * Le pied de page : la version de schéma que ce bundle produit, et la durée de
 * la dernière analyse, dépliable étape par étape.
 */
import type { TraceDeMesure } from '../../contract/mesure';

/** Le libellé de chaque étape de la trace ; une étape inconnue garde son nom. */
const LIBELLES_DES_ETAPES: Record<string, string> = {
  regles: 'Règles d’usage',
  variants: 'Variants',
  index: 'Index des dépendances',
  composition: 'Composition',
  wrapper: 'Wrapper',
  variables: 'Variables',
  structure: 'Structure',
  echantillons: 'Échantillons',
  compaction: 'Compaction',
  serialisation: 'Sérialisation',
  depot: 'Lecture du dépôt',
};

export interface PiedDePageUi {
  element: HTMLElement;
  afficherVersion(version: string): void;
  afficherMesure(trace: TraceDeMesure): void;
}

/** « 850 ms » sous la seconde, « 4,2 s » au-delà. */
export function duree(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}

/** Copie un texte sans l'API du presse-papiers, que l'iframe d'un plugin peut refuser. */
function copier(texte: string): void {
  const zone = document.createElement('textarea');
  zone.value = texte;
  zone.setAttribute('readonly', '');
  zone.style.position = 'fixed';
  zone.style.opacity = '0';
  document.body.append(zone);
  zone.select();
  document.execCommand('copy');
  zone.remove();
}

export function createPiedDePage(): PiedDePageUi {
  const footer = document.createElement('footer');
  footer.className = 'app-footer';
  footer.hidden = true;

  const version = document.createElement('span');

  const mesure = document.createElement('details');
  mesure.className = 'pied-mesure';
  mesure.hidden = true;
  const resume = document.createElement('summary');
  const etapes = document.createElement('dl');
  etapes.className = 'pied-etapes';
  const copie = document.createElement('button');
  copie.type = 'button';
  copie.className = 'pied-copie';
  copie.textContent = 'Copier la trace';
  mesure.append(resume, etapes, copie);

  let traceAffichee = '';
  copie.addEventListener('click', () => {
    copier(traceAffichee);
    copie.textContent = 'Trace copiée';
    setTimeout(() => {
      copie.textContent = 'Copier la trace';
    }, 1500);
  });

  footer.append(version, mesure);

  return {
    element: footer,

    afficherVersion(numero: string) {
      version.textContent = `Schéma de contrat ${numero}`;
      footer.hidden = false;
    },

    afficherMesure(trace: TraceDeMesure) {
      traceAffichee = JSON.stringify(trace, null, 2);
      resume.textContent = `Analyse en ${duree(trace.totalMs)}`;
      etapes.replaceChildren(...trace.etapes.flatMap(({ nom, ms }) => {
        const terme = document.createElement('dt');
        terme.textContent = LIBELLES_DES_ETAPES[nom] ?? nom;
        const valeur = document.createElement('dd');
        valeur.textContent = duree(ms);
        return [terme, valeur];
      }));
      mesure.hidden = false;
    },
  };
}
