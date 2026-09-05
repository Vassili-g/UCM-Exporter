/**
 * Fabrique les boutons homogènes de l'interface du plugin.
 * Le composant reste volontairement DOM natif pour garder l'UI légère.
 */

/**
 * Crée un bouton accessible avec libellé, variante et action optionnelle.
 *
 * Il a porté une option `icon` que personne n'a jamais passée et que rien ne
 * stylisait : une capacité qui n'existe qu'à moitié se découvre le jour où on
 * s'en sert. Elle est retirée (U1.2) ; la rétablir sera un geste entier, avec
 * sa règle.
 */
export function createButton({ label, variant = 'primary', onClick, disabled = false }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn btn-${variant}`;
  button.disabled = disabled;

  const labelNode = document.createElement('span');
  labelNode.textContent = label;
  button.appendChild(labelNode);

  button.addEventListener('click', (event) => {
    event.preventDefault();
    if (!button.disabled && typeof onClick === 'function') {
      onClick(event);
    }
  });

  return button;
}
