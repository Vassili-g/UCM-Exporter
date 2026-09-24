/**
 * Une carte de la configuration d'une palette (`[UI-09]` à `[UI-12]`) : fond
 * secondaire, bordure du socle, titre de carte. Une carte repliable a pour
 * en-tête un bouton qui porte le chevron, le titre et un résumé aligné à
 * droite ; son état ouvert dure autant que l'élément, donc la session.
 */

export interface OptionsDeCarte {
  readonly titre: string;
  /** Une carte repliable, et son état à l'ouverture du plugin. */
  readonly repliable?: { readonly ouverte: boolean };
  /** La carte de génération porte le fond du panneau, et son titre ne se montre pas. */
  readonly plate?: boolean;
}

export interface CarteUi {
  readonly element: HTMLElement;
  /** L'en-tête ; une carte fixe y reçoit ses contrôles à droite du titre. */
  readonly tete: HTMLElement;
  readonly corps: HTMLDivElement;
  /** Le texte à droite du titre, ou dans l'en-tête replié. */
  poserResume(texte: string): void;
  ouvrir(): void;
  estOuverte(): boolean;
  /** Une carte repliable désactivée reste fermée, et son en-tête dit pourquoi. */
  desactiver(raison: string | null): void;
  /** Un geste sur l'en-tête qui ouvre ou replie la carte. */
  surBascule(action: (ouverte: boolean) => void): void;
}

let compteur = 0;

export function createCarte(options: OptionsDeCarte): CarteUi {
  const element = document.createElement('section');
  element.className = 'carte';
  if (options.plate) element.classList.add('carte-plate');
  const corps = document.createElement('div');
  corps.className = 'carte-corps';
  compteur += 1;
  corps.id = `carte-corps-${compteur}`;
  const titre = document.createElement('h3');
  titre.className = 'carte-titre';
  titre.textContent = options.titre;
  const resume = document.createElement('span');
  resume.className = 'carte-resume';
  element.setAttribute('aria-label', options.titre);

  let ouverte = options.repliable?.ouverte ?? true;
  const actions: ((ouverte: boolean) => void)[] = [];

  let tete: HTMLElement;
  let bouton: HTMLButtonElement | null = null;
  if (options.repliable) {
    bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'carte-tete carte-bascule';
    bouton.setAttribute('aria-controls', corps.id);
    const chevron = document.createElement('span');
    chevron.className = 'carte-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    bouton.append(chevron, titre, resume);
    bouton.addEventListener('click', () => {
      ouverte = !ouverte;
      rendre();
      for (const action of actions) action(ouverte);
    });
    tete = bouton;
  } else {
    tete = document.createElement('div');
    tete.className = 'carte-tete';
    tete.append(titre, resume);
  }
  if (options.plate) element.append(corps);
  else element.append(tete, corps);

  let desactivee = false;

  function rendre(): void {
    corps.hidden = !ouverte || desactivee;
    element.dataset.ouverte = String(ouverte && !desactivee);
    if (bouton) bouton.setAttribute('aria-expanded', String(ouverte && !desactivee));
  }
  rendre();

  return {
    element,
    tete,
    corps,
    poserResume(texte) {
      resume.textContent = texte;
      resume.hidden = texte === '';
    },
    ouvrir() {
      if (ouverte) return;
      ouverte = true;
      rendre();
      for (const action of actions) action(ouverte);
    },
    estOuverte: () => ouverte && !desactivee,
    desactiver(raison) {
      desactivee = raison !== null;
      if (bouton) {
        bouton.disabled = desactivee;
        bouton.title = raison ?? '';
      }
      rendre();
    },
    surBascule(action) {
      actions.push(action);
    },
  };
}
