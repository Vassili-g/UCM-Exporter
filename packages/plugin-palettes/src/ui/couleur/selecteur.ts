/**
 * Le sélecteur de couleur embarqué (W4.1, maquette W3.1) : une zone de
 * saturation et de luminosité, un curseur de teinte, le code en Hex à chaque
 * ouverture, puis les pastilles que le contrôle propose. Il remplace le
 * sélecteur du navigateur, qui s'ouvre en RGB dans Figma.
 *
 * Un seul sélecteur existe dans la page. Il s'ouvre sous le contrôle qui
 * l'appelle, par-dessus le contenu, et le contrôle garde la couleur : le
 * sélecteur ne fait que lui rendre des saisies. Un glisser prévisualise et sa
 * fin enregistre, comme les curseurs (V9.9) ; un code s'enregistre à Entrée ou
 * à la sortie du champ, et un code invalide reste dans son champ.
 */
import { ecrireHexa, lireHexa, type Rgb8 } from 'ucm-couleur';

import { TEXTES_DU_SELECTEUR } from '../textes';
import { FORMATS_DE_CODE, deplacer, ecrireCode, hsvVersRgb8, lireCode, positionDe, type FormatDeCode, type Hsv } from './formats';

export interface PastilleProposee {
  readonly hexa: string;
  readonly titre: string;
}

export interface OuvertureDuSelecteur {
  /** Le contrôle qui ouvre le sélecteur : il le place, et reprend le focus à Échap. */
  readonly ancre: HTMLElement;
  readonly hexa: string;
  /** Le nom accessible du sélecteur : ce qu'il règle. */
  readonly etiquette: string;
  /** Une ligne sous le code, comme la mention du fond commun. */
  readonly mention?: string;
  readonly titreDesPastilles?: string;
  readonly pastilles?: readonly PastilleProposee[];
  /** Une couleur choisie, en `#RRGGBB` ; `fin` à la fin du geste. */
  saisir(hexa: string, fin: boolean): void;
}

/** La largeur de la maquette W3.1, et l'écart au contrôle. */
const LARGEUR = 232;
const ECART = 4;
const MARGE = 8;

const bornerA = (valeur: number, min: number, max: number): number => Math.min(max, Math.max(min, valeur));

let instance: ReturnType<typeof creer> | null = null;

/** Le sélecteur de la page, créé à la première ouverture. */
function selecteur(): ReturnType<typeof creer> {
  instance ??= creer();
  return instance;
}

/** Ouvre le sélecteur sous `ouverture.ancre` ; un second clic sur le même contrôle le referme. */
export function ouvrirLeSelecteur(ouverture: OuvertureDuSelecteur): void {
  selecteur().basculer(ouverture);
}

/** Recale la couleur montrée quand la valeur change ailleurs, sauf pendant un geste dans le sélecteur. */
export function suivreLaCouleur(ancre: HTMLElement, hexa: string): void {
  instance?.suivre(ancre, hexa);
}

export function fermerLeSelecteur(): void {
  instance?.fermer(false);
}

export interface PipetteUi {
  readonly bouton: HTMLButtonElement;
  /** Peint la pastille de la couleur relue, et la suit dans le sélecteur ouvert. */
  poser(hexa: string): void;
}

/**
 * La pastille carrée à gauche d'un code de couleur : un bouton qui ouvre le
 * sélecteur. `ouvrir` donne ce que le sélecteur propose au moment du clic.
 */
export function createPipette(etiquette: string, ouvrir: (bouton: HTMLButtonElement) => Omit<OuvertureDuSelecteur, 'ancre' | 'etiquette'> | null): PipetteUi {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'pipette';
  bouton.setAttribute('aria-label', etiquette);
  bouton.setAttribute('aria-haspopup', 'dialog');
  bouton.setAttribute('aria-expanded', 'false');
  const teinte = document.createElement('span');
  teinte.className = 'pipette-teinte';
  teinte.setAttribute('aria-hidden', 'true');
  bouton.append(teinte);
  bouton.addEventListener('click', () => {
    const demande = ouvrir(bouton);
    if (demande) ouvrirLeSelecteur({ ...demande, ancre: bouton, etiquette });
  });
  return {
    bouton,
    poser(hexa) {
      const lue = lireHexa(hexa);
      teinte.style.background = lue ? ecrireHexa(lue) : 'transparent';
      if (lue) suivreLaCouleur(bouton, ecrireHexa(lue));
    },
  };
}

