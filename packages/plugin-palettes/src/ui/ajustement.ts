/**
 * Le panneau « Ajuster la référence » (W7), dans la carte « Configuration de
 * la palette » : l'originale et la proposition côte à côte, un pas de 0,01 de
 * luminosité OKLCH vers le sombre ou le clair, chroma et teinte gardées, le
 * code de la proposition saisissable, la nuance visée dans chaque thème et
 * les garanties avant et après, avec leur niveau WCAG.
 *
 * Rien ne change à l'ouverture ni pendant les pas : seul « Appliquer » rend
 * la proposition, que l'onglet applique à la palette courante. « Annuler » et Échap referment sans rien écrire, et
 * rendent le focus au lien qui a ouvert le panneau. Un pas qui changerait le
 * numéro de la référence l'annonce sous son bouton, avant le clic.
 */
import { associationDe, ecrireArrondi, etatDeLaPaire, lireHexa, rgb8VersOklch, type Palette, type Recette } from 'ucm-couleur';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import {
  changementAuPasVoisin,
  garantiesComparees,
  manqueesParProfil,
  nuancesVisees,
  paletteAjustee,
  pasALOuverture,
  pasLePlusProche,
  propositionAuPas,
} from '../ajustementDeLaReference';
import { MOTIF_HEXA, originaleDe } from '../edition';
import { badgeDeNiveau } from './badge';
import {
  TEXTES_DE_L_AJUSTEMENT,
  annonceDuPas,
  associationEcrite,
  bilanDeLAjustement,
  garantieAvantApres,
  jugementDuSeuil,
  nuanceVisee,
} from './textes';

export interface AjustementUi {
  readonly element: HTMLDivElement;
  /** Ouvre le panneau sur la palette, au pas qui mène à sa référence ; `retour` reprend le focus à la fermeture. */
  ouvrir(recette: Recette, palette: Palette, retour: HTMLElement): void;
  /** Referme sans rien écrire ; le focus revient au lien qui a ouvert le panneau, sauf `rendreLeFocus` à faux. */
  fermer(rendreLeFocus?: boolean): void;
  /** La palette telle qu'à l'ouverture du panneau, `null` panneau fermé. */
  palette(): Palette | null;
}

function paragraphe(texte: string, classe = ''): HTMLParagraphElement {
  const element = document.createElement('p');
  element.textContent = texte;
  if (classe) element.className = classe;
  return element;
}

/** Une pastille et son code, sous un libellé : l'originale, puis la proposition. */
function temoin(libelle: string): { element: HTMLDivElement; poser(hexa: string): void } {
  const element = document.createElement('div');
  element.className = 'ajustement-temoin';
  const pastille = document.createElement('span');
  pastille.className = 'ajustement-pastille';
  pastille.setAttribute('aria-hidden', 'true');
  const code = paragraphe('', 'detail-code');
  element.append(paragraphe(libelle, 'libelle-de-champ'), pastille, code);
  return {
    element,
    poser(hexa) {
      pastille.style.background = hexa;
      code.textContent = hexa;
    },
  };
}

