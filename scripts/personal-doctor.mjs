import fs from 'node:fs';
import process from 'node:process';

const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const rows = [];
const add = (name, ok, detail) => rows.push({ name, ok, detail });

const major = Number(process.versions.node.split('.')[0]);
add('Node.js', major >= 20, process.version);
add('Personal manifest', manifest.name === 'VizLens Personal Visual Research Browser' && manifest.version === packageJson.version, `${manifest.name} ${manifest.version} · package ${packageJson.version}`);
add('Local companion permission', Array.isArray(manifest.host_permissions) && manifest.host_permissions.includes('http://127.0.0.1/*'), (manifest.host_permissions || []).join(', ') || 'missing');
const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
const hasGoogleKey = Boolean(process.env.GOOGLE_API_KEY);
const keyDetail = hasGoogleKey && hasGeminiKey
  ? 'GOOGLE_API_KEY + GEMINI_API_KEY configured; GOOGLE_API_KEY takes precedence (values hidden)'
  : hasGoogleKey ? 'GOOGLE_API_KEY configured (value hidden)'
  : hasGeminiKey ? 'GEMINI_API_KEY configured (value hidden)'
  : 'not configured';
add('Gemini key env', hasGoogleKey || hasGeminiKey, keyDetail);
const extensionOrigin = String(process.env.VIZLENS_EXTENSION_ORIGIN || '').trim();
add('Extension origin lock', Boolean(extensionOrigin), extensionOrigin ? 'exact chrome-extension:// origin configured' : 'optional hardening not configured; proxy accepts requests from Chrome extension origins only');

try {
  const response = await fetch('http://127.0.0.1:3987/health', { signal: AbortSignal.timeout(1800) });
  const body = await response.json().catch(() => ({}));
  add('Gemini companion', response.ok && body?.ok !== false, response.ok ? `reachable · ${body?.model || 'model unknown'} · key ${body?.keyConfigured ? 'configured' : 'missing'}` : `HTTP ${response.status}`);
} catch {
  add('Gemini companion', false, 'offline (run start-vizlens.cmd or npm run proxy)');
}

for (const row of rows) console.log(`${row.ok ? 'PASS' : 'INFO'}  ${row.name}: ${row.detail}`);
const hardFailures = rows.filter((row) => ['Node.js','Personal manifest','Local companion permission'].includes(row.name) && !row.ok);
if (hardFailures.length) process.exit(1);
