import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'manifest.json');
const original = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(original);
const compatibility = { ...manifest, host_permissions: ['http://127.0.0.1/*'] };
delete compatibility.optional_host_permissions;

fs.writeFileSync(manifestPath, JSON.stringify(compatibility, null, 2) + '\n');
try {
  await import(`${pathToFileURL(path.join(root, 'tests', 'run.mjs')).href}?store-core=${Date.now()}`);
} finally {
  fs.writeFileSync(manifestPath, original);
}
