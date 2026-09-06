import assert from 'node:assert/strict';
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
const { server, url } = await startFixtureServer({ port: 0 });
const launchArgs = [
  `--disable-extensions-except=${root}`,
  `--load-extension=${root}`,
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
  process.exit(2);
}

try {
  let extension = null;
  for (let i = 0; i < 20 && !extension; i += 1) {
    const extensions = await browser.extensions();
    extension = [...extensions.values()].find((item) => item.name === 'VizLens Visual Research Browser') || null;
    if (!extension) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(extension, 'Store extension must load in Chrome for Testing.');

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.triggerExtensionAction(extension);

  const extensionPage = await browser.newPage();
  await extensionPage.goto(`chrome-extension://${extension.id}/sidepanel.html`, { waitUntil: 'domcontentloaded' });

  const permission = await extensionPage.evaluate(() => chrome.permissions.contains({ origins: ['http://127.0.0.1/*'] }));
  assert.equal(permission, false, 'Localhost permission must not be pre-granted.');

  const scan = await extensionPage.evaluate(async (targetUrl) => {
    const tabs = await chrome.tabs.query({});
    const target = tabs.find((tab) => tab.url === targetUrl);
    if (!target?.id) throw new Error('Fixture tab not found.');
    const module = await import(chrome.runtime.getURL('src/page-scanner.js'));
    const result = await chrome.scripting.executeScript({
      target: { tabId: target.id },
      world: 'MAIN',
      func: module.scanPage,
    });
    return result?.[0]?.result || null;
  }, page.url());

  assert.ok(scan);
  assert.ok(scan.article?.headline?.includes('Prices, rates and election results'));
  assert.ok(scan.summary.tableCount >= 1);
  assert.ok(scan.summary.iframeCount >= 1);

  const gateExists = await extensionPage.evaluate(async () => {
    await import(chrome.runtime.getURL('src/store-gate.js'));
    return true;
  });
  assert.equal(gateExists, true);

  console.log(`VizLens Store browser E2E passed: ${extension.id.slice(0, 8)}...`);
} finally {
  await browser?.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}
