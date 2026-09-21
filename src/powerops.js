import {
  FAMILY_DEFINITIONS,
  normalizeRepository,
  defaultLinkSelection,
  buildCopyLines,
  familyCounts,
  uniqueLanguages,
  bookmarkSnapshot,
  humanizeUpdatedAt,
} from './powerops-model.js';

const STORAGE = {
  bookmarks: 'vizlens.powerops.bookmarks.v1',
  linkOverrides: 'vizlens.powerops.linkOverrides.v1',
  familyOverrides: 'vizlens.powerops.familyOverrides.v1',
};

const state = {
  repositories: [],
  visible: [],
  selectedIds: new Set(),
  linkSelections: new Map(),
  activeFamilies: new Set(),
  activeTree: { family: null, subcategory: null },
  bookmarks: [],
  activeBookmarkId: null,
  page: 1,
  pageSize: 50,
  view: 'repositories',
  editingRepoId: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 1800);
}

function safeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function familyDef(id) {
  return FAMILY_DEFINITIONS.find((f) => f.id === id) || FAMILY_DEFINITIONS.at(-1);
}

function applyOverrides(raw) {
  const links = readJson(STORAGE.linkOverrides, {});
  const families = readJson(STORAGE.familyOverrides, {});
  const key = String(raw.id ?? raw.fullName ?? raw.full_name ?? raw.name);
  return normalizeRepository(raw, {
    website: links[key]?.website || raw.homepage || '',
    chatgptUrl: links[key]?.chatgptUrl || '',
    family: families[key]?.family,
    subcategory: families[key]?.subcategory,
  });
}

function initializeSelections(repositories) {
  const next = new Map();
  for (const repo of repositories) {
    const previous = state.linkSelections.get(repo.id);
    next.set(repo.id, previous || defaultLinkSelection(repo));
  }
  state.linkSelections = next;
}

async function loadRepositories() {
  $('#connectionBadge').textContent = 'Refreshing…';
  $('#connectionBadge').className = 'connection-badge';
  try {
    const response = await fetch('http://127.0.0.1:3987/api/github/repos', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'Repository fetch failed.');
    state.repositories = (payload.repositories || []).map(applyOverrides);
    initializeSelections(state.repositories);
    $('#connectionBadge').textContent = payload.source === 'authenticated' ? 'GitHub · private + public' : 'GitHub · public only';
    $('#connectionBadge').className = payload.source === 'authenticated' ? 'connection-badge ok' : 'connection-badge warn';
  } catch (error) {
    state.repositories = [];
    $('#connectionBadge').textContent = 'Local companion offline';
    $('#connectionBadge').className = 'connection-badge warn';
    toast(error.message || 'Unable to load repositories.');
  }
  state.page = 1;
  renderAll();
}

function loadBookmarks() {
  const value = readJson(STORAGE.bookmarks, []);
  state.bookmarks = Array.isArray(value) ? value : [];
}

function saveBookmarks() {
  writeJson(STORAGE.bookmarks, state.bookmarks);
  renderBookmarks();
  renderDashboard();
}

