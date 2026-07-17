export function createLogPanel(initialText = '') {
  const section = document.createElement('section');
  section.className = 'card log-panel';

  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Journal';

  const hint = document.createElement('p');
  hint.className = 'description';
  hint.textContent = 'Les messages de l’outil et les téléchargements apparaissent ici.';

  const content = document.createElement('pre');
  content.className = 'log-panel-inner';
  content.textContent = initialText;
  content.setAttribute('aria-live', 'polite');

  section.append(title, hint, content);

  return {
    element: section,
    append(message, level = 'info') {
      const prefix = content.textContent ? '\n' : '';
      const marker = level === 'error' ? 'Erreur · ' : level === 'success' ? 'OK · ' : '';
      content.textContent += `${prefix}${marker}${message}`;
      content.scrollTop = content.scrollHeight;
    },
    // Vide le journal pour repartir propre au début d'un nouvel export.
    clear(text = '') {
      content.textContent = text;
    }
  };
}
