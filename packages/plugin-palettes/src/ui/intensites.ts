/**
 * Les intensités de la palette ouverte, sous le nuancier (section 8.1,
 * [ENT-09]) : un curseur et un champ par profil, un repère qui situe
 * l'intensité de la couleur de référence, l'origine des intensités et le
 * retour aux réglages communs. Les alertes qui comparent les intensités se
 * lisent ici ([VER-10], [VER-11]).
 *
 * Un glisser prévisualise, la fin du geste enregistre, Échap rend la valeur
 * d'avant le geste. Soft ne dépasse jamais Vivid. L'ancrage de la référence ne
 * lit que les intensités communes : régler celles de la palette ne la fait
 * pas changer de profil ([MOT-17]).
 */
import { PROFILS, partsDe, validerRecette, type Palette, type Profil, type Recette } from 'ucm-couleur';

import { lireNombre } from '../configuration';
import { poserPart, remplacerPalette, reprendreLesParts } from '../edition';
import type { CibleDAction } from '../presentation';
import { blocDeConstat, type Message } from './constats';
import { NOM_DU_PROFIL, TEXTES, TEXTES_AVANCES, TEXTES_DES_INTENSITES, nombreEcrit, nombreInvalide, origineDesParts, texteDuRefus } from './textes';

export interface IntensitesUi {
  element: HTMLDivElement;
  /** `part` est l'intensité de la référence ; `messages`, les alertes qui comparent les intensités. */
  afficher(recette: Recette, palette: Palette, part: number, messages: readonly Message[]): void;
  /** Focalise le curseur Soft, quand un message y mène ([VER-15]). */
  ouvrir(): void;
}

export interface GestesDesIntensites {
  previsualiser(palette: Palette): void;
  valider(palette: Palette): void;
  ouvrir(cible: CibleDAction): void;
}

interface Reglage {
  readonly profil: Profil;
  readonly curseur: HTMLInputElement;
  readonly champ: HTMLInputElement;
  readonly repere: HTMLSpanElement;
}

