/**
 * L'éditeur de dérive (section 12), déplié sous sa ligne par « Régler » (E22).
 *
 * Il règle les deux bouts de la dérive par trois chemins liés : la poignée du
 * graphe, le champ numérique et la réglette ([DER-07] à [DER-10]). Le
 * préréglage et le lien des profils s'y choisissent ([DER-11], [DER-12]).
 * Pendant un glisser, l'aperçu suit sans rien ranger ; le relâchement range
 * (D-D). Ctrl+Z ou Cmd+Z défait le dernier réglage quand le focus est dans
 * l'éditeur, hors d'un champ texte : cinquante réglages, sans rétablissement
 * (E21).
 */
import {
  boutsDe,
  ecrireArrondi,
  referenceDe,
  rgb8VersOklch,
  teinteA,
  type Ancrage,
  type Palette,
  type Profil,
  type Rampes,
  type Recette,
} from 'ucm-couleur';

import { lireNombre } from '../../configuration';
import { appliquerPrereglage, lierLesProfils, prereglageDe, reglerBout } from '../../edition';
import type { AnalyseDePalette } from '../../analyse';
import { TEXTES_DE_LA_DERIVE, repereTailwind, valeurDePoignee } from '../textes';
import { CADRE, HAUTEUR_TOTALE, createGraphe } from './graphe';
import { angleDuGlisser, echelleDe } from './geometrie';

/** Ce que l'éditeur demande à l'onglet. */
export interface GestesDeLEditeur {
  /** Pendant un geste : l'aperçu suit, rien ne se range. */
  previsualiser(palette: Palette): void;
  /** À la fin d'un geste : la palette se range. */
  valider(palette: Palette): void;
}

export interface EditeurUi {
  element: HTMLDivElement;
  /** Les rampes ancrées de la palette et son ancrage ([MOT-17]) : la rampe Light du profil réglé se peint sous la bande. */
  afficher(recette: Recette, palette: Palette, rampes: Rampes, ancrage: Ancrage, analyse: AnalyseDePalette): void;
  /** Focalise le premier réglage de l'éditeur déplié, quand un message y mène ([VER-15]). */
  focaliser(): void;
}

type Bout = 'clair' | 'sombre';
const BOUTS: readonly Bout[] = ['clair', 'sombre'];
/** La profondeur de la pile d'annulation (E21). */
const PROFONDEUR = 50;

interface Reglette {
  ligne: HTMLDivElement;
  champ: HTMLInputElement;
  curseur: HTMLInputElement;
  repere: HTMLSpanElement;
}

function bouton(texte: string, classe: 'bouton-discret' | 'bascule-option'): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  if (classe === 'bouton-discret') element.className = 'bouton-discret';
  else element.className = 'bascule-option';
  element.textContent = texte;
  return element;
}

