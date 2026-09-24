/** Les décisions restent locales ; seul l’export explicite produit un fichier à transmettre. */
(() => {
  'use strict';
  const { entries, signature } = window.RELECTURE;
  const $ = (id) => document.getElementById(id);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const sections = [...new Set(entries.map((entry) => entry.section))];
  const storageKey = `ucm-palettes-relecture-v1:${signature}`;
  const labels = { pending: 'À lire', approved: 'Validé', review: 'À revoir', kept: 'Actuel conservé' };
  let decisions = {};
  let selectedSection = '';
  let selectedId = entries[0].id;
  let importPending = null;
  let canStore = true;

  function notify(message) { $('notice').textContent = message; $('notice').hidden = false; }
  function cleanDecision(value) {
    if (!value || !Object.hasOwn(labels, value.status) || typeof value.text !== 'string' || typeof value.comment !== 'string') throw new Error('Certaines décisions sont incomplètes.');
    if (value.status === 'approved' && !value.text.trim()) throw new Error('Une proposition validée ne peut pas être vide.');
    return { status: value.status, text: value.text, comment: value.comment, updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null };
  }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved) {
      for (const [id, decision] of Object.entries(saved.decisions || {})) if (byId.has(id)) decisions[id] = cleanDecision(decision);
      if (byId.has(saved.selectedId)) selectedId = saved.selectedId;
      $('auto-next').checked = saved.autoNext !== false;
    }
  } catch {
    notify('La sauvegarde de ce navigateur est indisponible ou illisible. Exportez vos choix avant de fermer cette page.');
    canStore = false;
  }

  const decisionFor = (entry) => decisions[entry.id] || { status: 'pending', text: entry.proposal, comment: '', updatedAt: null };
  const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function filtered() {
    const query = normalize($('search').value.trim());
    const status = $('status-filter').value;
    return entries.filter((entry) => (!selectedSection || entry.section === selectedSection)
      && (status === 'all' || decisionFor(entry).status === status)
      && (!query || normalize([entry.id, entry.original, decisionFor(entry).text, decisionFor(entry).comment, entry.section, entry.note].join(' ')).includes(query)));
  }
  function save() {
    if (!canStore) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ decisions, selectedId, autoNext: $('auto-next').checked }));
      $('save-state').textContent = 'Enregistré dans ce navigateur';
    } catch {
      canStore = false;
      $('save-state').textContent = 'Sauvegarde indisponible';
      notify('Le navigateur ne peut pas enregistrer vos choix. Exportez-les avant de fermer cette page.');
    }
  }
  function updateProgress() {
    const counts = { pending: 0, approved: 0, review: 0, kept: 0 };
    entries.forEach((entry) => counts[decisionFor(entry).status]++);
    const read = entries.length - counts.pending;
    $('progress-number').textContent = `${read} / ${entries.length}`;
    $('progress').max = entries.length;
    $('progress').value = read;
    $('progress-detail').textContent = `${counts.approved} validés · ${counts.review} à revoir · ${counts.kept} conservés`;
    $('sections').replaceChildren();
    for (const section of ['', ...sections]) {
      const items = section ? entries.filter((entry) => entry.section === section) : entries;
      const done = items.filter((entry) => decisionFor(entry).status !== 'pending').length;
      const button = document.createElement('button');
      const name = document.createElement('span');
      const count = document.createElement('span');
      name.textContent = section || 'Tous les textes';
      count.textContent = `${done}/${items.length}`;
      button.setAttribute('aria-current', String(section === selectedSection));
      button.append(name, count);
      button.addEventListener('click', () => { selectedSection = section; selectedId = filtered()[0]?.id; render(); });
      $('sections').append(button);
    }
  }
  function autoHeight() {
    $('proposal').style.height = 'auto';
    $('proposal').style.height = `${Math.max(110, $('proposal').scrollHeight + 2)}px`;
  }
  function updateStatus(entry) {
    const decision = decisionFor(entry);
    $('entry-status').textContent = labels[decision.status];
    $('entry-status').dataset.status = decision.status;
    $('edited').hidden = decision.text === entry.proposal;
    $('reset').disabled = decision.status === 'pending';
  }
  function render() {
    const list = filtered();
    let entry = list.find((item) => item.id === selectedId);
    if (!entry) { entry = list[0]; selectedId = entry?.id; }
    updateProgress();
    $('card').hidden = !entry;
    $('empty').hidden = !!entry;
    $('section-name').textContent = entry?.section || selectedSection;
    $('position').textContent = entry ? `${list.indexOf(entry) + 1} sur ${list.length}` : 'Aucun texte';
    $('previous').disabled = !entry || list.indexOf(entry) === 0;
    $('next').disabled = !entry || list.indexOf(entry) === list.length - 1;
    if (!entry) {
      $('empty-title').textContent = $('search').value ? 'Aucun texte trouvé.' : 'Aucun texte dans cette sélection.';
      $('empty-text').textContent = $('search').value ? 'Essayez un autre mot ou effacez la recherche.' : 'Choisissez une autre section ou un autre filtre pour poursuivre la relecture.';
      return;
    }
    const decision = decisionFor(entry);
    $('entry-id').textContent = entry.id;
    $('kind').textContent = { texte: 'Texte du plugin', aide: 'Nouvelle aide', vocabulaire: 'Choix de vocabulaire' }[entry.kind];
    $('original').textContent = entry.original || 'Aucun texte affiché.';
    $('proposal').value = decision.text;
    $('comment').value = decision.comment;
    $('context').textContent = entry.note;
    $('context').hidden = !entry.note;
    $('technical').open = false;
    $('reference').textContent = entry.source ? `${entry.source} · ${entry.reference} · ${entry.symbol}` : `Inventaire des textes · ${entry.section} · ${entry.id}`;
    $('raw').textContent = entry.raw || 'Aucun texte existant.';
    $('keep').textContent = entry.kind === 'aide' ? 'Ne pas ajouter cette aide' : 'Garder l’actuel';
    updateStatus(entry);
    autoHeight();
    save();
  }
  function edit(field, value) {
    const entry = byId.get(selectedId);
    if (!entry) return;
    const previous = decisionFor(entry);
    const status = field === 'text' && value !== previous.text ? 'pending' : previous.status;
    decisions[entry.id] = { ...previous, [field]: value, status, updatedAt: new Date().toISOString() };
    if (status !== previous.status) $('feedback').textContent = 'Le texte a changé. Validez cette nouvelle version lorsque vous êtes prêt.';
    updateStatus(entry);
    updateProgress();
    save();
  }
  function choose(status) {
    const entry = byId.get(selectedId);
    if (!entry) return;
    const list = filtered();
    const index = list.findIndex((item) => item.id === selectedId);
    const decision = decisionFor(entry);
    if (status === 'approved' && !decision.text.trim()) { $('feedback').textContent = 'Écrivez une proposition avant de la valider.'; $('proposal').focus(); return; }
    decisions[entry.id] = { ...decision, status, updatedAt: new Date().toISOString() };
    $('feedback').textContent = `${entry.id} : ${labels[status].toLowerCase()}. Vous pouvez revenir sur ce choix.`;
    if (status !== 'pending' && $('auto-next').checked) {
      const remaining = filtered();
      const after = list.slice(index + 1).find((item) => remaining.some((candidate) => candidate.id === item.id));
      selectedId = after?.id || (remaining.find((item) => decisionFor(item).status === 'pending')?.id) || entry.id;
    }
    save();
    render();
  }
  function navigate(direction) {
    const list = filtered();
    const index = list.findIndex((entry) => entry.id === selectedId);
    selectedId = list[Math.max(0, Math.min(list.length - 1, index + direction))]?.id;
    render();
  }
  $('proposal').addEventListener('input', () => { edit('text', $('proposal').value); autoHeight(); });
  $('comment').addEventListener('input', () => edit('comment', $('comment').value));
  $('restore').addEventListener('click', () => { const entry = byId.get(selectedId); if (entry) { $('proposal').value = entry.proposal; edit('text', entry.proposal); autoHeight(); } });
  $('approve').addEventListener('click', () => choose('approved'));
  $('review').addEventListener('click', () => choose('review'));
  $('keep').addEventListener('click', () => choose('kept'));
  $('reset').addEventListener('click', () => choose('pending'));
  $('previous').addEventListener('click', () => navigate(-1));
  $('next').addEventListener('click', () => navigate(1));
  $('search').addEventListener('input', () => { selectedId = null; render(); });
  $('status-filter').addEventListener('change', () => { selectedId = null; render(); });
  $('auto-next').addEventListener('change', save);
  $('show-all').addEventListener('click', () => { selectedSection = ''; $('status-filter').value = 'all'; $('search').value = ''; render(); });
  $('export-button').addEventListener('click', () => {
    const result = { format: 'ucm-palettes-relecture', version: 1, signature, exportedAt: new Date().toISOString(), decisions: entries.map((entry) => ({ id: entry.id, section: entry.section, source: entry.source || null, reference: entry.reference || null, original: entry.raw, initialProposal: entry.proposal, ...decisionFor(entry) })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'validation-textes-palettes.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('feedback').textContent = 'Export demandé. Transmettez le fichier validation-textes-palettes.json pour reprendre vos choix.';
  });
  $('import-button').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async () => {
    const file = $('import-file').files[0];
    $('import-file').value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.format !== 'ucm-palettes-relecture' || data.version !== 1 || data.signature !== signature || !Array.isArray(data.decisions)) throw new Error('Ce fichier ne correspond pas à cette version de la relecture.');
      const imported = {};
      for (const value of data.decisions) {
        if (!byId.has(value.id) || Object.hasOwn(imported, value.id)) throw new Error('Le fichier contient un identifiant inconnu ou répété.');
        imported[value.id] = cleanDecision(value);
      }
      importPending = imported;
      const count = Object.values(imported).filter((value) => value.status !== 'pending').length;
      $('import-summary').textContent = `${file.name} contient ${count} décisions et les brouillons associés.`;
      $('import-dialog').showModal();
    } catch (error) {
      notify(`Import impossible. ${error instanceof SyntaxError ? 'Le fichier doit être un export de cette page.' : error.message} Vos choix actuels sont conservés.`);
    }
  });
  $('cancel-import').addEventListener('click', () => { importPending = null; $('import-dialog').close(); });
  $('confirm-import').addEventListener('click', () => {
    if (!importPending) return;
    decisions = { ...decisions, ...importPending };
    importPending = null;
    $('import-dialog').close();
    $('notice').hidden = true;
    save();
    render();
    $('feedback').textContent = 'Vos choix ont été importés.';
  });
  render();
})();
