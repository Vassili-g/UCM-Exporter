/**
 * Journal visuel des exports, avertissements et liens de pull request.
 * Les entrées sont ajoutées comme nœuds texte pour ne jamais injecter de HTML.
 */

/** Construit le journal et son API minimale d'ajout et de remise à zéro. */
export function createLogPanel(initialText = '') {
  const section = document.createElement('section');
  /*
   * Plus de carte (U1.7) : le journal est du rang 3 — il informe et ne demande
   * rien —, il vit donc sur le fond de la page. Sa phrase d'aide est partie avec
   * elle (U1.2) : « Les messages de l'outil et les téléchargements apparaissent
   * ici » expliquait un journal à quelqu'un qui en a vu mille.
   */
  section.className = 'log-panel';

  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = 'Journal';

  const content = document.createElement('div');
  content.className = 'log-panel-inner';
  /*
   * Une seule région annoncée (U0.2). La note d'état et ce journal portaient
   * tous deux `aria-live="polite"`, et un message `status` s'écrit dans les
   * deux : un lecteur d'écran annonçait donc deux fois le même texte. La note
   * reste l'unique annonceur.
   *
   * `role="log"` garde la sémantique de registre consultable, mais NE SUFFIT
   * PAS à taire l'annonce : ce rôle porte un `aria-live="polite"` implicite, et
   * retirer l'attribut le laisserait donc en place. Il faut l'écraser
   * explicitement — c'est la seule valeur d'`aria-live` qui doive apparaître
   * dans ce fichier.
   */
  content.setAttribute('role', 'log');
  content.setAttribute('aria-live', 'off');

  section.append(title, content);

  function appendLine(message, level = 'info') {
    const line = document.createElement('div');
    line.className = `log-line log-${level}`;
    const marker = level === 'error' ? 'Erreur : ' : level === 'success' ? 'OK : ' : '';
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
      const marker = document.createTextNode('OK : ');
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