function creer() {
  const element = document.createElement('div');
  element.className = 'selecteur-de-couleur';
  element.setAttribute('role', 'dialog');
  element.hidden = true;

  const zone = document.createElement('div');
  zone.className = 'selecteur-zone';
  zone.tabIndex = 0;
  zone.setAttribute('role', 'slider');
  zone.setAttribute('aria-label', TEXTES_DU_SELECTEUR.zone);
  const repereDeZone = document.createElement('div');
  repereDeZone.className = 'selecteur-repere';
  zone.append(repereDeZone);

  const teinte = document.createElement('div');
  teinte.className = 'selecteur-teinte';
  teinte.tabIndex = 0;
  teinte.setAttribute('role', 'slider');
  teinte.setAttribute('aria-label', TEXTES_DU_SELECTEUR.teinte);
  teinte.setAttribute('aria-valuemin', '0');
  teinte.setAttribute('aria-valuemax', '359');
  const repereDeTeinte = document.createElement('div');
  repereDeTeinte.className = 'selecteur-repere';
  teinte.append(repereDeTeinte);

  const menuDeFormat = document.createElement('select');
  menuDeFormat.className = 'selecteur-format';
  menuDeFormat.setAttribute('aria-label', TEXTES_DU_SELECTEUR.format);
  for (const format of FORMATS_DE_CODE) {
    const option = document.createElement('option');
    option.value = format;
    option.textContent = TEXTES_DU_SELECTEUR.formats[format];
    menuDeFormat.append(option);
  }
  const champsDuCode = document.createElement('div');
  champsDuCode.className = 'selecteur-code';
  const ligneDuCode = document.createElement('div');
  ligneDuCode.className = 'selecteur-ligne';
  ligneDuCode.append(menuDeFormat, champsDuCode);

  const mention = document.createElement('p');
  mention.className = 'selecteur-mention ligne-secondaire';
  const separation = document.createElement('div');
  separation.className = 'selecteur-separation';
  const titreDesPastilles = document.createElement('p');
  titreDesPastilles.className = 'selecteur-titre ligne-secondaire';
  const pastilles = document.createElement('div');
  pastilles.className = 'selecteur-pastilles';
  element.append(zone, teinte, ligneDuCode, mention, separation, titreDesPastilles, pastilles);
  document.body.append(element);

  let ouverture: OuvertureDuSelecteur | null = null;
  let position: Hsv = { h: 0, s: 0, v: 0 };
  let format: FormatDeCode = 'hex';
  let champs: HTMLInputElement[] = [];
  /** Vrai pendant un glisser : une valeur relue ailleurs ne déplace pas le repère sous le pointeur. */
  let glisse = false;
  let boutonsDesPastilles: { hexa: string; bouton: HTMLButtonElement }[] = [];

  const couleur = (): Rgb8 => hsvVersRgb8(position);

  function peindre(): void {
    const { h, s, v } = position;
    zone.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h.toFixed(1)}, 100%, 50%))`;
    repereDeZone.style.left = `${(s * 100).toFixed(2)}%`;
    repereDeZone.style.top = `${((1 - v) * 100).toFixed(2)}%`;
    repereDeZone.style.background = ecrireHexa(couleur());
    repereDeTeinte.style.left = `${((h / 360) * 100).toFixed(2)}%`;
    repereDeTeinte.style.background = `hsl(${h.toFixed(1)}, 100%, 50%)`;
    zone.setAttribute('aria-valuetext', TEXTES_DU_SELECTEUR.valeurDeLaZone(Math.round(s * 100), Math.round(v * 100)));
    teinte.setAttribute('aria-valuenow', String(Math.round(h) % 360));
    teinte.setAttribute('aria-valuetext', TEXTES_DU_SELECTEUR.valeurDeLaTeinte(Math.round(h) % 360));
    const hexa = ecrireHexa(couleur());
    for (const { hexa: proposee, bouton } of boutonsDesPastilles) bouton.setAttribute('aria-pressed', String(proposee === hexa));
  }

  /** Réécrit les champs du code. Pendant une frappe, aucun ne se réécrit : le designer lit ce qu'il tape. */
  function ecrireLesChamps(): void {
    const valeurs = ecrireCode(format, couleur());
    champs.forEach((champ, rang) => {
      champ.value = valeurs[rang];
      champ.removeAttribute('aria-invalid');
    });
  }

  function batirLesChamps(): void {
    champs = TEXTES_DU_SELECTEUR.champs[format].map((etiquette) => {
      const champ = document.createElement('input');
      champ.type = 'text';
      champ.className = 'input selecteur-champ';
      champ.spellcheck = false;
      champ.setAttribute('aria-label', etiquette);
      champ.addEventListener('input', () => saisirLeCode(false));
      champ.addEventListener('change', () => saisirLeCode(true));
      return champ;
    });
    champsDuCode.dataset.format = format;
    champsDuCode.replaceChildren(...champs);
    ecrireLesChamps();
  }

  /** Une frappe prévisualise un code complet ; la validation l'enregistre, ou marque le champ invalide. */
  function saisirLeCode(fin: boolean): void {
    const lue = lireCode(format, champs.map((champ) => champ.value));
    for (const champ of champs) champ.setAttribute('aria-invalid', String(fin && lue === null));
    if (!lue) return;
    position = positionDe(lue, position);
    peindre();
    if (fin) ecrireLesChamps();
    ouverture?.saisir(ecrireHexa(lue), fin);
  }

  /** Une position posée par la zone, le curseur ou le clavier. */
  function poser(suivante: Hsv, fin: boolean): void {
    position = suivante;
    peindre();
    ecrireLesChamps();
    ouverture?.saisir(ecrireHexa(couleur()), fin);
  }

  function suivrePointeur(commande: HTMLElement, lire: (x: number, y: number) => Hsv): void {
    const depuis = (evenement: PointerEvent): Hsv => {
      const cadre = commande.getBoundingClientRect();
      return lire(bornerA((evenement.clientX - cadre.left) / cadre.width, 0, 1), bornerA((evenement.clientY - cadre.top) / cadre.height, 0, 1));
    };
    commande.addEventListener('pointerdown', (evenement) => {
      if (evenement.button !== 0) return;
      evenement.preventDefault();
      commande.focus({ preventScroll: true });
      commande.setPointerCapture(evenement.pointerId);
      glisse = true;
      poser(depuis(evenement), false);
    });
    commande.addEventListener('pointermove', (evenement) => {
      if (glisse && commande.hasPointerCapture(evenement.pointerId)) poser(depuis(evenement), false);
    });
    const finir = (evenement: PointerEvent): void => {
      if (!glisse) return;
      glisse = false;
      poser(depuis(evenement), true);
    };
    commande.addEventListener('pointerup', finir);
    commande.addEventListener('pointercancel', finir);
  }
  suivrePointeur(zone, (x, y) => ({ h: position.h, s: x, v: 1 - y }));
  suivrePointeur(teinte, (x) => ({ ...position, h: Math.min(x * 360, 359.9) }));

  // Flèches : 1 %, ou 1°, et dix fois plus avec Maj ; chaque pression est un geste fini.
  zone.addEventListener('keydown', (evenement) => {
    const pas = evenement.shiftKey ? 0.1 : 0.01;
    const deplacements: Record<string, [axe: 's' | 'v', pas: number]> = {
      ArrowLeft: ['s', -pas],
      ArrowRight: ['s', pas],
      ArrowUp: ['v', pas],
      ArrowDown: ['v', -pas],
    };
    const deplacement = deplacements[evenement.key];
    if (!deplacement) return;
    evenement.preventDefault();
    poser(deplacer(position, ...deplacement), true);
  });
  teinte.addEventListener('keydown', (evenement) => {
    const pas = evenement.shiftKey ? 10 : 1;
    const deplacements: Record<string, number> = { ArrowLeft: -pas, ArrowDown: -pas, ArrowRight: pas, ArrowUp: pas };
    if (evenement.key === 'Home' || evenement.key === 'End') {
      evenement.preventDefault();
      poser({ ...position, h: evenement.key === 'Home' ? 0 : 359 }, true);
      return;
    }
    if (!(evenement.key in deplacements)) return;
    evenement.preventDefault();
    poser(deplacer({ ...position, h: Math.round(position.h) }, 'h', deplacements[evenement.key]), true);
  });

  menuDeFormat.addEventListener('change', () => {
    format = menuDeFormat.value as FormatDeCode;
    batirLesChamps();
  });

  // Échap referme et rend le focus au contrôle, sans laisser la touche au reste de l'interface.
  element.addEventListener('keydown', (evenement) => {
    if (evenement.key !== 'Escape') return;
    evenement.preventDefault();
    evenement.stopPropagation();
    fermer(true);
  });
  // Un clic hors du sélecteur et de son contrôle le referme ; le focus reste où le clic l'a mis.
  document.addEventListener('pointerdown', (evenement) => {
    const cible = evenement.target as Node | null;
    if (!ouverture || !cible || element.contains(cible) || ouverture.ancre.contains(cible)) return;
    fermer(false);
  }, true);
  // Le focus qui sort par Tab le referme aussi.
  element.addEventListener('focusout', (evenement) => {
    const suivant = evenement.relatedTarget as Node | null;
    if (!ouverture || !suivant || element.contains(suivant)) return;
    fermer(false);
  });
  const replacer = (): void => { if (ouverture) placer(ouverture.ancre); };
  window.addEventListener('resize', replacer);
  document.addEventListener('scroll', replacer, true);

  /**
   * Sous le contrôle, aligné sur son bord gauche, ou sur son bord droit quand
   * la fenêtre est trop étroite ; au-dessus quand la place manque dessous et
   * qu'elle existe dessus.
   */
  function placer(ancre: HTMLElement): void {
    const cadre = ancre.getBoundingClientRect();
    const hauteur = element.offsetHeight;
    const largeurUtile = document.documentElement.clientWidth;
    const gauche = cadre.left + LARGEUR + MARGE <= largeurUtile ? cadre.left : cadre.right - LARGEUR;
    const dessous = cadre.bottom + ECART + hauteur <= window.innerHeight || cadre.top - ECART - hauteur < 0;
    const haut = dessous ? cadre.bottom + ECART : cadre.top - ECART - hauteur;
    element.style.left = `${Math.round(bornerA(gauche, MARGE, largeurUtile - LARGEUR - MARGE) + window.scrollX)}px`;
    element.style.top = `${Math.round(haut + window.scrollY)}px`;
  }

  function batirLesPastilles(liste: readonly PastilleProposee[]): void {
    boutonsDesPastilles = liste.flatMap(({ hexa, titre }) => {
      const lue = lireHexa(hexa);
      if (!lue) return [];
      const normalise = ecrireHexa(lue);
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'selecteur-pastille';
      bouton.style.background = normalise;
      bouton.title = TEXTES_DU_SELECTEUR.pastille(titre, normalise);
      bouton.setAttribute('aria-label', TEXTES_DU_SELECTEUR.pastille(titre, normalise));
      bouton.addEventListener('click', () => {
        position = positionDe(lue, position);
        peindre();
        ecrireLesChamps();
        ouverture?.saisir(normalise, true);
      });
      return [{ hexa: normalise, bouton }];
    });
    pastilles.replaceChildren(...boutonsDesPastilles.map(({ bouton }) => bouton));
  }

  function ouvrir(suivante: OuvertureDuSelecteur): void {
    if (ouverture) ouverture.ancre.setAttribute('aria-expanded', 'false');
    ouverture = suivante;
    const lue = lireHexa(suivante.hexa) ?? [0, 0, 0];
    position = positionDe(lue);
    format = 'hex';
    menuDeFormat.value = format;
    element.setAttribute('aria-label', suivante.etiquette);
    mention.textContent = suivante.mention ?? '';
    mention.hidden = !suivante.mention;
    const avecPastilles = (suivante.pastilles?.length ?? 0) > 0;
    titreDesPastilles.textContent = suivante.titreDesPastilles ?? '';
    separation.hidden = !avecPastilles;
    titreDesPastilles.hidden = !avecPastilles;
    pastilles.hidden = !avecPastilles;
    batirLesPastilles(suivante.pastilles ?? []);
    batirLesChamps();
    peindre();
    element.hidden = false;
    suivante.ancre.setAttribute('aria-expanded', 'true');
    placer(suivante.ancre);
    champs[0].focus({ preventScroll: true });
    champs[0].select();
  }

  function fermer(rendreLeFocus: boolean): void {
    if (!ouverture) return;
    const { ancre } = ouverture;
    ouverture = null;
    glisse = false;
    element.hidden = true;
    ancre.setAttribute('aria-expanded', 'false');
    if (rendreLeFocus) ancre.focus({ preventScroll: true });
  }

  return {
    basculer(suivante: OuvertureDuSelecteur): void {
      if (ouverture?.ancre === suivante.ancre) fermer(true);
      else ouvrir(suivante);
    },
    suivre(ancre: HTMLElement, hexa: string): void {
      if (ouverture?.ancre !== ancre || glisse || champs.includes(document.activeElement as HTMLInputElement)) return;
      const lue = lireHexa(hexa);
      if (!lue) return;
      position = positionDe(lue, position);
      peindre();
      ecrireLesChamps();
    },
    fermer,
  };
}
