/**
 * Journal visuel des exports, avertissements et liens de pull request.
 * Les entrées sont ajoutées comme nœuds texte pour ne jamais injecter de HTML.
 */

/** Construit le journal et son API minimale d'ajout et de remise à zéro. */
export function createLogPanel(initialText = '') {
  const section = document.createElement('section');
  section.className = 'card log-panel';

  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Journal';

  const hint = document.createElement('p');
  hint.className = 'description';
  hint.textContent = 'Les messages de l’outil et les téléchargements apparaissent ici.';

  const content = document.createElement('div');
  content.className = 'log-panel-inner';
  content.setAttribute('aria-live', 'polite');

  section.append(title, hint, content);

  function appendLine(message, level = 'info') {
    const line = document.createElement('div');
    line.className = `log-line log-${level}`;
    const marker = level === 'error' ? 'Erreur · ' : level === 'success' ? 'OK · ' : '';
    line.textContent = `${marker}${message}`;
    content.appendChild(line);
    content.scrollTop = content.scrollHeight;
  }

  if (initialText) appendLine(initialText);

  return {
    element: section,
    append(message, level = 'info') {
      appendLine(message, level);
    },
    appendLink(label, url) {
      const line = document.createElement('div');
      line.className = 'log-line log-success';
      const marker = document.createTextNode('OK · ');
      const link = document.createElement('a');
      link.href = url;
      link.textContent = label;
      // Seul le sandbox Figma sait ouvrir le navigateur : on lui délègue.
      link.addEventListener('click', (event) => {
        event.preventDefault();
        parent.postMessage({ pluginMessage: { type: 'open-external', url } }, '*');
      });
      line.append(marker, link);
      content.appendChild(line);
      content.scrollTop = content.scrollHeight;
    },
    // Vide le journal pour repartir propre au début d'un nouvel export.
    clear(text = '') {
      content.replaceChildren();
      if (text) appendLine(text);
    }
  };
}
