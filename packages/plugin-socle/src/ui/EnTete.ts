/**
 * Ce que l'en-tête d'un plugin partage : le bouton en forme d'engrenage qui
 * ouvre la configuration, le bouton de retour, et la bascule entre la vue de
 * travail et la configuration. Chaque plugin compose le reste de son en-tête.
 */

/**
 * L'icône de réglages de Font Awesome Free, embarquée en SVG : dans le sandbox
 * Figma, le kit distant ne remplace pas toujours les éléments `<i>`.
 */
function createSettingsIcon(): SVGSVGElement {
  const namespace = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(namespace, 'svg');
  icon.setAttribute('viewBox', '0 0 512 512');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');

  const path = document.createElementNS(namespace, 'path');
  // Font Awesome Free Solid 6.7.2 : gear (f013).
  path.setAttribute(
    'd',
    'M495.9 166.6c3.2 8.7.5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6.3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z',
  );
  icon.appendChild(path);
  return icon;
}

/** Le bouton en forme d'engrenage qui ouvre la configuration. */
export function createSettingsButton(onSettings: () => void): HTMLButtonElement {
  const settingsButton = document.createElement('button');
  settingsButton.type = 'button';
  settingsButton.className = 'icon-button';
  settingsButton.setAttribute('aria-label', 'Ouvrir la configuration');
  settingsButton.title = 'Configuration';
  settingsButton.appendChild(createSettingsIcon());
  settingsButton.addEventListener('click', () => onSettings());
  return settingsButton;
}

/** Le bouton qui ramène de la configuration à la vue de travail, masqué au départ. */
export function createBackButton(onBack: () => void): HTMLButtonElement {
  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'header-back-button';
  backButton.textContent = 'Retour';
  backButton.hidden = true;
  backButton.addEventListener('click', () => onBack());
  return backButton;
}

/** Les quatre éléments que la bascule montre ou masque. */
export interface ElementsDeBascule {
  travail: HTMLElement;
  configuration: HTMLElement;
  settingsButton: HTMLButtonElement;
  backButton: HTMLButtonElement;
}

/**
 * Montre la configuration : la vue de travail et l'engrenage se masquent, le
 * retour apparaît.
 */
export function montrerConfiguration({ travail, configuration, settingsButton, backButton }: ElementsDeBascule): void {
  travail.hidden = true;
  configuration.hidden = false;
  settingsButton.hidden = true;
  backButton.hidden = false;
}

/** Montre la vue de travail, l'inverse de `montrerConfiguration`. */
export function montrerTravail({ travail, configuration, settingsButton, backButton }: ElementsDeBascule): void {
  configuration.hidden = true;
  travail.hidden = false;
  settingsButton.hidden = false;
  backButton.hidden = true;
}
