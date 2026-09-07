import { versSandbox } from '../pont';

/**
 * La poignée de redimensionnement de la fenêtre.
 */
export function createResizeGrip(): HTMLDivElement {
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

    // Le pointeur est en coordonnées de la fenêtre : sa position est la taille
    // demandée, à la marge de la poignée près. Aucun delta à accumuler, donc
    // aucune dérive après plusieurs glissés.
    const suivre = (mouvement: PointerEvent) => {
      versSandbox({
        type: 'resize',
        largeur: Math.ceil(mouvement.clientX + 4),
        hauteur: Math.ceil(mouvement.clientY + 4),
      });
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
