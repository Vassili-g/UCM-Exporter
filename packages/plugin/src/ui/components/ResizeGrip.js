/**
 * La poignée de redimensionnement de la fenêtre (U1.10).
 *
 * **Pourquoi elle existe :** la documentation de l'API ne décrit aucun
 * redimensionnement natif d'une fenêtre de plugin. `figma.ui.resize` existe,
 * mais rien ne l'appelle à la place du plugin — sans cette poignée, la fenêtre
 * reste figée à la taille que `showUI` a demandée.
 *
 * **Ce qu'elle n'a pas le droit de faire :** décider ce qu'est une taille
 * acceptable. Elle envoie ce que le pointeur dit ; le sandbox borne, applique
 * et range (`fenetre.ts`). Une borne recopiée ici serait une seconde autorité,
 * et son désaccord avec la première serait muet.
 *
 * Elle est invisible aux technologies d'assistance : c'est un confort de
 * fenêtre, et rien de ce que l'interface montre n'en dépend — la page défile.
 */
export function createResizeGrip() {
  const grip = document.createElement('div');
  grip.className = 'resize-grip';
  grip.setAttribute('aria-hidden', 'true');

  const namespace = 'http://www.w3.org/2000/svg';
  const icone = document.createElementNS(namespace, 'svg');
  icone.setAttribute('viewBox', '0 0 16 16');
  const trait = document.createElementNS(namespace, 'path');
  trait.setAttribute('d', 'M15 6 L6 15 M15 11 L11 15');
  icone.appendChild(trait);
  grip.appendChild(icone);

  grip.addEventListener('pointerdown', (depart) => {
    depart.preventDefault();
    grip.setPointerCapture(depart.pointerId);

    // Le pointeur est en coordonnées de la fenêtre : sa position EST la taille
    // demandée, à la marge de la poignée près. Aucun delta à accumuler, donc
    // aucune dérive après plusieurs glissés.
    const suivre = (mouvement) => {
      parent.postMessage(
        {
          pluginMessage: {
            type: 'resize',
            largeur: Math.ceil(mouvement.clientX + 4),
            hauteur: Math.ceil(mouvement.clientY + 4),
          },
        },
        '*',
      );
    };

    const relacher = () => {
      grip.removeEventListener('pointermove', suivre);
      grip.removeEventListener('pointerup', relacher);
      grip.removeEventListener('pointercancel', relacher);
    };

    grip.addEventListener('pointermove', suivre);
    grip.addEventListener('pointerup', relacher);
    grip.addEventListener('pointercancel', relacher);
  });

  return grip;
}
