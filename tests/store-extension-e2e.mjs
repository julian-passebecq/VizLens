import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFixtureServer } from './serve-fixtures.mjs';

let puppeteer;
try {
  puppeteer = await import('puppeteer-core');
} catch {
  console.error('puppeteer-core missing; run npm install.');
  process.exit(2);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productionManifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
assert.ok(productionManifest.permissions?.includes('activeTab'), 'Production Store manifest must use activeTab.');
assert.ok(!productionManifest.host_permissions, 'Production Store manifest must not have persistent host permissions.');
assert.deepEqual(productionManifest.optional_host_permissions, ['http://127.0.0.1/*']);

// Current Chrome-for-Testing/Puppeteer triggerAction does not reliably grant activeTab
// on Linux CI. Build a temporary E2E-only copy with fixture-host permission so the
// actual chrome.scripting + scanner path is still exercised in a real browser.
const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vizlens-store-e2e-'));
for (const rel of ['sidepanel.html', 'sidepanel.css', 'src', 'icons']) {
  fs.cpSync(path.join(root, rel), path.join(testRoot, rel), { recursive: true });
}
const testManifest = structuredClone(productionManifest);
testManifest.name = 'VizLens Visual Research Browser E2E';
testManifest.host_permissions = ['http://127.0.0.1/*'];
delete testManifest.optional_host_permissions;
fs.writeFileSync(path.join(testRoot, 'manifest.json'), JSON.stringify(testManifest, null, 2) + '\n');

const { server, url } = await startFixtureServer({ port: 0 });
const launchArgs = [
  `--disable-extensions-except=${testRoot}`,
  `--load-extension=${testRoot}`,
];
if (process.env.CI) launchArgs.unshift('--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage');

const launch = {
  headless: process.env.CI ? false : true,
  pipe: true,
  enableExtensions: true,
  dumpio: Boolean(process.env.CI),
  args: launchArgs,
};
if (process.env.CHROME_BIN) launch.executablePath = process.env.CHROME_BIN;
else launch.channel = process.env.CHROME_CHANNEL || 'chrome';

let browser;
try {
  browser = await puppeteer.default.launch(launch);
} catch (error) {
  console.error(String(error?.message || error));
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(testRoot, { recursive: true, force: true });
  process.exit(2);
}

try {
  let extension = null;
  for (let i = 0; i < 20 && !extension; i += 1) {
    const extensions = await browser.extensions();
    extension = [...extensions.values()].find((item) => item.name === 'VizLens Visual Research Browser E2E') || null;
    if (!extension) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(extension, 'VizLens E2E extension must load in Chrome for Testing.');
  assert.equal(extension.version, productionManifest.version);

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.bringToFront();
  await page.triggerExtensionAction(extension);

  let worker = null;
  for (let i = 0; i < 20 && !worker; i += 1) {
    const workers = await extension.workers();
    worker = workers[0] || null;
    if (!worker) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(worker, 'VizLens MV3 service worker must be available.');

  const targetTab = await worker.evaluate(async (expectedUrl) => {
    const tabs = await chrome.tabs.query({});
    return tabs.find((tab) => tab.url === expectedUrl) || null;
  }, page.url());
  assert.ok(targetTab?.id, 'Fixture tab must be visible to the E2E harness.');

  const extensionPage = await browser.newPage();
  await extensionPage.goto(`chrome-extension://${extension.id}/sidepanel.html`, { waitUntil: 'domcontentloaded' });
  await extensionPage.waitForSelector('#storeGeminiDisclosure');
  const disclosure = await extensionPage.$eval('#storeGeminiDisclosure', (node) => node.textContent || '');
  assert.match(disclosure, /AI data disclosure/);

  const scan = await extensionPage.evaluate(async (tabId) => {
    const module = await import(chrome.runtime.getURL('src/page-scanner.js'));
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: module.scanPage,
    });
    return result?.[0]?.result || null;
  }, targetTab.id);

  assert.ok(scan);
  assert.ok(scan.article?.headline?.includes('Prices, rates and election results'));
  assert.ok(scan.summary.tableCount >= 1);
  assert.ok(scan.summary.iframeCount >= 1);

  console.log(`VizLens Store real-browser integration passed: ${extension.id.slice(0, 8)}...`);
  console.log('Production activeTab/no-persistent-host policy was checked separately from the CI-only fixture permission.');
} finally {
  await browser?.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(testRoot, { recursive: true, force: true });
}
