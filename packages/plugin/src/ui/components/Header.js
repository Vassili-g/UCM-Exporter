/**
 * Crée l'icône de réglages Font Awesome Free directement dans l'UI.
 * Le SVG embarqué reste fiable dans la sandbox Figma, où le kit distant ne
 * peut pas toujours remplacer les éléments <i>.
 */
function createSettingsIcon() {
  const namespace = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(namespace, 'svg');
  icon.setAttribute('viewBox', '0 0 512 512');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');

  const path = document.createElementNS(namespace, 'path');
  // Font Awesome Free Solid 6.7.2 — gear (f013).
  path.setAttribute(
    'd',
    'M495.9 166.6c3.2 8.7.5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6.3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z',
  );
  icon.appendChild(path);
  return icon;
}

/**
 * Crée l'en-tête et renvoie ses éléments pilotés par le routeur UI.
 *
 * `page` porte `title` et `subtitle` : les deux se relisent à chaque changement
 * de page par `setPage`, parce qu'un en-tête écrit une fois pour toutes finit
 * par décrire une autre page que celle qui est affichée (U0.3).
 */
export function createHeader(page, onSettings, onBack) {
  const header = document.createElement('div');
  header.className = 'header';

  const topLine = document.createElement('div');
  topLine.className = 'header-topline';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'space-y-1';

  const titleElement = document.createElement('h1');
  titleElement.className = 'page-title';

  const subtitleElement = document.createElement('p');
  subtitleElement.className = 'subtitle';

  const setPage = ({ title, subtitle }) => {
    titleElement.textContent = title;
    subtitleElement.textContent = subtitle;
  };
  setPage(page);

  const tools = document.createElement('div');
  tools.className = 'header-tools';

  const connection = document.createElement('span');
  connection.className = 'connection-status';
  connection.dataset.state = 'disconnected';
  connection.textContent = 'non connecté';
  connection.setAttribute('role', 'status');

  const settingsButton = document.createElement('button');
  settingsButton.type = 'button';
  settingsButton.className = 'icon-button';
  settingsButton.setAttribute('aria-label', 'Ouvrir la configuration');
  settingsButton.title = 'Configuration';
  settingsButton.appendChild(createSettingsIcon());
  settingsButton.addEventListener('click', () => onSettings?.());

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'header-back-button';
  backButton.textContent = 'Retour';
  backButton.hidden = true;
  backButton.addEventListener('click', () => onBack?.());

  titleGroup.append(titleElement, subtitleElement);
  tools.append(connection, settingsButton, backButton);
  topLine.appendChild(tools);
  header.append(topLine, titleGroup);

  return { element: header, connection, settingsButton, backButton, setPage };
}
/**
 * En-tête partagé par les vues export et configuration de l'exporteur.
 * Il conserve l'état de connexion et les actions au même emplacement.
 */
