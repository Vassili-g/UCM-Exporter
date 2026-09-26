/**
 * Ajuster la référence (W7), onglet « Ajuster » du sélecteur de couleur de la
 * référence (maquette X2.7, R3) : l'originale et la proposition côte à côte,
 * un pas de 0,01 de luminosité OKLCH vers le sombre ou le clair, chroma et
 * teinte gardées, une piste qui marque d'un trait le passage d'une nuance à
 * la suivante, le code de la proposition saisissable, la nuance visée dans
 * chaque thème et les garanties avant et après, avec leur niveau WCAG.
 *
 * Rien ne change pendant les pas : seul « Appliquer » rend la proposition,
 * que l'onglet applique à la palette courante. Le sélecteur porte le reste :
 * il referme le panneau à Échap et rend le focus à son contrôle.
 */
import { associationDe, ecrireArrondi, etatDeLaPaire, lireHexa, rgb8VersOklch, type Palette, type Recette } from 'ucm-couleur';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import {
  changementAuPasVoisin,
  garantiesComparees,
  manqueesParIntensite,
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
  /** Le contenu de l'onglet « Ajuster », que le sélecteur de couleur accueille. */
  readonly element: HTMLDivElement;
  /** Part de la palette telle qu'elle est rangée, au pas qui mène à sa référence. */
  preparer(recette: Recette, palette: Palette): void;
  /** Le premier contrôle du panneau, qui reçoit le focus à l'ouverture de l'onglet. */
  focaliser(): void;
}

/** Le nombre de pas que la piste montre de chaque côté de la proposition. */
const DEMI_PISTE = 8;

function paragraphe(texte: string, classe = ''): HTMLParagraphElement {
  const element = document.createElement('p');
  element.textContent = texte;
  if (classe) element.className = classe;
  return element;
}

/** Une grande pastille et son code, sous un libellé : l'originale, puis la proposition. */
function temoin(libelle: string): { element: HTMLDivElement; poser(hexa: string): void } {
  const element = document.createElement('div');
  element.className = 'ajustement-temoin';
  const pastille = document.createElement('span');
  pastille.className = 'ajustement-pastille';
  pastille.setAttribute('aria-hidden', 'true');
  const code = paragraphe('', 'detail-code');
  element.append(pastille, paragraphe(libelle, 'libelle-de-champ'), code);
  return {
    element,
    poser(hexa) {
      pastille.style.background = hexa;
      code.textContent = hexa;
    },
  };
}

/**
 * @param appliquer reçoit la proposition, que l'onglet applique à la palette courante.
 * @param refermer referme le sélecteur, après « Appliquer » comme après « Annuler ».
 */