export function createAjustement(appliquer: (proposition: string) => void): AjustementUi {
  const element = document.createElement('div');
  element.className = 'ajustement';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', TEXTES_DE_L_AJUSTEMENT.titre);
  element.hidden = true;

  const titre = paragraphe(TEXTES_DE_L_AJUSTEMENT.titre);
  titre.className = 'ajustement-titre';
  const originale = temoin(TEXTES_DE_L_AJUSTEMENT.originale);
  const proposition = temoin(TEXTES_DE_L_AJUSTEMENT.proposition);
  const temoins = document.createElement('div');
  temoins.className = 'ajustement-temoins';
  temoins.append(originale.element, proposition.element);

  // Les deux pas, la luminosité entre eux, et l'annonce de chaque pas dessous.
  const plusSombre = createButton({ label: '−', variant: 'secondary', onClick: () => faireUnPas(-1) });
  plusSombre.setAttribute('aria-label', TEXTES_DE_L_AJUSTEMENT.plusSombre);
  const plusClair = createButton({ label: '+', variant: 'secondary', onClick: () => faireUnPas(1) });
  plusClair.setAttribute('aria-label', TEXTES_DE_L_AJUSTEMENT.plusClair);
  const luminosite = document.createElement('output');
  luminosite.className = 'ajustement-luminosite';
  const reglette = document.createElement('div');
  reglette.className = 'ajustement-reglette';
  reglette.append(paragraphe(TEXTES_DE_L_AJUSTEMENT.luminosite, 'libelle-de-champ'), plusSombre, luminosite, plusClair);
  const annonces = document.createElement('div');
  annonces.className = 'ajustement-annonces';
  annonces.setAttribute('aria-live', 'polite');

  const code = document.createElement('input');
  code.type = 'text';
  code.className = 'input champ-hexa';
  code.spellcheck = false;
  code.maxLength = 7;
  code.setAttribute('aria-label', TEXTES_DE_L_AJUSTEMENT.code);
  const visee = paragraphe('', 'ligne-secondaire');
  const garanties = document.createElement('div');
  garanties.className = 'ajustement-garanties';

  const gestes = document.createElement('div');
  gestes.className = 'confirmation-gestes';
  const boutonAppliquer = createButton({ label: TEXTES_DE_L_AJUSTEMENT.appliquer, onClick: () => valider() });
  gestes.append(boutonAppliquer, createButton({ label: TEXTES_DE_L_AJUSTEMENT.annuler, variant: 'secondary', onClick: () => fermer() }));

  element.append(titre, temoins, reglette, annonces, code, visee, garanties, gestes);

  let recette: Recette | null = null;
  let palette: Palette | null = null;
  let pas = 0;
  /** La proposition montrée : celle du pas, ou un code saisi dans le panneau. */
  let courante: string | null = null;
  let retour: HTMLElement | null = null;

  function faireUnPas(sens: -1 | 1): void {
    if (!recette || !palette) return;
    const suivante = propositionAuPas(recette, palette, pas + sens);
    if (!suivante) return;
    pas += sens;
    courante = suivante;
    rendre();
  }

  code.addEventListener('change', () => {
    if (!recette || !palette || !MOTIF_HEXA.test(code.value.trim())) {
      code.setAttribute('aria-invalid', 'true');
      return;
    }
    code.setAttribute('aria-invalid', 'false');
    const saisie = code.value.trim().startsWith('#') ? code.value.trim() : `#${code.value.trim()}`;
    courante = saisie.toUpperCase();
    pas = pasLePlusProche(recette, palette, courante);
    rendre();
  });

  element.addEventListener('keydown', (evenement) => {
    if (evenement.key !== 'Escape') return;
    evenement.preventDefault();
    evenement.stopPropagation();
    fermer();
  });

  function rendreLesGaranties(lue: Recette, avant: Palette, apres: Palette): void {
    // Une palette libre n'a pas de garanties : la section se tait.
    if (avant.crans !== undefined) {
      garanties.replaceChildren();
      garanties.hidden = true;
      return;
    }
    const manqueesAvant = manqueesParProfil(lue, avant);
    const manqueesApres = manqueesParProfil(lue, apres);
    const comparees = garantiesComparees(lue, avant, apres);
    garanties.hidden = false;
    const bilan = (['soft', 'vivid'] as const).map((profil) => bilanDeLAjustement(profil, manqueesAvant[profil], manqueesApres[profil])).join(' · ');
    const lignes = comparees.map(({ avant: promesseAvant, apres: promesseApres }) => {
      const ligne = paragraphe(garantieAvantApres(
        associationEcrite(associationDe(promesseAvant.paire), etatDeLaPaire(promesseAvant.paire)),
        promesseAvant.mode,
        promesseAvant.profil,
        promesseAvant.contraste,
        promesseApres.contraste,
      ));
      ligne.className = 'ajustement-garantie';
      ligne.dataset.verdict = promesseApres.verdict;
      ligne.append(badgeDeNiveau(promesseApres.contraste, jugementDuSeuil(promesseApres.paire.seuil)));
      return ligne;
    });
    const enTete = paragraphe(`${TEXTES_DE_L_AJUSTEMENT.garanties} : ${bilan}`);
    enTete.className = 'ajustement-bilan';
    garanties.replaceChildren(
      enTete,
      ...(lignes.length > 0 ? lignes : [paragraphe(TEXTES_DE_L_AJUSTEMENT.aucuneGarantieManquee, 'ligne-secondaire')]),
    );
  }

  function rendre(): void {
    if (!recette || !palette || !courante) return;
    originale.poser(originaleDe(palette).toUpperCase());
    proposition.poser(courante);
    const couleur = lireHexa(courante);
    luminosite.textContent = couleur ? ecrireArrondi(rgb8VersOklch(couleur).L, 3) : '';
    if (document.activeElement !== code) code.value = courante;

    const annoncesDesPas = ([-1, 1] as const).flatMap((sens) => {
      const changement = changementAuPasVoisin(recette!, palette!, pas, sens);
      if (changement === null) return [TEXTES_DE_L_AJUSTEMENT.horsLimite];
      return changement.length > 0 ? [annonceDuPas(sens, changement)] : [];
    });
    plusSombre.disabled = propositionAuPas(recette, palette, pas - 1) === null;
    plusClair.disabled = propositionAuPas(recette, palette, pas + 1) === null;
    annonces.replaceChildren(...[...new Set(annoncesDesPas)].map((texte) => paragraphe(texte, 'ligne-secondaire')));

    const apres = paletteAjustee(recette, palette, courante);
    visee.textContent = apres ? nuanceVisee(nuancesVisees(recette, apres)) : '';
    if (apres) rendreLesGaranties(recette, palette, apres);
    boutonAppliquer.disabled = !apres || apres.reference === palette.reference;
  }

  function valider(): void {
    if (!recette || !palette || !courante) return;
    const proposition = courante;
    if (!paletteAjustee(recette, palette, proposition)) return;
    fermer();
    appliquer(proposition);
  }

  function fermer(rendreLeFocus = true): void {
    const cible = rendreLeFocus ? retour : null;
    element.hidden = true;
    recette = null;
    palette = null;
    courante = null;
    retour = null;
    cible?.focus();
  }

  return {
    element,
    ouvrir(lue, ajustee, lien) {
      recette = lue;
      palette = ajustee;
      retour = lien;
      pas = pasALOuverture(lue, ajustee);
      courante = ajustee.reference.toUpperCase();
      code.setAttribute('aria-invalid', 'false');
      element.hidden = false;
      rendre();
      plusSombre.focus();
    },
    fermer: (rendreLeFocus = true) => fermer(rendreLeFocus),
    palette: () => palette,
  };
}