function setView(view) {
  state.view = view;
  $$('.view').forEach((el) => el.classList.toggle('active', el.id === view + 'View'));
  $$('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.view === view));
  if (view === 'dashboard') renderDashboard();
  if (view === 'bookmarks') renderBookmarkGrid();
}

function renderFamilyRibbon() {
  const counts = familyCounts(state.repositories);
  const ribbon = $('#familyRibbon');
  ribbon.replaceChildren();

  const all = document.createElement('button');
  all.className = 'family-chip all' + (state.activeFamilies.size === 0 ? ' active' : '');
  all.innerHTML = '<span class="family-icon">▦</span><span>All</span>';
  all.addEventListener('click', () => {
    state.activeFamilies.clear();
    state.activeTree = { family: null, subcategory: null };
    state.page = 1;
    applyFilters();
  });
  ribbon.append(all);

  for (const family of FAMILY_DEFINITIONS) {
    if (family.id === 'other' && !(counts.get('other') > 0)) continue;
    const button = document.createElement('button');
    button.className = 'family-chip' + (state.activeFamilies.has(family.id) ? ' active' : '');
    button.innerHTML = `<span class="family-icon" style="background:${family.color}">${family.glyph}</span><span>${family.label}</span>`;
    button.title = `${counts.get(family.id) || 0} repositories`;
    button.addEventListener('click', () => {
      if (state.activeFamilies.has(family.id)) state.activeFamilies.delete(family.id);
      else state.activeFamilies.add(family.id);
      state.activeTree = { family: null, subcategory: null };
      state.page = 1;
      applyFilters();
    });
    ribbon.append(button);
  }
}

function renderProjectTree() {
  const tree = $('#projectTree');
  tree.replaceChildren();
  const counts = familyCounts(state.repositories);

  for (const family of FAMILY_DEFINITIONS) {
    const count = counts.get(family.id) || 0;
    if (!count) continue;
    const group = document.createElement('div');
    group.className = 'tree-family';
    const head = document.createElement('button');
    const active = state.activeTree.family === family.id && !state.activeTree.subcategory;
    head.className = 'tree-family-head' + (active ? ' active' : '');
    head.innerHTML = `<span>⌄</span><span class="tree-glyph" style="background:${family.color}">${family.glyph}</span><b>${family.label}</b><span class="tree-count">${count}</span>`;
    head.addEventListener('click', () => {
      state.activeTree = active ? { family: null, subcategory: null } : { family: family.id, subcategory: null };
      state.activeFamilies.clear();
      if (!active) state.activeFamilies.add(family.id);
      state.page = 1;
      applyFilters();
    });
    group.append(head);

    const children = document.createElement('div');
    children.className = 'tree-children';
    const repos = state.repositories.filter((r) => r.family === family.id);
    const subcats = [...new Set(repos.map((r) => r.subcategory))].sort();
    for (const subcat of subcats) {
      const subCount = repos.filter((r) => r.subcategory === subcat).length;
      const child = document.createElement('button');
      const childActive = state.activeTree.family === family.id && state.activeTree.subcategory === subcat;
      child.className = 'tree-subcategory' + (childActive ? ' active' : '');
      child.innerHTML = `<b>${subcat}</b><span>${subCount}</span>`;
      child.addEventListener('click', () => {
        state.activeTree = childActive ? { family: family.id, subcategory: null } : { family: family.id, subcategory: subcat };
        state.activeFamilies.clear();
        state.activeFamilies.add(family.id);
        state.page = 1;
        applyFilters();
      });
      children.append(child);
    }
    group.append(children);
    tree.append(group);
  }
}

function applyFilters() {
  const query = $('#searchInput').value.trim().toLowerCase();
  const language = $('#languageFilter').value;
  const visibility = $('#visibilityFilter').value;
  const sort = $('#sortFilter').value;

  state.visible = state.repositories.filter((repo) => {
    if (state.activeFamilies.size && !state.activeFamilies.has(repo.family)) return false;
    if (state.activeTree.subcategory && repo.subcategory !== state.activeTree.subcategory) return false;
    if (language && repo.language !== language) return false;
    if (visibility === 'private' && !repo.private) return false;
    if (visibility === 'public' && repo.private) return false;
    if (query) {
      const haystack = [repo.name, repo.fullName, repo.description, repo.family, repo.subcategory, repo.language, ...repo.topics].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  state.visible.sort((a, b) => {
    if (sort === 'name-asc') return a.name.localeCompare(b.name);
    if (sort === 'name-desc') return b.name.localeCompare(a.name);
    return Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0);
  });

  const maxPage = Math.max(1, Math.ceil(state.visible.length / state.pageSize));
  state.page = Math.min(state.page, maxPage);
  renderFamilyRibbon();
  renderProjectTree();
  renderRows();
  renderSelectionBar();
}

function repoPage() {
  const start = (state.page - 1) * state.pageSize;
  return state.visible.slice(start, start + state.pageSize);
}

function linkLabel(url, fallback) {
  if (!url) return 'Not set';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '') || fallback;
  } catch {
    return fallback;
  }
}

function makeLinkCell(repo, kind, url) {
  const td = document.createElement('td');
  td.className = 'link-cell';
  const selection = state.linkSelections.get(repo.id) || defaultLinkSelection(repo);
  const has = Boolean(url);
  const slot = document.createElement('div');
  slot.className = 'link-slot' + (has ? '' : ' empty');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = Boolean(selection[kind] && has);
  checkbox.disabled = !has;
  checkbox.title = has ? `Include ${kind} URL when copying` : `No ${kind} URL configured`;
  checkbox.addEventListener('change', () => {
    const current = state.linkSelections.get(repo.id) || defaultLinkSelection(repo);
    current[kind] = checkbox.checked;
    state.linkSelections.set(repo.id, current);
    if (checkbox.checked) state.selectedIds.add(repo.id);
    renderSelectionBar();
  });
  const anchor = document.createElement('a');
  anchor.href = has ? url : '#';
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.textContent = linkLabel(url, kind);
  const copy = document.createElement('button');
  copy.className = 'mini-action';
  copy.textContent = '⧉';
  copy.title = has ? `Copy ${kind} URL` : 'Edit repository links';
  copy.addEventListener('click', async () => {
    if (has) await copyText(url, `${kind} URL copied`);
    else openLinkDialog(repo.id);
  });
  slot.append(checkbox, anchor, copy);
  td.append(slot);
  return td;
}

function renderRows() {
  const tbody = $('#repoRows');
  tbody.replaceChildren();

  for (const repo of repoPage()) {
    const tr = document.createElement('tr');
    tr.classList.toggle('selected', state.selectedIds.has(repo.id));

    const checkTd = document.createElement('td');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = state.selectedIds.has(repo.id);
    check.addEventListener('change', () => toggleRepo(repo.id, check.checked));
    checkTd.append(check);
    tr.append(checkTd);

    const repoTd = document.createElement('td');
    repoTd.innerHTML = `<div class="repo-cell"><span class="gh">●</span><div><div class="repo-name">${escapeHtml(repo.name)} ${repo.private ? '<span title="Private">🔒</span>' : ''}</div><div class="repo-desc">${escapeHtml(repo.description || repo.fullName)}</div></div></div>`;
    tr.append(repoTd);

    const tagsTd = document.createElement('td');
    tagsTd.innerHTML = `<div class="tags"><span class="tag family">${escapeHtml(familyDef(repo.family).label)}</span><span class="tag">${escapeHtml(repo.subcategory)}</span>${repo.language ? `<span class="tag">${escapeHtml(repo.language)}</span>` : ''}</div>`;
    tr.append(tagsTd);

    const updatedTd = document.createElement('td');
    updatedTd.className = 'updated';
    updatedTd.textContent = humanizeUpdatedAt(repo.updatedAt);
    tr.append(updatedTd);

    tr.append(makeLinkCell(repo, 'github', repo.htmlUrl));
    tr.append(makeLinkCell(repo, 'website', repo.homepage));
    tr.append(makeLinkCell(repo, 'chatgpt', repo.chatgptUrl));

    const actionsTd = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'repo-actions';
    const open = document.createElement('button');
    open.className = 'mini-action';
    open.textContent = '↗';
    open.title = 'Open GitHub';
    open.addEventListener('click', () => window.open(repo.htmlUrl, '_blank', 'noopener'));
    const edit = document.createElement('button');
    edit.className = 'mini-action';
    edit.textContent = '⋯';
    edit.title = 'Edit links';
    edit.addEventListener('click', () => openLinkDialog(repo.id));
    actions.append(open, edit);
    actionsTd.append(actions);
    tr.append(actionsTd);
    tbody.append(tr);
  }

  const start = state.visible.length ? (state.page - 1) * state.pageSize + 1 : 0;
  const end = Math.min(state.visible.length, state.page * state.pageSize);
  const pages = Math.max(1, Math.ceil(state.visible.length / state.pageSize));
  $('#resultSummary').textContent = `Showing ${start}–${end} of ${state.visible.length} filtered repositories · ${state.repositories.length} total`;
  $('#pageLabel').textContent = `${state.page} / ${pages}`;
  $('#prevPage').disabled = state.page <= 1;
  $('#nextPage').disabled = state.page >= pages;
  $('#repoCountBadge').textContent = state.repositories.length;
}

function toggleRepo(id, checked) {
  const repo = state.repositories.find((r) => r.id === id);
  if (!repo) return;
  if (checked) {
    state.selectedIds.add(id);
    const current = state.linkSelections.get(id) || defaultLinkSelection(repo);
    for (const key of ['github', 'website', 'chatgpt']) if ((repo[key === 'github' ? 'htmlUrl' : key === 'website' ? 'homepage' : 'chatgptUrl'])) current[key] = true;
    state.linkSelections.set(id, current);
  } else {
    state.selectedIds.delete(id);
  }
  renderRows();
  renderSelectionBar();
}

function renderSelectionBar() {
  const visibleIds = new Set(state.visible.map((r) => r.id));
  const selectedVisible = [...state.selectedIds].filter((id) => visibleIds.has(id)).length;
  $('#selectedCount').textContent = `${state.selectedIds.size} selected`;
  $('#selectVisibleCheckbox').checked = state.visible.length > 0 && selectedVisible === state.visible.length;
  $('#selectVisibleCheckbox').indeterminate = selectedVisible > 0 && selectedVisible < state.visible.length;
  const has = state.selectedIds.size > 0;
  for (const id of ['copyAllButton','copyGithubButton','copyWebsiteButton','copyChatgptButton','openSelectedButton','saveBookmarkButton']) $(`#${id}`).disabled = !has;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

async function copyText(value, success = 'Copied') {
  if (!value) return;
  await navigator.clipboard.writeText(value);
  toast(success);
}

async function copySelected(kind = 'all') {
  const lines = buildCopyLines(state.repositories, state.selectedIds, state.linkSelections, kind);
  if (!lines.length) return toast('No selected URLs for this link type.');
  await copyText(lines.join('\n'), `Copied ${lines.length} URL${lines.length === 1 ? '' : 's'}`);
}

function openSelected() {
  const links = buildCopyLines(state.repositories, state.selectedIds, state.linkSelections, 'github');
  for (const url of links.slice(0, 20)) window.open(url, '_blank', 'noopener');
  if (links.length > 20) toast('Opened first 20 repositories to avoid browser overload.');
}

function openLinkDialog(repoId) {
  const repo = state.repositories.find((r) => r.id === repoId);
  if (!repo) return;
  state.editingRepoId = repoId;
  $('#linkDialogTitle').textContent = repo.name;
  $('#websiteInput').value = repo.homepage || '';
  $('#chatgptInput').value = repo.chatgptUrl || '';
  $('#linkDialog').showModal();
}

function saveEditedLinks(event) {
  event.preventDefault();
  const repo = state.repositories.find((r) => r.id === state.editingRepoId);
  if (!repo) return $('#linkDialog').close();
  const website = safeUrl($('#websiteInput').value);
  const chatgptUrl = safeUrl($('#chatgptInput').value);
  const overrides = readJson(STORAGE.linkOverrides, {});
  overrides[repo.id] = { website, chatgptUrl };
  writeJson(STORAGE.linkOverrides, overrides);
  repo.homepage = website;
  repo.chatgptUrl = chatgptUrl;
  state.linkSelections.set(repo.id, defaultLinkSelection(repo));
  $('#linkDialog').close();
  renderRows();
  renderSelectionBar();
  toast('Links saved locally.');
}

function openBookmarkDialog() {
  if (!state.selectedIds.size) return toast('Select at least one repository.');
  $('#bookmarkNameInput').value = '';
  $('#bookmarkDialogSummary').textContent = `${state.selectedIds.size} repositories selected. Available GitHub, website, and ChatGPT links are included unless you unchecked a cell.`;
  $('#bookmarkDialog').showModal();
  setTimeout(() => $('#bookmarkNameInput').focus(), 30);
}

function confirmBookmark(event) {
  event.preventDefault();
  const name = $('#bookmarkNameInput').value.trim();
  if (!name) return;
  const item = bookmarkSnapshot({
    id: crypto.randomUUID(),
    name,
    selectedIds: state.selectedIds,
    linkSelections: state.linkSelections,
  });
  state.bookmarks.unshift(item);
  saveBookmarks();
  $('#bookmarkDialog').close();
  state.activeBookmarkId = item.id;
  renderBookmarks();
  toast('Bookmark list saved.');
}

function loadBookmark(id) {
  const bookmark = state.bookmarks.find((b) => b.id === id);
  if (!bookmark) return;
  state.selectedIds = new Set(bookmark.repoIds.filter((repoId) => state.repositories.some((r) => r.id === repoId)));
  for (const [repoId, selected] of Object.entries(bookmark.linkSelections || {})) {
    if (state.linkSelections.has(repoId)) state.linkSelections.set(repoId, { ...state.linkSelections.get(repoId), ...selected });
  }
  state.activeBookmarkId = id;
  state.activeFamilies.clear();
  state.activeTree = { family: null, subcategory: null };
  $('#searchInput').value = '';
  setView('repositories');
  applyFilters();
  renderBookmarks();
  toast(`Loaded “${bookmark.name}”`);
}

function deleteBookmark(id) {
  const item = state.bookmarks.find((b) => b.id === id);
  if (!item) return;
  if (!confirm(`Delete bookmark list “${item.name}”?\n\nThe repositories are not changed.`)) return;
  state.bookmarks = state.bookmarks.filter((b) => b.id !== id);
  if (state.activeBookmarkId === id) state.activeBookmarkId = null;
  saveBookmarks();
}

function renderBookmarks() {
  $('#bookmarkCountBadge').textContent = state.bookmarks.length;
  const query = $('#bookmarkSearch').value.trim().toLowerCase();
  const list = $('#bookmarkList');
  list.replaceChildren();
  const matches = state.bookmarks.filter((b) => b.name.toLowerCase().includes(query));
  for (const bookmark of matches) {
    const button = document.createElement('button');
    button.className = 'bookmark-list-item' + (bookmark.id === state.activeBookmarkId ? ' active' : '');
    button.innerHTML = `<span>♡ ${escapeHtml(bookmark.name)}</span><b>${bookmark.repoIds.length}</b>`;
    button.addEventListener('click', () => {
      state.activeBookmarkId = bookmark.id;
      renderBookmarks();
    });
    list.append(button);
  }
  renderBookmarkPreview();
  renderBookmarkGrid();
}

function renderBookmarkPreview() {
  const box = $('#bookmarkPreview');
  const item = state.bookmarks.find((b) => b.id === state.activeBookmarkId);
  if (!item) {
    box.className = 'bookmark-preview empty';
    box.innerHTML = '<p>Select a saved list to preview it.</p>';
    return;
  }
  const repos = item.repoIds.map((id) => state.repositories.find((r) => r.id === id)).filter(Boolean);
  box.className = 'bookmark-preview';
  box.innerHTML = `<div class="preview-head"><div><h3>${escapeHtml(item.name)}</h3><small>${repos.length} repositories</small></div></div>
    <ul class="preview-repos">${repos.slice(0,12).map((r) => `<li>${escapeHtml(r.name)}</li>`).join('')}${repos.length > 12 ? `<li>+${repos.length - 12} more</li>` : ''}</ul>
    <div class="preview-actions">
      <button class="primary" data-load-bookmark="${item.id}">Load list</button>
      <button data-copy-bookmark="${item.id}">⧉ Copy all links</button>
      <button data-open-bookmark="${item.id}">↗ Open GitHub repos</button>
      <button class="danger" data-delete-bookmark="${item.id}">Delete list</button>
    </div>`;
}

function bookmarkLines(item, kind = 'all') {
  const ids = new Set(item.repoIds);
  const selections = new Map(Object.entries(item.linkSelections || {}));
  return buildCopyLines(state.repositories, ids, selections, kind);
}

async function copyBookmark(id) {
  const item = state.bookmarks.find((b) => b.id === id);
  if (!item) return;
  const lines = bookmarkLines(item, 'all');
  await copyText(lines.join('\n'), `Copied ${lines.length} saved URLs`);
}

function openBookmark(id) {
  const item = state.bookmarks.find((b) => b.id === id);
  if (!item) return;
  const links = bookmarkLines(item, 'github');
  for (const url of links.slice(0,20)) window.open(url, '_blank', 'noopener');
}

function renderBookmarkGrid() {
  const grid = $('#bookmarkGrid');
  if (!grid) return;
  grid.replaceChildren();
  if (!state.bookmarks.length) {
    grid.innerHTML = '<div class="dashboard-block"><h2>No saved lists yet</h2><p>Select repositories in All Repositories, adjust any per-link checkboxes, then save the selection.</p></div>';
    return;
  }
  for (const item of state.bookmarks) {
    const repos = item.repoIds.map((id) => state.repositories.find((r) => r.id === id)).filter(Boolean);
    const card = document.createElement('article');
    card.className = 'bookmark-card';
    card.innerHTML = `<h3>${escapeHtml(item.name)}</h3><p>${repos.length} repositories · updated ${humanizeUpdatedAt(item.updatedAt)}</p><ul>${repos.slice(0,8).map((r) => `<li>${escapeHtml(r.name)}</li>`).join('')}${repos.length > 8 ? `<li>+${repos.length - 8} more</li>` : ''}</ul><div class="bookmark-card-actions"><button class="primary" data-load-bookmark="${item.id}">Load</button><button data-copy-bookmark="${item.id}">Copy</button><button class="danger" data-delete-bookmark="${item.id}">Delete</button></div>`;
    grid.append(card);
  }
}

function renderDashboard() {
  const cards = $('#dashboardCards');
  if (!cards) return;
  const privateCount = state.repositories.filter((r) => r.private).length;
  const websites = state.repositories.filter((r) => r.homepage).length;
  const chats = state.repositories.filter((r) => r.chatgptUrl).length;
  cards.innerHTML = [
    ['Repositories', state.repositories.length],
    ['Private', privateCount],
    ['Website links', websites],
    ['ChatGPT links', chats],
  ].map(([label,value]) => `<article class="stat-card"><span>${label}</span><b>${value}</b></article>`).join('');

  const counts = familyCounts(state.repositories);
  $('#dashboardFamilies').innerHTML = FAMILY_DEFINITIONS.filter((f) => counts.get(f.id)).map((f) => `<div class="family-summary"><span><b>${f.label}</b></span><span>${counts.get(f.id)}</span></div>`).join('');
  $('#dashboardBookmarks').innerHTML = state.bookmarks.length
    ? state.bookmarks.slice(0,6).map((b) => `<button class="dashboard-bookmark text-button" data-load-bookmark="${b.id}"><span>${escapeHtml(b.name)}</span><b>${b.repoIds.length}</b></button>`).join('')
    : '<p>No saved lists yet.</p>';
  $('#dashboardRecent').innerHTML = [...state.repositories].sort((a,b) => Date.parse(b.updatedAt || 0)-Date.parse(a.updatedAt || 0)).slice(0,12).map((r) => `<div class="recent-row"><span><b>${escapeHtml(r.name)}</b><br><small>${escapeHtml(familyDef(r.family).label)} · ${escapeHtml(r.subcategory)}</small></span><small>${humanizeUpdatedAt(r.updatedAt)}</small><a href="${escapeHtml(r.htmlUrl)}" target="_blank" rel="noopener noreferrer">Open ↗</a></div>`).join('');
}

function renderLanguageFilter() {
  const select = $('#languageFilter');
  const current = select.value;
  select.innerHTML = '<option value="">Language: All</option>' + uniqueLanguages(state.repositories).map((lang) => `<option value="${escapeHtml(lang)}">${escapeHtml(lang)}</option>`).join('');
  if ([...select.options].some((o) => o.value === current)) select.value = current;
}

function renderAll() {
  renderLanguageFilter();
  renderFamilyRibbon();
  renderProjectTree();
  applyFilters();
  renderBookmarks();
  renderDashboard();
}

function bindEvents() {
  for (const input of ['searchInput','languageFilter','visibilityFilter','sortFilter']) {
    $(`#${input}`).addEventListener(input === 'searchInput' ? 'input' : 'change', () => {
      state.page = 1;
      applyFilters();
    });
  }

  $('#pageSize').addEventListener('change', () => {
    state.pageSize = Number($('#pageSize').value) || 50;
    state.page = 1;
    renderRows();
  });
  $('#prevPage').addEventListener('click', () => { if (state.page > 1) { state.page -= 1; renderRows(); } });
  $('#nextPage').addEventListener('click', () => {
    const pages = Math.max(1, Math.ceil(state.visible.length / state.pageSize));
    if (state.page < pages) { state.page += 1; renderRows(); }
  });
  $('#selectVisibleCheckbox').addEventListener('change', (event) => {
    for (const repo of state.visible) {
      if (event.target.checked) {
        state.selectedIds.add(repo.id);
        state.linkSelections.set(repo.id, defaultLinkSelection(repo));
      } else state.selectedIds.delete(repo.id);
    }
    renderRows(); renderSelectionBar();
  });
  $('#selectAllButton').addEventListener('click', () => {
    for (const repo of state.visible) { state.selectedIds.add(repo.id); state.linkSelections.set(repo.id, defaultLinkSelection(repo)); }
    renderRows(); renderSelectionBar();
  });
  $('#deselectAllButton').addEventListener('click', () => { state.selectedIds.clear(); renderRows(); renderSelectionBar(); });
  $('#copyAllButton').addEventListener('click', () => copySelected('all'));
  $('#copyGithubButton').addEventListener('click', () => copySelected('github'));
  $('#copyWebsiteButton').addEventListener('click', () => copySelected('website'));
  $('#copyChatgptButton').addEventListener('click', () => copySelected('chatgpt'));
  $('#openSelectedButton').addEventListener('click', openSelected);
  $('#saveBookmarkButton').addEventListener('click', openBookmarkDialog);
  $('#newBookmarkFromCurrent').addEventListener('click', openBookmarkDialog);
  $('#newBookmarkButton').addEventListener('click', openBookmarkDialog);
  $('#refreshButton').addEventListener('click', loadRepositories);
  $('#bookmarkSearch').addEventListener('input', renderBookmarks);
  $('#linkDialogForm').addEventListener('submit', saveEditedLinks);
  $('#bookmarkDialogForm').addEventListener('submit', confirmBookmark);

  $$('.nav-item').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  document.addEventListener('click', (event) => {
    const load = event.target.closest('[data-load-bookmark]');
    if (load) return loadBookmark(load.dataset.loadBookmark);
    const copy = event.target.closest('[data-copy-bookmark]');
    if (copy) return copyBookmark(copy.dataset.copyBookmark);
    const open = event.target.closest('[data-open-bookmark]');
    if (open) return openBookmark(open.dataset.openBookmark);
    const del = event.target.closest('[data-delete-bookmark]');
    if (del) return deleteBookmark(del.dataset.deleteBookmark);
    const openView = event.target.closest('[data-open-view]');
    if (openView) return setView(openView.dataset.openView);
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      setView('repositories');
      $('#searchInput').focus();
    }
  });
}

loadBookmarks();
bindEvents();
loadRepositories();
