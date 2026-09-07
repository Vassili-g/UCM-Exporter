/**
 * Fabrique les boutons homogènes de l'interface du plugin.
 * Le composant reste volontairement DOM natif pour garder l'UI légère.
 */

/** Les deux poids visuels d'un bouton. */
export type VarianteBouton = 'primary' | 'secondary';

/** Un `<button>` de cette interface, augmenté de `setLabel`. */
export interface BoutonUi extends HTMLButtonElement {
  setLabel(texte: string): void;
}

export interface OptionsBouton {
  label: string;
  variant?: VarianteBouton;
  onClick?: (event: MouseEvent) => void;
  disabled?: boolean;
}

/**
 * Crée un bouton accessible avec libellé, variante et action optionnelle.
 */
export function createButton({
  label,
  variant = 'primary',
  onClick,
  disabled = false,
}: OptionsBouton): BoutonUi {
  const button = document.createElement('button') as BoutonUi;
  button.type = 'button';
  button.className = `btn btn-${variant}`;
  button.disabled = disabled;

  const labelNode = document.createElement('span');
  labelNode.textContent = label;
  button.appendChild(labelNode);

  /*
   * Un bouton dont le libellé change en cours de route — « Publier », puis
   * « Réessayer la publication » — le change par ici. Fouiller ses enfants
   * depuis l'extérieur marcherait aujourd'hui et casserait le jour où il en
   * gagne un second.
   */
  button.setLabel = (texte: string) => {
    labelNode.textContent = texte;
  };

  button.addEventListener('click', (event) => {
    event.preventDefault();
    if (!button.disabled && typeof onClick === 'function') {
      onClick(event);
    }
  });

  return button;
}
