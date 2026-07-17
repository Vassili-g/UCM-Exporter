export function createButton({ label, variant = 'primary', icon, onClick, disabled = false }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn btn-${variant}`;
  button.disabled = disabled;

  if (icon) {
    const iconNode = document.createElement('span');
    iconNode.className = 'btn-icon';
    iconNode.innerText = icon;
    button.appendChild(iconNode);
  }

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
