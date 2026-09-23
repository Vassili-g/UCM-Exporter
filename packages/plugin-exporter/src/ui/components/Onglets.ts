/**
 * Onglets selon le motif WAI-ARIA « tabs » : la tabulation n'atteint que
 * l'onglet actif, les flèches, Début et Fin déplacent le focus, et le focus
 * active l'onglet. Les panneaux sont locaux et s'affichent sans délai, cas où
 * le guide recommande l'activation automatique.
 *
 * Tous les panneaux restent dans le DOM : une saisie en cours survit à un
 * changement d'onglet.
 */

export interface DefinitionOnglet<Id extends string> {
  id: Id;
  libelle: string;
  panneau: HTMLElement;
}

export interface OngletsUi<Id extends string> {
  liste: HTMLDivElement;
  selectionner(id: Id): void;
  actif(): Id;
}

export function createOnglets<Id extends string>(
  etiquette: string,
  definitions: DefinitionOnglet<Id>[],
  onSelection: (id: Id) => void = () => {},
): OngletsUi<Id> {
  const liste = document.createElement('div');
  liste.className = 'onglets';
  liste.setAttribute('role', 'tablist');
  liste.setAttribute('aria-label', etiquette);

  const onglets = definitions.map(({ id, libelle, panneau }) => {
    const onglet = document.createElement('button');
    onglet.type = 'button';
    onglet.className = 'onglet';
    onglet.id = `onglet-${id}`;
    onglet.textContent = libelle;
    onglet.setAttribute('role', 'tab');
    onglet.setAttribute('aria-controls', `panneau-${id}`);
    onglet.addEventListener('click', () => selectionner(id));

    panneau.id = `panneau-${id}`;
    panneau.setAttribute('role', 'tabpanel');
    panneau.setAttribute('aria-labelledby', onglet.id);
    panneau.tabIndex = 0;

    liste.appendChild(onglet);
    return { id, onglet, panneau };
  });

  let courant = definitions[0].id;

  function selectionner(id: Id) {
    courant = id;
    for (const { id: candidat, onglet, panneau } of onglets) {
      const choisi = candidat === id;
      onglet.setAttribute('aria-selected', String(choisi));
      onglet.tabIndex = choisi ? 0 : -1;
      panneau.hidden = !choisi;
    }
    onSelection(id);
  }

  liste.addEventListener('keydown', (evenement) => {
    const rang = onglets.findIndex(({ id }) => id === courant);
    const cibles: Record<string, number> = {
      ArrowRight: (rang + 1) % onglets.length,
      ArrowLeft: (rang - 1 + onglets.length) % onglets.length,
      Home: 0,
      End: onglets.length - 1,
    };
    const cible = cibles[evenement.key];
    if (cible === undefined) return;
    evenement.preventDefault();
    selectionner(onglets[cible].id);
    onglets[cible].onglet.focus();
  });

  selectionner(courant);
  return { liste, selectionner, actif: () => courant };
}
