/**
 * Le suivi d'un dessin, que les deux onglets montrent ([UI-05], [PLA-24]) : la
 * progression cadre par cadre, puis le résultat et son geste. Pendant le
 * dessin, aucun autre geste n'est possible (section 13.3, « Dessin en
 * cours »). Des calques étrangers arrêtent le dessin jusqu'à la confirmation
 * du designer (D-H).
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import type { PluginMessage, ResultatDuDessin } from '../messages';
import type { EcartDePeinture } from '../planche/peints';
import { blocDeConstat } from './constats';
import type { Frontiere } from './frontiere';
import {
  TEXTES,
  TEXTES_DU_DESSIN,
  constatDesCalquesEtrangers,
  dessinInterrompu,
  ecartDePeinture,
  dessinSurUneAutreRecette,
  lectureImpossible,
  policeIndisponible,
  suiviFutur,
} from './textes';

export type EtatDuDessin =
  | { readonly phase: 'repos' }
  | { readonly phase: 'en-cours'; readonly fait: number; readonly total: number; readonly nom: string }
  /**
   * `ecarts` compare les couleurs relues sur la planche à l'aperçu (L6.14).
   * `demandees` garde les palettes demandées, dans l'ordre de la recette où le
   * sandbox les dessine : une génération interrompue les nomme (V8.4).
   */
  | { readonly phase: 'fini'; readonly resultat: ResultatDuDessin; readonly ecarts: readonly EcartDePeinture[]; readonly demandees: readonly string[] };

export interface SuiviDuDessin {
  /** Dessine les palettes nommées ; `noms` donne le nom affiché de chacune. */
  dessiner(palettes: readonly string[], noms: { readonly [id: string]: string }): void;
  /** Relance le dernier dessin demandé ; après une interruption, à partir de la palette fautive (V8.4). */
  reessayer(): void;
  /** Relance le dernier dessin en acceptant de perdre les calques étrangers qu'il a nommés. */
  confirmerEtrangers(): void;
  /** Renonce au dessin arrêté par des calques étrangers. */
  renoncer(): void;
  /** Le nom affiché de chaque palette du dernier dessin. */
  noms(): { readonly [id: string]: string };
  recevoir(message: Extract<PluginMessage, { type: 'progression' | 'dessin' }>): void;
  etat(): EtatDuDessin;
  abonner(surEtat: (etat: EtatDuDessin) => void): void;
}

export function createSuiviDuDessin(
  frontiere: Frontiere,
  surFin: () => void,
  comparer: (resultat: ResultatDuDessin) => readonly EcartDePeinture[],
): SuiviDuDessin {
  let courant: EtatDuDessin = { phase: 'repos' };
  let noms: { readonly [id: string]: string } = {};
  let derniereDemande: { palettes: readonly string[] } | null = null;
  const abonnes: ((etat: EtatDuDessin) => void)[] = [];

  function poser(etat: EtatDuDessin): void {
    courant = etat;
    for (const abonne of abonnes) abonne(etat);
  }

  function dessiner(
    palettes: readonly string[],
    nomsDesPalettes: { readonly [id: string]: string },
    etrangersConfirmes: readonly string[] = [],
  ): void {
    if (courant.phase === 'en-cours' || palettes.length === 0) return;
    noms = nomsDesPalettes;
    derniereDemande = { palettes };
    poser({ phase: 'en-cours', fait: 0, total: palettes.length, nom: noms[palettes[0]] ?? '' });
    frontiere.dessiner({ palettes, etrangersConfirmes }, () => poser({ phase: 'repos' }));
  }

  return {
    dessiner: (palettes, nomsDesPalettes) => dessiner(palettes, nomsDesPalettes),
    reessayer() {
      if (!derniereDemande) return;
      const { palettes } = derniereDemande;
      const fautive = courant.phase === 'fini' && courant.resultat.issue === 'interrompue' ? palettes.indexOf(courant.resultat.palette) : -1;
      dessiner(fautive > 0 ? palettes.slice(fautive) : palettes, noms);
    },
    confirmerEtrangers() {
      if (!derniereDemande || courant.phase !== 'fini' || courant.resultat.issue !== 'etrangers') return;
      const calques = courant.resultat.cadres.flatMap((cadre) => cadre.calques.map(({ id }) => id));
      dessiner(derniereDemande.palettes, noms, calques);
    },
    renoncer() {
      poser({ phase: 'repos' });
    },
    noms: () => noms,
    recevoir(message) {
      if (!frontiere.accepterDessin(message)) return;
      if (message.type === 'progression') {
        poser({ phase: 'en-cours', fait: message.fait, total: message.total, nom: message.nom });
        return;
      }
      poser({ phase: 'fini', resultat: message.resultat, ecarts: comparer(message.resultat), demandees: derniereDemande?.palettes ?? [] });
      surFin();
    },
    etat: () => courant,
    abonner(surEtat) {
      abonnes.push(surEtat);
    },
  };
}

