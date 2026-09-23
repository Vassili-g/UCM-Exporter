/**
 * En-tête partagé par les vues export et configuration de l'exporteur.
 * Il conserve l'état de connexion et les actions au même emplacement ; les
 * boutons de configuration et de retour viennent du socle.
 */
import { createBackButton, createSettingsButton } from 'ucm-plugin-socle/src/ui/EnTete';

/** Ce qu'une page affiche dans l'en-tête : un titre, et un sous-titre optionnel. */
export interface PageEnTete {
  title: string;
  subtitle?: string;
}

/** Les éléments de l'en-tête que le routeur UI pilote après coup. */
export interface EnTeteUi {
  element: HTMLDivElement;
  connection: HTMLButtonElement;
  settingsButton: HTMLButtonElement;
  backButton: HTMLButtonElement;
  setPage(page: PageEnTete): void;
}

/**
 * Crée l'en-tête et renvoie ses éléments pilotés par le routeur UI.
 */
export function createHeader(
  page: PageEnTete,
  { onSettings, onConnection, onBack }: { onSettings: () => void; onConnection: () => void; onBack: () => void },
): EnTeteUi {
  const header = document.createElement('div');
  header.className = 'header';

  const topLine = document.createElement('div');
  topLine.className = 'header-topline';

  const titleElement = document.createElement('h1');
  titleElement.className = 'page-title';

  const subtitleElement = document.createElement('p');
  subtitleElement.className = 'subtitle';

  const setPage = ({ title, subtitle }: PageEnTete) => {
    titleElement.textContent = title;
    subtitleElement.textContent = subtitle ?? '';
    subtitleElement.hidden = !subtitle;
  };
  setPage(page);

  /*
   * La pastille porte la seule information de l'en-tête qui demande un geste : elle
   * est donc un bouton, et il mène là où ce geste se fait.
   */
  const connection = document.createElement('button');
  connection.type = 'button';
  connection.className = 'connection-status';
  connection.dataset.state = 'disconnected';
  connection.title = 'Ouvrir la configuration';
  connection.setAttribute('aria-live', 'polite');
  connection.addEventListener('click', () => onConnection());

  const settingsButton = createSettingsButton(onSettings);
  const backButton = createBackButton(onBack);

  topLine.append(titleElement, settingsButton, backButton);
  header.append(topLine, subtitleElement, connection);

  return { element: header, connection, settingsButton, backButton, setPage };
}