export function createEditeur(gestes: GestesDeLEditeur): EditeurUi {
  const element = document.createElement('div');
  element.className = 'editeur-derive';

  let recette: Recette | null = null;
  let palette: Palette | null = null;
  let profil: Profil = 'vivid';
  let confirmationOuverte = false;
  /** La palette d'avant le geste en cours : glisser, réglette ou champ. */
  let avantLeGeste: Palette | null = null;
  const pile: Palette[] = [];

  function empiler(avant: Palette): void {
    pile.push(avant);
    if (pile.length > PROFONDEUR) pile.shift();
  }

  /** Un geste fini : la palette d'avant entre dans la pile, la nouvelle se range. */
  function terminer(suivante: Palette): void {
    const avant = avantLeGeste ?? palette;
    avantLeGeste = null;
    if (!avant || JSON.stringify(avant.derive) === JSON.stringify(suivante.derive)) return;
    empiler(avant);
    gestes.valider(suivante);
  }

  function regler(bout: Bout, angle: number, fin: boolean): void {
    if (!recette || !palette) return;
    if (!fin && !avantLeGeste) avantLeGeste = palette;
    const suivante = reglerBout(recette, palette, profil, bout, angle);
    if (fin) terminer(suivante);
    else gestes.previsualiser(suivante);
  }

  // En-tête : préréglage, lien des profils, profil réglé quand ils sont déliés.
  const entete = document.createElement('div');
  entete.className = 'editeur-entete';
  const choixDuPrereglage = document.createElement('select');
  choixDuPrereglage.className = 'input champ-prereglage';
  choixDuPrereglage.setAttribute('aria-label', TEXTES_DE_LA_DERIVE.prereglage);
  for (const [valeur, texte] of [['tailwind', TEXTES_DE_LA_DERIVE.tailwind], ['constante', TEXTES_DE_LA_DERIVE.constante], ['libre', TEXTES_DE_LA_DERIVE.libre]]) {
    const option = document.createElement('option');
    option.value = valeur;
    option.textContent = texte;
    // « Libre » s'affiche dès qu'une valeur s'écarte du préréglage ; il ne se choisit pas ([DER-11]).
    option.disabled = valeur === 'libre';
    choixDuPrereglage.append(option);
  }
  choixDuPrereglage.addEventListener('change', () => {
    if (!recette || !palette) return;
    const choisi = choixDuPrereglage.value;
    if (choisi === 'tailwind' || choisi === 'constante') terminer(appliquerPrereglage(recette, palette, profil, choisi));
  });
  // Synchroniser se coche : l'état se lit sur la case, et la recocher confirme avant de remplacer soft ([DER-12]).
  const lien = document.createElement('input');
  lien.type = 'checkbox';
  lien.className = 'case-a-cocher';
  const etiquetteDuLien = document.createElement('label');
  etiquetteDuLien.className = 'champ-ligne';
  const texteDuLien = document.createElement('span');
  texteDuLien.textContent = TEXTES_DE_LA_DERIVE.lien;
  etiquetteDuLien.append(lien, texteDuLien);
  lien.addEventListener('change', () => {
    if (!palette) return;
    if (lien.checked) {
      const { soft, vivid } = palette.derive;
      const egales = soft.clair === vivid.clair && soft.sombre === vivid.sombre && soft.origine === vivid.origine;
      if (egales) terminer(lierLesProfils(palette, true));
      else {
        lien.checked = false;
        confirmationOuverte = true;
        dessiner();
      }
      return;
    }
    terminer(lierLesProfils(palette, false));
  });
  const profils = document.createElement('div');
  profils.className = 'bascule';
  profils.setAttribute('role', 'group');
  profils.setAttribute('aria-label', TEXTES_DE_LA_DERIVE.profilRegle);
  const boutonsDeProfil = (['soft', 'vivid'] as const).map((valeur) => {
    const choix = bouton(valeur, 'bascule-option');
    choix.addEventListener('click', () => {
      profil = valeur;
      dessiner();
    });
    profils.append(choix);
    return { valeur, choix };
  });
  entete.append(choixDuPrereglage, etiquetteDuLien, profils);

  const confirmation = document.createElement('div');
  confirmation.className = 'confirmation';
  const texteDeConfirmation = document.createElement('p');
  texteDeConfirmation.textContent = TEXTES_DE_LA_DERIVE.confirmationDuLien;
  const gestesDeConfirmation = document.createElement('div');
  gestesDeConfirmation.className = 'confirmation-gestes';
  const aligner = bouton(TEXTES_DE_LA_DERIVE.aligner, 'bouton-discret');
  aligner.addEventListener('click', () => {
    confirmationOuverte = false;
    if (palette) terminer(lierLesProfils(palette, true));
  });
  const renoncer = bouton(TEXTES_DE_LA_DERIVE.annuler, 'bouton-discret');
  renoncer.addEventListener('click', () => {
    confirmationOuverte = false;
    dessiner();
  });
  gestesDeConfirmation.append(aligner, renoncer);
  confirmation.append(texteDeConfirmation, gestesDeConfirmation);

  // Le graphe : glisser, double-clic et clavier sur les poignées.
  const graphe = createGraphe();
  const svg = graphe.element;
  let glisse: { bout: Bout; pointeur: number } | null = null;
  /** L'échelle figée pendant un glisser : la poignée ne saute pas sous le pointeur ([DER-01]). */
  let echelleFigee: number | null = null;
  const echelleCourante = (): number => echelleFigee ?? (palette
    ? echelleDe([palette.derive.soft.clair, palette.derive.soft.sombre, palette.derive.vivid.clair, palette.derive.vivid.sombre])
    : 90);
  /** La capture du pointeur fait viser le SVG aux clics suivants : le double-clic lit le bout pressé. */
  let boutPresse: Bout | null = null;
  const boutDe = (cible: EventTarget | null): Bout | null => {
    const poignee = (cible as Element | null)?.closest?.('.derive-poignee') as SVGGElement | null;
    const bout = poignee?.dataset.bout;
    return bout === 'clair' || bout === 'sombre' ? bout : null;
  };
  const ordonneeDuPointeur = (evenement: PointerEvent): number => {
    const cadre = svg.getBoundingClientRect();
    return (evenement.clientY - cadre.top) * (HAUTEUR_TOTALE / cadre.height);
  };
  svg.addEventListener('pointerdown', (evenement) => {
    const bout = boutDe(evenement.target);
    if (!bout) return;
    evenement.preventDefault();
    // Le graphe se redessine à chaque mouvement : la capture tient sur le SVG, pas sur la poignée.
    svg.setPointerCapture(evenement.pointerId);
    echelleFigee = echelleCourante();
    glisse = { bout, pointeur: evenement.pointerId };
    boutPresse = bout;
    avantLeGeste = palette;
  });
  svg.addEventListener('pointermove', (evenement) => {
    if (!glisse || evenement.pointerId !== glisse.pointeur) return;
    regler(glisse.bout, angleDuGlisser(ordonneeDuPointeur(evenement), CADRE, evenement.shiftKey ? 5 : 1, echelleCourante()), false);
  });
  const relacher = (evenement: PointerEvent) => {
    if (!glisse || evenement.pointerId !== glisse.pointeur) return;
    glisse = null;
    echelleFigee = null;
    if (palette) terminer(palette);
  };
  svg.addEventListener('pointerup', relacher);
  svg.addEventListener('pointercancel', relacher);
  svg.addEventListener('dblclick', (evenement) => {
    const bout = boutDe(evenement.target) ?? boutPresse;
    if (bout && recette && palette) regler(bout, prereglageDe(recette, palette)[bout], true);
  });
  svg.addEventListener('keydown', (evenement) => {
    const bout = boutDe(evenement.target);
    if (!bout || !palette) return;
    const actuel = palette.derive[profil][bout];
    const pas = evenement.shiftKey ? 5 : 1;
    // Origine et Fin gardent le sens du motif clavier d'un curseur : le minimum et le maximum (E20).
    const cibles: Record<string, number> = {
      ArrowUp: actuel + pas,
      ArrowRight: actuel + pas,
      ArrowDown: actuel - pas,
      ArrowLeft: actuel - pas,
      Home: -90,
      End: 90,
    };
    const cible = cibles[evenement.key];
    if (cible === undefined) return;
    evenement.preventDefault();
    regler(bout, cible, true);
  });

  // Les réglettes : un champ numérique et un curseur par bout, liés au graphe ([DER-08]).
  const reglettes = {} as Record<Bout, Reglette>;
  const zoneDesReglettes = document.createElement('div');
  zoneDesReglettes.className = 'reglettes';
  for (const bout of BOUTS) {
    const ligne = document.createElement('div');
    ligne.className = 'reglette';
    const libelle = document.createElement('span');
    libelle.className = 'field-label';
    libelle.textContent = TEXTES_DE_LA_DERIVE.bout[bout];
    const champ = document.createElement('input');
    champ.type = 'text';
    champ.inputMode = 'decimal';
    champ.className = 'input champ-nombre';
    champ.setAttribute('aria-label', TEXTES_DE_LA_DERIVE.deriveAuBout[bout]);
    champ.addEventListener('input', () => {
      const valeur = lireNombre(champ.value);
      if (valeur !== null) regler(bout, valeur, false);
    });
    champ.addEventListener('change', () => {
      const valeur = lireNombre(champ.value);
      if (valeur !== null) regler(bout, valeur, true);
    });
    const piste = document.createElement('span');
    piste.className = 'reglette-piste';
    const curseur = document.createElement('input');
    curseur.type = 'range';
    curseur.min = '-90';
    curseur.max = '90';
    curseur.step = '1';
    curseur.className = 'reglette-curseur';
    curseur.setAttribute('aria-label', TEXTES_DE_LA_DERIVE.deriveAuBout[bout]);
    curseur.addEventListener('input', () => regler(bout, Number(curseur.value), false));
    curseur.addEventListener('change', () => regler(bout, Number(curseur.value), true));
    curseur.addEventListener('keydown', (evenement) => {
      // Le curseur natif avance d'un degré ; Maj le fait avancer de cinq ([DER-09]).
      if (!evenement.shiftKey || !palette) return;
      const sens = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[evenement.key];
      if (!sens) return;
      evenement.preventDefault();
      regler(bout, palette.derive[profil][bout] + 5 * sens, true);
    });
    const repere = document.createElement('span');
    repere.className = 'reglette-repere';
    piste.append(curseur, repere);
    const tailwind = bouton(TEXTES_DE_LA_DERIVE.tailwind, 'bouton-discret');
    tailwind.setAttribute('aria-label', TEXTES_DE_LA_DERIVE.ramenerAuPrereglage[bout]);
    tailwind.addEventListener('click', () => {
      if (recette && palette) regler(bout, prereglageDe(recette, palette)[bout], true);
    });
    ligne.append(libelle, champ, piste, tailwind);
    zoneDesReglettes.append(ligne);
    reglettes[bout] = { ligne, champ, curseur, repere };
  }

  const note = document.createElement('p');
  note.className = 'ligne-secondaire';

  element.append(entete, confirmation, svg, zoneDesReglettes, note);

  // Ctrl+Z ou Cmd+Z défait le dernier réglage, hors d'un champ texte (E21).
  element.addEventListener('keydown', (evenement) => {
    if (!(evenement.ctrlKey || evenement.metaKey) || evenement.key.toLowerCase() !== 'z') return;
    const cible = evenement.target as HTMLElement;
    if (cible instanceof HTMLInputElement && cible.type === 'text') return;
    evenement.preventDefault();
    const precedente = pile.pop();
    if (precedente) gestes.valider(precedente);
  });

  let rampes: Rampes | null = null;
  let analyse: AnalyseDePalette | null = null;
  let ancrage: Ancrage | null = null;

  function dessiner(): void {
    if (!recette || !palette || !rampes || !ancrage) return;
    const focalisee = boutDe(document.activeElement);
    const lie = palette.derive.lien;
    // Synchronisés, les deux profils se règlent ensemble : l'éditeur montre le porteur de la référence.
    if (lie) profil = ancrage.profil;
    if (!analyse) return;
    graphe.afficher({ recette, palette, profil, rampe: rampes[profil].light, ancrage, grille: analyse.grille, echelle: echelleCourante() });
    // Le graphe s'est redessiné : la poignée qui avait le focus le reprend.
    if (focalisee) graphe.poignees()[focalisee]?.focus();

    const derive = palette.derive[profil];
    choixDuPrereglage.value = derive.origine;
    lien.checked = lie;
    profils.hidden = lie;
    for (const { valeur, choix } of boutonsDeProfil) choix.setAttribute('aria-pressed', String(valeur === profil));
    confirmation.hidden = !confirmationOuverte;

    const reference = rgb8VersOklch(referenceDe(palette));
    const bouts = boutsDe(recette);
    const tailwind = prereglageDe(recette, palette);
    // Un segment se juge sur les bouts de la dérive, aux numéros 50 et 950, et non sur les extrémités de la liste (W6).
    const sansSegment: Record<Bout, boolean> = { clair: reference.L > bouts.clair, sombre: reference.L < bouts.sombre };
    for (const bout of BOUTS) {
      const { ligne, champ, curseur, repere } = reglettes[bout];
      // Un bout que la référence dépasse n'a pas de segment à régler ([DER-14]).
      ligne.hidden = sansSegment[bout];
      if (document.activeElement !== champ) champ.value = ecrireArrondi(derive[bout], 1);
      if (document.activeElement !== curseur) curseur.value = String(Math.round(derive[bout]));
      const teinte = teinteA(bouts[bout], reference, derive, bouts);
      curseur.setAttribute('aria-valuetext', valeurDePoignee(derive[bout], teinte));
      // Le repère Tailwind reste visible même quand la dérive est libre ([DER-06]).
      repere.style.left = `${((tailwind[bout] + 90) / 180) * 100}%`;
      repere.title = repereTailwind(tailwind[bout]);
    }
    note.textContent = sansSegment.clair
      ? TEXTES_DE_LA_DERIVE.sansSegmentClair
      : sansSegment.sombre ? TEXTES_DE_LA_DERIVE.sansSegmentSombre : '';
    note.hidden = note.textContent === '';
  }

  return {
    element,
    focaliser() {
      choixDuPrereglage.focus();
    },
    afficher(recetteLue, paletteLue, rampesLues, ancrageLu, analyseLue) {
      analyse = analyseLue;
      if (palette && paletteLue.id !== palette.id) confirmationOuverte = false;
      recette = recetteLue;
      palette = paletteLue;
      rampes = rampesLues;
      ancrage = ancrageLu;
      dessiner();
    },
  };
}
