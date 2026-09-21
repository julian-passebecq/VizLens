import assert from 'node:assert/strict';
import {
  detectFamily,
  detectSubcategory,
  normalizeRepository,
  defaultLinkSelection,
  buildCopyLines,
  bookmarkSnapshot,
} from '../src/powerops-model.js';
import { listGithubRepositories } from '../server/github-repos.mjs';

assert.equal(detectFamily('foil-control-v1'), 'foil');
assert.equal(detectFamily('atlasnote'), 'atlas');
assert.equal(detectFamily('ducklabms_code'), 'datapass');
assert.equal(detectFamily('fabric-toolbox_J'), 'fabric');
assert.equal(detectFamily('reactoracle'), 'infra');
assert.equal(detectFamily('julianvuev2'), 'portfolio');
assert.equal(detectFamily('random-repo'), 'other');
assert.equal(detectSubcategory('foil', 'foil-ai-extension'), 'Extensions');

const repo = normalizeRepository({
  id: 1,
  name: 'foil-control-v1',
  fullName: 'julian-passebecq/foil-control-v1',
  htmlUrl: 'https://github.com/julian-passebecq/foil-control-v1',
  homepage: 'https://foil.example',
}, { chatgptUrl: 'https://chatgpt.com/c/example' });
const selections = new Map([[repo.id, defaultLinkSelection(repo)]]);
assert.deepEqual(buildCopyLines([repo], new Set([repo.id]), selections, 'all'), [
  'https://github.com/julian-passebecq/foil-control-v1',
  'https://foil.example',
  'https://chatgpt.com/c/example',
]);
selections.get(repo.id).website = false;
assert.deepEqual(buildCopyLines([repo], new Set([repo.id]), selections, 'all'), [
  'https://github.com/julian-passebecq/foil-control-v1',
  'https://chatgpt.com/c/example',
]);
const bookmark = bookmarkSnapshot({ id: 'b1', name: ' Foil Core ', selectedIds: new Set([repo.id]), linkSelections: selections });
assert.equal(bookmark.name, 'Foil Core');
assert.deepEqual(bookmark.repoIds, [repo.id]);

const fakeResponses = [
  [{ id: 1, name: 'one', full_name: 'owner/one', private: true, html_url: 'https://github.com/owner/one', updated_at: '2026-09-21T10:00:00Z', default_branch: 'main' }],
];
const calls = [];
const fetchImpl = async (url, options) => {
  calls.push({ url, options });
  const payload = fakeResponses.shift() || [];
  return { ok: true, status: 200, async json() { return payload; } };
};
const result = await listGithubRepositories({ token: 'secret-token', owner: 'owner', fetchImpl });
assert.equal(result.source, 'authenticated');
assert.equal(result.repositories.length, 1);
assert.match(calls[0].url, /\/user\/repos/);
assert.equal(calls[0].options.headers.authorization, 'Bearer secret-token');
assert.equal(JSON.stringify(result).includes('secret-token'), false);

console.log('Power Ops tests passed.');
