export function createHeader(title, subtitle) {
  const header = document.createElement('div');
  header.className = 'header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'space-y-1';

  const titleElement = document.createElement('h1');
  titleElement.className = 'page-title';
  titleElement.textContent = title;

  const subtitleElement = document.createElement('p');
  subtitleElement.className = 'subtitle';
  subtitleElement.textContent = subtitle;

  titleGroup.append(titleElement, subtitleElement);
  header.appendChild(titleGroup);

  return header;
}
