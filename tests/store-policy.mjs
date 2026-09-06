import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.name, 'VizLens Visual Research Browser');
assert.deepEqual(manifest.permissions.sort(), ['activeTab', 'scripting', 'sidePanel'].sort());
assert.ok(!manifest.host_permissions, 'Store build must not carry persistent host permissions.');
assert.deepEqual(manifest.optional_host_permissions, ['http://127.0.0.1/*']);

const gate = fs.readFileSync(path.join(root, 'src/store-gate.js'), 'utf8');
assert.match(gate, /AI data disclosure/);
assert.match(gate, /Free Tier note:/);
assert.match(gate, /chrome\.permissions\.request/);
assert.match(gate, /method === 'GET'/);
assert.match(gate, /permissionRequiredResponse/);
assert.doesNotMatch(gate, /innerHTML/);

const api = fs.readFileSync(path.join(root, 'src/gemini-api.js'), 'utf8');
assert.match(api, /storeFetch/);

const privacy = fs.readFileSync(path.join(root, 'PRIVACY.md'), 'utf8');
assert.match(privacy, /affirmative consent/i);
assert.match(privacy, /Google Gemini/);
assert.match(privacy, /does not request blanket/i);

for (const file of ['STORE_RELEASE_CHECKLIST.md', 'STORE_SUBMISSION_NOTES.md', 'STORE_ARCHITECTURE.md', 'scripts/build-store.mjs']) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} must exist`);
}

console.log('VizLens Chrome Web Store policy assertions passed.');
