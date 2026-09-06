import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist', 'store');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const files = [
  'manifest.json', 'sidepanel.html', 'sidepanel.css',
  'src/service-worker.js', 'src/model.js', 'src/article-facts.js', 'src/page-scanner.js',
  'src/ai-contract.js', 'src/store-gate.js', 'src/gemini-api.js', 'src/sidepanel.js',
  'icons/icon16.png', 'icons/icon32.png', 'icons/icon48.png', 'icons/icon128.png',
];

for (const rel of files) {
  const src = path.join(root, rel);
  const dst = path.join(out, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
if (manifest.host_permissions?.length) throw new Error('Store package must not contain persistent host_permissions.');
if (JSON.stringify(manifest.optional_host_permissions) !== JSON.stringify(['http://127.0.0.1/*'])) {
  throw new Error('Store package must keep localhost access optional.');
}

const textFiles = files.filter((f) => /\.(?:js|html|json)$/.test(f));
const bundle = textFiles.map((f) => fs.readFileSync(path.join(out, f), 'utf8')).join('\n');
if (/AQ\.[A-Za-z0-9_-]{20,}/.test(bundle)) throw new Error('Possible Gemini credential found in Store package.');
if (/https?:\/\/[^'"`\s]+\.(?:js|mjs)(?:[?'"`\s]|$)/i.test(bundle)) throw new Error('Remote executable JavaScript reference found.');

console.log(`VizLens Store package staged at ${out}`);
console.log(`${files.length} runtime files; localhost Gemini access remains optional.`);
