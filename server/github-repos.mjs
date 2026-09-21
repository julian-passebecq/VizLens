const API_ROOT = 'https://api.github.com';
const DEFAULT_OWNER = 'julian-passebecq';
const MAX_PAGES = 10;
const PER_PAGE = 100;

export function githubToken() {
  return String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
}

export function githubOwner() {
  return String(process.env.GITHUB_OWNER || DEFAULT_OWNER).trim() || DEFAULT_OWNER;
}

function repoShape(repo) {
  return {
    id: String(repo.id),
    name: String(repo.name || ''),
    fullName: String(repo.full_name || ''),
    private: Boolean(repo.private),
    description: String(repo.description || ''),
    htmlUrl: String(repo.html_url || ''),
    homepage: String(repo.homepage || ''),
    language: String(repo.language || ''),
    updatedAt: String(repo.updated_at || ''),
    defaultBranch: String(repo.default_branch || 'main'),
    topics: Array.isArray(repo.topics) ? repo.topics.map(String) : [],
  };
}

async function readGithubJson(response) {
  let payload = null;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok) {
    const message = payload?.message || `GitHub API request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status === 401 || response.status === 403 ? 502 : response.status;
    error.code = 'GITHUB_API_ERROR';
    error.githubStatus = response.status;
    throw error;
  }
  if (!Array.isArray(payload)) {
    const error = new Error('GitHub repository response was not an array.');
    error.status = 502;
    error.code = 'GITHUB_RESPONSE_INVALID';
    throw error;
  }
  return payload;
}

export async function listGithubRepositories({ token = githubToken(), owner = githubOwner(), fetchImpl = fetch } = {}) {
  const authenticated = Boolean(token);
  const repositories = [];
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'VizLens-PowerOps/1.0',
    'x-github-api-version': '2022-11-28',
  };
  if (authenticated) headers.authorization = `Bearer ${token}`;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const path = authenticated
      ? `/user/repos?per_page=${PER_PAGE}&page=${page}&sort=updated&direction=desc&affiliation=owner,collaborator,organization_member`
      : `/users/${encodeURIComponent(owner)}/repos?per_page=${PER_PAGE}&page=${page}&sort=updated&direction=desc`;
    const response = await fetchImpl(`${API_ROOT}${path}`, { headers });
    const batch = await readGithubJson(response);
    repositories.push(...batch.map(repoShape));
    if (batch.length < PER_PAGE) break;
  }

  const deduped = new Map(repositories.map((repo) => [repo.id, repo]));
  return {
    owner,
    source: authenticated ? 'authenticated' : 'public',
    repositories: [...deduped.values()].sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0)),
  };
}