/** Ce qu'un résultat offre comme geste. */
export interface GestesDuResultat {
  voirSurLaPlanche(page: string, cadres: readonly string[]): void;
  reessayer(): void;
  recharger(): void;
  confirmerEtrangers(): void;
  renoncer(): void;
}

/** Les écarts de peinture, un point à vérifier par palette (L6.14). */
function noticesDesEcarts(ecarts: readonly EcartDePeinture[], noms: { readonly [id: string]: string }): HTMLDivElement[] {
  const parPalette = new Map<string, EcartDePeinture[]>();
  for (const ecart of ecarts) parPalette.set(ecart.palette, [...(parPalette.get(ecart.palette) ?? []), ecart]);
  return [...parPalette].map(([palette, liste]) => blocDeConstat(ecartDePeinture(noms[palette] ?? palette, liste), 'alerte'));
}

/** La confirmation qui nomme les calques étrangers de chaque cadre, et ses deux gestes (D-H). */
function confirmationDesEtrangers(
  cadres: readonly { readonly palette: string; readonly calques: readonly { readonly nom: string }[] }[],
  noms: { readonly [id: string]: string },
  gestes: GestesDuResultat,
): HTMLDivElement {
  const bloc = document.createElement('div');
  bloc.className = 'confirmation';
  const lignes = document.createElement('div');
  lignes.className = 'confirmation-gestes';
  lignes.append(
    createButton({ label: TEXTES_DU_DESSIN.redessinerQuandMeme, onClick: () => gestes.confirmerEtrangers() }),
    createButton({ label: TEXTES_DU_DESSIN.annuler, variant: 'secondary', onClick: () => gestes.renoncer() }),
  );
  bloc.append(
    ...cadres.map(({ palette, calques }) => blocDeConstat(constatDesCalquesEtrangers(noms[palette] ?? palette, calques.map(({ nom }) => nom)), 'alerte')),
    lignes,
  );
  return bloc;
}

/**
 * Le résultat d'un dessin en mots, avec son geste ; `null` au repos et pendant
 * le dessin. Un résultat réussi se lit dans l'état du cadre de chaque palette,
 * relu après le dessin, avec « Afficher dans Figma » (E18) : il ne garde ici
 * qu'un point à vérifier par palette peinte autrement que l'aperçu. Un échec
 * est un blocage.
 */
export function blocDuResultat(etat: EtatDuDessin, noms: { readonly [id: string]: string }, gestes: GestesDuResultat): HTMLElement | null {
  if (etat.phase !== 'fini') return null;
  const { resultat } = etat;
  if (resultat.issue === 'etrangers') return confirmationDesEtrangers(resultat.cadres, noms, gestes);
  if (resultat.issue === 'dessinee') {
    // Réussi, le dessin se lit dans l'état du cadre, relu après lui ; seuls ses écarts de peinture restent ici.
    if (etat.ecarts.length === 0) return null;
    const pile = document.createElement('div');
    pile.className = 'page-stack';
    pile.append(...noticesDesEcarts(etat.ecarts, noms));
    return pile;
  }
  if (resultat.issue === 'sans-recette') return null;
  const nom = (id: string) => noms[id] ?? id;
  if (resultat.issue === 'suivi-futur') return blocDeConstat(suiviFutur(), 'bloquant');
  if (resultat.issue === 'interrompue') {
    const rang = etat.demandees.indexOf(resultat.palette);
    const creees = rang > 0 ? etat.demandees.slice(0, rang) : [];
    const restantes = rang >= 0 ? etat.demandees.slice(rang + 1) : [];
    const bloc = blocDeConstat(dessinInterrompu(nom(resultat.palette), resultat.message, creees.map(nom), restantes.map(nom)), 'bloquant');
    bloc.append(createButton({ label: TEXTES_DU_DESSIN.reessayer, onClick: () => gestes.reessayer() }));
    return bloc;
  }
  const constat = resultat.issue === 'police'
    ? policeIndisponible(resultat.style)
    : resultat.issue === 'lecture-impossible'
      ? lectureImpossible(resultat.palettes.map(nom))
      : dessinSurUneAutreRecette();
  const bloc = blocDeConstat(constat, 'bloquant');
  bloc.append(resultat.issue === 'police'
    ? createButton({ label: TEXTES_DU_DESSIN.reessayer, onClick: () => gestes.reessayer() })
    : createButton({ label: resultat.issue === 'lecture-impossible' ? TEXTES_DU_DESSIN.actualiser : TEXTES.recharger, onClick: () => gestes.recharger() }));
  return bloc;
}