export function createIntensites(gestes: GestesDesIntensites): IntensitesUi {
  const element = document.createElement('div');
  element.className = 'intensites';
  const reglages = document.createElement('div');
  reglages.className = 'intensites-reglages';
  const erreur = document.createElement('p');
  erreur.className = 'field-error';
  erreur.hidden = true;
  const origine = document.createElement('p');
  origine.className = 'ligne-secondaire';
  const reprendre = document.createElement('button');
  reprendre.type = 'button';
  reprendre.className = 'lien-de-constat';
  reprendre.textContent = TEXTES_AVANCES.reprendre;
  const messages = document.createElement('div');
  messages.className = 'constats';
  const details = document.createElement('details');
  details.className = 'constat-detail';
  const resume = document.createElement('summary');
  resume.textContent = TEXTES.detailTechnique;
  details.append(resume);
  element.append(reglages, erreur, origine, reprendre, messages, details);

  let lue: Recette | null = null;
  let courante: Palette | null = null;
  /** La palette d'avant le geste en cours, qu'Échap rétablit. */
  let avantLeGeste: Palette | null = null;

  function signaler(texte: string | null): void {
    erreur.textContent = texte ?? '';
    erreur.hidden = texte === null;
  }

  /** La palette où un profil prend `valeur`, bornée pour que soft ne dépasse pas vivid. */
  function avecLaValeur(profil: Profil, valeur: number): Palette | null {
    if (!lue || !courante) return null;
    const parts = partsDe(lue, courante);
    const bornee = profil === 'soft' ? Math.min(valeur, parts.vivid) : Math.max(valeur, parts.soft);
    return poserPart(lue, courante, profil, Math.max(0, Math.min(1, bornee)));
  }

  function prevoir(profil: Profil, valeur: number): void {
    if (!courante) return;
    if (!avantLeGeste) avantLeGeste = courante;
    const suivante = avecLaValeur(profil, valeur);
    if (suivante) gestes.previsualiser(suivante);
  }

  function terminer(profil: Profil, valeur: number): void {
    const suivante = avecLaValeur(profil, valeur);
    avantLeGeste = null;
    if (!suivante || !lue) return;
    const jugee = validerRecette(remplacerPalette(lue, suivante));
    if ('refus' in jugee) {
      signaler(texteDuRefus(jugee.refus[0]));
      return;
    }
    signaler(null);
    gestes.valider(suivante);
  }

  function annuler(): void {
    const avant = avantLeGeste;
    avantLeGeste = null;
    if (avant) gestes.previsualiser(avant);
  }

  const lignes: Reglage[] = PROFILS.map((profil) => {
    const ligne = document.createElement('div');
    ligne.className = 'intensite';
    const libelle = document.createElement('span');
    libelle.className = 'field-label';
    libelle.textContent = TEXTES_DES_INTENSITES.libelle(NOM_DU_PROFIL[profil]);
    const piste = document.createElement('span');
    piste.className = 'reglette-piste';
    const curseur = document.createElement('input');
    curseur.type = 'range';
    curseur.min = '0';
    curseur.max = '1';
    curseur.step = '0.01';
    curseur.className = 'reglette-curseur';
    curseur.setAttribute('aria-label', TEXTES_AVANCES.partDuProfil[profil]);
    curseur.addEventListener('input', () => prevoir(profil, Number(curseur.value)));
    curseur.addEventListener('change', () => terminer(profil, Number(curseur.value)));
    curseur.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'Escape' || !avantLeGeste) return;
      evenement.preventDefault();
      annuler();
    });
    const repere = document.createElement('span');
    repere.className = 'reglette-repere repere-de-reference';
    piste.append(curseur, repere);
    const champ = document.createElement('input');
    champ.type = 'text';
    champ.inputMode = 'decimal';
    champ.className = 'input champ-nombre';
    champ.spellcheck = false;
    champ.setAttribute('aria-label', TEXTES_AVANCES.partDuProfil[profil]);
    champ.addEventListener('input', () => {
      const valeur = lireNombre(champ.value);
      if (valeur !== null && valeur >= 0 && valeur <= 1) prevoir(profil, valeur);
    });
    champ.addEventListener('change', () => {
      const valeur = lireNombre(champ.value);
      if (valeur === null) {
        signaler(nombreInvalide(champ.value));
        return;
      }
      terminer(profil, valeur);
    });
    champ.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'Escape' || !avantLeGeste) return;
      evenement.preventDefault();
      annuler();
    });
    ligne.append(libelle, piste, champ);
    reglages.append(ligne);
    return { profil, curseur, champ, repere };
  });

  reprendre.addEventListener('click', () => {
    if (lue && courante) gestes.valider(reprendreLesParts(lue, courante));
  });

  return {
    element,
    ouvrir() {
      lignes[0].curseur.focus();
    },
    afficher(recette, palette, part, messagesDIntensite) {
      if (courante?.id !== palette.id) {
        signaler(null);
        avantLeGeste = null;
      }
      lue = recette;
      courante = palette;
      const parts = partsDe(recette, palette);
      for (const { profil, curseur, champ, repere } of lignes) {
        if (document.activeElement !== curseur) curseur.value = String(parts[profil]);
        if (document.activeElement !== champ) champ.value = nombreEcrit(parts[profil]);
        curseur.setAttribute('aria-valuetext', nombreEcrit(parts[profil]));
        repere.style.left = `${Math.max(0, Math.min(1, part)) * 100}%`;
        repere.title = TEXTES_DES_INTENSITES.repere(nombreEcrit(Math.round(part * 100) / 100));
      }
      origine.textContent = origineDesParts(palette.parts?.origine, palette.base, parts);
      reprendre.hidden = palette.parts?.origine !== 'designer';
      // Les informations restent repliées ; les points à vérifier se lisent tout de suite.
      const visibles = messagesDIntensite.filter((message) => message.severite !== 'notice');
      const replies = messagesDIntensite.filter((message) => message.severite === 'notice');
      messages.replaceChildren(...visibles.map((message) => blocDeConstat(message.constat, message.severite, { cibles: message.cibles, ouvrir: gestes.ouvrir })));
      messages.hidden = visibles.length === 0;
      details.replaceChildren(resume, ...replies.map((message) => blocDeConstat(message.constat, message.severite)));
      details.hidden = replies.length === 0;
      resume.textContent = TEXTES_DES_INTENSITES.detailDeLaReference;
    },
  };
}
