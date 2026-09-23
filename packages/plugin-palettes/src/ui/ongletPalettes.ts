/**
 * L'onglet Palettes (section 13.2) : la barre du haut porte le sélecteur, le
 * verdict et « Dessiner », au rang 1 ; viennent ensuite la référence et le
 * nom, la ligne repliée de la dérive, l'aperçu, et les constats.
 *
 * Chaque saisie recalcule l'aperçu dans l'interface ([ENT-02]).
 */
import type { Classement, Palette, Recette } from 'ucm-couleur';
import { createButton } from 'ucm-plugin-socle/src/ui/Button';

import { analyserPalette } from '../analyse';
import { changerReference, remplacerPalette, renommer } from '../edition';
import type { ProfilDuDocument } from '../lecture';
import { createApercu } from './apercu';
import { blocDeConstat, listeDesConstats } from './constats';
import { createSelecteur } from './selecteur';
import {
  TEXTES,
  ligneDeLaDerive,
  ligneDeLaPart,
  nomDeLaPalette,
  palettesDuFichier,
  recetteFuture,
  recetteIllisible,
  verdict,
} from './textes';

export interface OngletPalettesUi {
  element: HTMLDivElement;
  afficher(classement: Classement, profil: ProfilDuDocument): void;
}

function ligneDEtat(texte: string): HTMLParagraphElement {
  const ligne = document.createElement('p');
  ligne.className = 'etat-lecture';
  ligne.textContent = texte;
  return ligne;
}

function champ(libelle: string, saisie: HTMLInputElement): HTMLLabelElement {
  const etiquette = document.createElement('label');
  etiquette.className = 'champ-ligne';
  const texte = document.createElement('span');
  texte.className = 'field-label';
  texte.textContent = libelle;
  etiquette.append(texte, saisie);
  return etiquette;
}

export function createOngletPalettes(): OngletPalettesUi {
  const element = document.createElement('div');
  element.className = 'page-stack';

  let recette: Recette | null = null;
  let profil: ProfilDuDocument = 'SRGB';
  let idOuvert = '';

  const selecteur = createSelecteur((id) => {
    idOuvert = id;
    rendre();
  });
  const verdictDeLaPalette = document.createElement('span');
  verdictDeLaPalette.className = 'verdict';
  verdictDeLaPalette.setAttribute('aria-live', 'polite');
  // Le dessin arrive avec la planche : le bouton est là, inactif, et le dit.
  const dessiner = createButton({ label: TEXTES.dessiner, disabled: true });
  dessiner.title = TEXTES.dessinAVenir;
  const barre = document.createElement('div');
  barre.className = 'barre-palette';
  const droite = document.createElement('div');
  droite.className = 'barre-verdict';
  droite.append(verdictDeLaPalette, dessiner);
  barre.append(selecteur.element, droite);

  const pipette = document.createElement('input');
  pipette.type = 'color';
  pipette.className = 'pipette';
  pipette.setAttribute('aria-label', TEXTES.reference);
  const hexa = document.createElement('input');
  hexa.type = 'text';
  hexa.className = 'input champ-hexa';
  hexa.spellcheck = false;
  hexa.maxLength = 7;
  const nom = document.createElement('input');
  nom.type = 'text';
  nom.className = 'input';
  const reference = document.createElement('div');
  reference.className = 'ligne-reference';
  const couleur = champ(TEXTES.reference, hexa);
  couleur.insertBefore(pipette, hexa);
  reference.append(couleur, champ(TEXTES.nom, nom));

  const part = document.createElement('p');
  part.className = 'ligne-secondaire';
  const derive = document.createElement('p');
  derive.className = 'ligne-secondaire';
  const apercu = createApercu();
  const constats = document.createElement('div');

  const palette = document.createElement('div');
  palette.className = 'page-stack';
  palette.append(barre, reference, part, derive, apercu.element, constats);

  function ouverte(): Palette | null {
    if (!recette || recette.palettes.length === 0) return null;
    return recette.palettes.find((candidate) => candidate.id === idOuvert) ?? recette.palettes[0];
  }

  function modifier(suivante: Palette): void {
    if (!recette) return;
    recette = remplacerPalette(recette, suivante);
    rendre();
  }

  function saisirReference(saisie: string): void {
    const courante = ouverte();
    if (!recette || !courante) return;
    const suivante = changerReference(recette, courante, saisie);
    if (suivante) modifier(suivante);
  }

  hexa.addEventListener('input', () => saisirReference(hexa.value));
  pipette.addEventListener('input', () => saisirReference(pipette.value));
  nom.addEventListener('input', () => {
    const courante = ouverte();
    if (courante) modifier(renommer(courante, nom.value));
  });

  /** Un champ que le designer est en train de saisir garde sa valeur. */
  function poser(saisie: HTMLInputElement, valeur: string): void {
    if (document.activeElement !== saisie) saisie.value = valeur;
  }

  function rendre(): void {
    const courante = ouverte();
    if (!recette || !courante) return;
    idOuvert = courante.id;
    const analyse = analyserPalette(recette, courante, profil);
    selecteur.afficher(recette.palettes, courante.id);
    verdictDeLaPalette.textContent = verdict(analyse.manquees);
    verdictDeLaPalette.dataset.etat = analyse.manquees > 0 ? 'manque' : 'pret';
    poser(hexa, courante.reference);
    poser(pipette, courante.reference.toLowerCase());
    poser(nom, courante.nom ?? '');
    nom.placeholder = courante.reference;
    part.textContent = ligneDeLaPart(analyse.part, analyse.parts.soft, analyse.parts.vivid, analyse.cranProche);
    derive.textContent = ligneDeLaDerive(courante);
    apercu.afficher(recette, analyse.rampes);
    const lue = recette;
    const nomDe = (id: string) => {
      const trouvee = lue.palettes.find((candidate) => candidate.id === id);
      return trouvee ? nomDeLaPalette(trouvee) : id;
    };
    constats.replaceChildren(listeDesConstats(analyse, { recette: lue, nomDe }, nomDeLaPalette(courante)));
    if (palette.parentElement !== element) element.replaceChildren(palette);
  }

  return {
    element,
    afficher(classement, profilLu) {
      profil = profilLu;
      if (classement.etat === 'future') {
        recette = null;
        element.replaceChildren(blocDeConstat(recetteFuture(classement.version), 'bloquant'));
      } else if (classement.etat === 'illisible') {
        recette = null;
        element.replaceChildren(blocDeConstat(recetteIllisible(classement.refus), 'bloquant'));
      } else if (classement.etat === 'absente') {
        recette = classement.recette;
        element.replaceChildren(ligneDEtat(TEXTES.recetteAbsente));
      } else if (classement.recette.palettes.length === 0) {
        recette = classement.recette;
        element.replaceChildren(ligneDEtat(palettesDuFichier(0)));
      } else {
        recette = classement.recette;
        rendre();
      }
    },
  };
}
