/**
 * Un réglage à effet immédiat, selon le motif WAI-ARIA « switch ». Le libellé
 * décrit l'état activé et ne change pas avec l'état ; l'aide reste affichée.
 */

export interface InterrupteurUi {
  element: HTMLDivElement;
  bouton: HTMLButtonElement;
  /** Pose l'état reçu du sandbox, sans rien lui renvoyer. */
  poser(active: boolean): void;
}

export function createInterrupteur(
  id: string,
  libelle: string,
  aide: string,
  onChange: (active: boolean) => void,
): InterrupteurUi {
  const element = document.createElement('div');
  element.className = 'reglage';

  const ligne = document.createElement('div');
  ligne.className = 'reglage-ligne';

  const texte = document.createElement('span');
  texte.className = 'field-label';
  texte.id = `${id}-libelle`;
  texte.textContent = libelle;

  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'interrupteur';
  bouton.id = id;
  bouton.setAttribute('role', 'switch');
  bouton.setAttribute('aria-labelledby', texte.id);
  bouton.setAttribute('aria-describedby', `${id}-aide`);

  const curseur = document.createElement('span');
  curseur.className = 'interrupteur-curseur';
  bouton.appendChild(curseur);

  const detail = document.createElement('p');
  detail.className = 'field-help';
  detail.id = `${id}-aide`;
  detail.textContent = aide;

  function poser(active: boolean) {
    bouton.setAttribute('aria-checked', String(active));
  }

  bouton.addEventListener('click', () => {
    const active = bouton.getAttribute('aria-checked') !== 'true';
    poser(active);
    onChange(active);
  });

  ligne.append(texte, bouton);
  element.append(ligne, detail);
  poser(false);
  return { element, bouton, poser };
}
