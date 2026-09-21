export const FAMILY_DEFINITIONS = [
  { id: 'foil', label: 'Foil', glyph: 'F', color: '#d99316', patterns: [/^foil/i, /databricks-vscode-foil/i] },
  { id: 'atlas', label: 'Atlas', glyph: 'A', color: '#1f70d8', patterns: [/^atlas/i] },
  { id: 'datapass', label: 'Datapass', glyph: 'D', color: '#12965f', patterns: [/datapass/i, /ducklab/i] },
  { id: 'fabric', label: 'Fabric', glyph: 'F', color: '#7b3fd0', patterns: [/fabric/i] },
  { id: 'infra', label: 'Infra', glyph: 'I', color: '#66758a', patterns: [/oracle/i, /infra/i, /docker/i, /kubernetes/i, /terraform/i, /grafana/i, /reactoracle/i] },
  { id: 'portfolio', label: 'Portfolio', glyph: 'P', color: '#d12c7f', patterns: [/portfolio/i, /julianvue/i, /bisite/i, /personal.*site/i] },
  { id: 'other', label: 'Other', glyph: '+', color: '#62748a', patterns: [] },
];

const SUBCATEGORY_RULES = {
  foil: [
    ['Core', /control|pilotage|core/i],
    ['Extensions', /extension|vscode|databrick/i],
    ['Experiments', /3d|web|pptx|stream/i],
  ],
  atlas: [
    ['Core', /note|code|core/i],
    ['Data', /mongo|data/i],
    ['Tools', /backup|tool/i],
  ],
  datapass: [
    ['Pipelines', /airflow|pipeline|runner/i],
    ['Workbench', /ducklab|studio|workbench/i],
    ['Connectors', /connector|api/i],
  ],
  fabric: [
    ['Tools', /tool|studio|extension/i],
    ['Samples', /contoso|sample/i],
  ],
  infra: [
    ['DevOps', /oracle|docker|terraform|kubernetes|infra|reactoracle/i],
    ['Monitoring', /grafana|monitor|observability/i],
  ],
  portfolio: [
    ['Apps', /julianvue|bisite|site|app/i],
    ['Showcase', /portfolio|showcase/i],
  ],
  other: [['Other', /.*/]],
};

export function detectFamily(name = '') {
  for (const family of FAMILY_DEFINITIONS) {
    if (family.id === 'other') continue;
    if (family.patterns.some((pattern) => pattern.test(name))) return family.id;
  }
  return 'other';
}

export function detectSubcategory(familyId, name = '') {
  const rules = SUBCATEGORY_RULES[familyId] || SUBCATEGORY_RULES.other;
  for (const [label, pattern] of rules) if (pattern.test(name)) return label;
  return familyId === 'other' ? 'Other' : 'Misc';
}

export function normalizeRepository(raw, overrides = {}) {
  const fullName = String(raw.fullName || raw.full_name || raw.name || '');
  const name = String(raw.name || fullName.split('/').pop() || 'repository');
  const family = overrides.family || detectFamily(name);
  const subcategory = overrides.subcategory || detectSubcategory(family, name);
  return {
    id: String(raw.id ?? fullName),
    name,
    fullName,
    private: Boolean(raw.private),
    description: String(raw.description || ''),
    htmlUrl: String(raw.htmlUrl || raw.html_url || ''),
    homepage: String(overrides.website || raw.homepage || ''),
    chatgptUrl: String(overrides.chatgptUrl || ''),
    language: String(raw.language || ''),
    updatedAt: String(raw.updatedAt || raw.updated_at || ''),
    defaultBranch: String(raw.defaultBranch || raw.default_branch || 'main'),
    topics: Array.isArray(raw.topics) ? raw.topics.map(String) : [],
    family,
    subcategory,
  };
}

export function collectAvailableLinks(repo) {
  return {
    github: repo.htmlUrl || '',
    website: repo.homepage || '',
    chatgpt: repo.chatgptUrl || '',
  };
}

export function defaultLinkSelection(repo) {
  const links = collectAvailableLinks(repo);
  return Object.fromEntries(Object.entries(links).map(([key, value]) => [key, Boolean(value)]));
}

export function buildCopyLines(repositories, selectedIds, linkSelections, kind = 'all') {
  const lines = [];
  for (const repo of repositories) {
    if (!selectedIds.has(repo.id)) continue;
    const links = collectAvailableLinks(repo);
    const selected = linkSelections.get(repo.id) || defaultLinkSelection(repo);
    for (const key of ['github', 'website', 'chatgpt']) {
      if (kind !== 'all' && kind !== key) continue;
      if (!selected[key] || !links[key]) continue;
      lines.push(links[key]);
    }
  }
  return lines;
}

export function familyCounts(repositories) {
  const counts = new Map(FAMILY_DEFINITIONS.map((family) => [family.id, 0]));
  for (const repo of repositories) counts.set(repo.family, (counts.get(repo.family) || 0) + 1);
  return counts;
}

export function uniqueLanguages(repositories) {
  return [...new Set(repositories.map((repo) => repo.language).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function bookmarkSnapshot({ id, name, selectedIds, linkSelections }) {
  const linkSelectionObject = {};
  for (const repoId of selectedIds) linkSelectionObject[repoId] = { ...(linkSelections.get(repoId) || {}) };
  return {
    id,
    name: name.trim(),
    repoIds: [...selectedIds],
    linkSelections: linkSelectionObject,
    updatedAt: new Date().toISOString(),
  };
}

export function humanizeUpdatedAt(value, now = Date.now()) {
  const stamp = Date.parse(value);
  if (!Number.isFinite(stamp)) return 'Unknown';
  const minutes = Math.max(0, Math.floor((now - stamp) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  return new Date(stamp).toLocaleDateString();
}