export function createAjustement(appliquer: (proposition: string) => void, refermer: () => void): AjustementUi {
  const element = document.createElement('div');
  element.className = 'ajustement';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', TEXTES_DE_L_AJUSTEMENT.titre);

  const originale = temoin(TEXTES_DE_L_AJUSTEMENT.originale);
  const proposition = temoin(TEXTES_DE_L_AJUSTEMENT.proposition);
  const temoins = document.createElement('div');
  temoins.className = 'ajustement-temoins';
  temoins.append(originale.element, proposition.element);

  // Les deux pas de part et d'autre de la piste, puis la luminosité et l'annonce d'un pas qui change de nuance.
  const plusSombre = createButton({ label: '−', variant: 'secondary', onClick: () => faireUnPas(-1) });
  plusSombre.setAttribute('aria-label', TEXTES_DE_L_AJUSTEMENT.plusSombre);
  const plusClair = createButton({ label: '+', variant: 'secondary', onClick: () => faireUnPas(1) });
  plusClair.setAttribute('aria-label', TEXTES_DE_L_AJUSTEMENT.plusClair);
  const piste = document.createElement('div');
  piste.className = 'ajustement-piste';
  piste.setAttribute('aria-hidden', 'true');
  const reglette = document.createElement('div');
  reglette.className = 'ajustement-reglette';
  reglette.append(plusSombre, piste, plusClair);
  const luminosite = document.createElement('output');
  luminosite.className = 'ajustement-luminosite ligne-secondaire';
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
  gestes.append(createButton({ label: TEXTES_DE_L_AJUSTEMENT.annuler, variant: 'secondary', onClick: () => refermer() }), boutonAppliquer);

  element.append(temoins, reglette, luminosite, annonces, code, visee, garanties, gestes);

  let recette: Recette | null = null;
  let palette: Palette | null = null;
  let pas = 0;
  /** La proposition montrée : celle du pas, ou un code saisi dans le panneau. */
  let courante: string | null = null;

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

  /**
   * La piste : les propositions de part et d'autre du pas courant, peintes en
   * dégradé, un trait là où la nuance visée change dans un thème, et le
   * curseur au pas courant.
   */
  function rendreLaPiste(lue: Recette, ajustee: Palette): void {
    const pasMontres = Array.from({ length: 2 * DEMI_PISTE + 1 }, (_, rang) => pas - DEMI_PISTE + rang);
    const propositions = pasMontres.map((candidat) => propositionAuPas(lue, ajustee, candidat));
    const visees = propositions.map((hexa) => {
      const apres = hexa ? paletteAjustee(lue, ajustee, hexa) : null;
      return apres ? nuancesVisees(lue, apres) : null;
    });
    const couleurs = propositions.filter((hexa): hexa is string => hexa !== null);
    piste.style.background = couleurs.length > 1 ? `linear-gradient(to right, ${couleurs.join(', ')})` : couleurs[0] ?? 'transparent';
    const traits = visees.slice(1).flatMap((visee, rang) => {
      const avant = visees[rang];
      if (!visee || !avant || (visee.light === avant.light && visee.dark === avant.dark)) return [];
      const trait = document.createElement('span');
      trait.className = 'ajustement-frontiere';
      trait.style.left = `${((rang + 0.5) / (pasMontres.length - 1)) * 100}%`;
      return [trait];
    });
    const curseur = document.createElement('span');
    curseur.className = 'ajustement-curseur';
    curseur.style.left = '50%';
    piste.replaceChildren(...traits, curseur);
  }

  function rendreLesGaranties(lue: Recette, avant: Palette, apres: Palette): void {
    // Une palette libre n'a pas de garanties : la section se tait.
    if (avant.crans !== undefined) {
      garanties.replaceChildren();
      garanties.hidden = true;
      return;
    }
    const manqueesAvant = manqueesParIntensite(lue, avant);
    const manqueesApres = manqueesParIntensite(lue, apres);
    const comparees = garantiesComparees(lue, avant, apres);
    garanties.hidden = false;
    const bilan = manqueesAvant.map(({ intensite, manquees }, rang) => bilanDeLAjustement(intensite, manquees, manqueesApres[rang].manquees)).join(' · ');
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
    luminosite.textContent = couleur ? `${TEXTES_DE_L_AJUSTEMENT.luminosite} ${ecrireArrondi(rgb8VersOklch(couleur).L, 3)}` : '';
    if (document.activeElement !== code) code.value = courante;
    rendreLaPiste(recette, palette);

    // La phrase ne vient que lorsque le pas voisin franchit une frontière de la piste.
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
    const choisie = courante;
    if (!paletteAjustee(recette, palette, choisie)) return;
    refermer();
    appliquer(choisie);
  }

  return {
    element,
    preparer(lue, ajustee) {
      recette = lue;
      palette = ajustee;
      pas = pasALOuverture(lue, ajustee);
      courante = ajustee.reference.toUpperCase();
      code.setAttribute('aria-invalid', 'false');
      rendre();
    },
    focaliser: () => plusSombre.focus({ preventScroll: true }),
  };
}
