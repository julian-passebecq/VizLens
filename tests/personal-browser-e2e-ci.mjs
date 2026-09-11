import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startFixtureServer } from './serve-fixtures.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.name, 'VizLens Personal Visual Research Browser');
assert.ok(manifest.permissions?.includes('activeTab'));
assert.ok(manifest.permissions?.includes('scripting'));
assert.ok(manifest.permissions?.includes('sidePanel'));
assert.ok(manifest.host_permissions?.includes('http://127.0.0.1/*'));

const { server, url } = await startFixtureServer({ port: 0 });
const args = [];
if (process.env.CI) args.unshift('--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage');

const launch = {
  executablePath: process.env.CHROME_BIN,
  headless: process.env.CI ? false : true,
  pipe: true,
  enableExtensions: [root],
  dumpio: Boolean(process.env.CI),
  args,
};

let browser;
try {
  browser = await puppeteer.launch(launch);
  let extension = null;
  for (let i = 0; i < 20 && !extension; i += 1) {
    const extensions = await browser.extensions();
    extension = [...extensions.values()].find((item) => item.name === manifest.name) || null;
    if (!extension) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(extension, 'Personal VizLens extension must load in Chrome for Testing.');

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const panel = await browser.newPage();
  await panel.goto(`chrome-extension://${extension.id}/sidepanel.html`, { waitUntil: 'domcontentloaded' });
  assert.equal(await panel.$eval('h1', (node) => node.textContent), 'VizLens');
  assert.equal(await panel.$eval('#scanButton', (node) => node.textContent), 'Scan page');

  const target = await panel.evaluate(async (fixtureUrl) => {
    const tabs = await chrome.tabs.query({});
    return tabs.find((tab) => tab.url === fixtureUrl) || null;
  }, page.url());
  assert.ok(target?.id, 'Fixture tab must be visible to the extension.');

  const scan = await panel.evaluate(async (tabId) => {
    const module = await import(chrome.runtime.getURL('src/page-scanner.js'));
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: module.scanPage,
    });
    return result?.[0]?.result || null;
  }, target.id);

  assert.ok(scan);
  assert.ok(scan.article?.headline?.includes('Prices, rates and election results'));
  assert.ok(scan.summary.tableCount >= 1);
  assert.ok(scan.summary.iframeCount >= 1);
  assert.ok(scan.summary.visualCount >= 1);

  // Exercise the actual Scan page handler and rendered tabs on each fixture.
  const errors = [];
  panel.on('pageerror', (error) => errors.push(error.message));
  for (const [fixture, headline] of [
    ['bbc-like.html', 'Prices, rates and election results'],
    ['d3-bound.html', 'Quarterly revenue chart'],
    ['plotly-runtime.html', 'Monthly traffic trend'],
  ]) {
    await page.goto(new URL(fixture, url).href, { waitUntil: 'load' });
    await page.bringToFront();
    await panel.evaluate(() => document.querySelector('#scanButton').click());
    await panel.waitForFunction(() => !document.querySelector('#scanButton').disabled, { polling: 100 });
    assert.match(await panel.$eval('#status', (node) => node.textContent), /visual candidates found/);
    assert.equal(await panel.$eval('#articleTitle', (node) => node.textContent), headline);
    assert.ok((await panel.$$('.visual-card')).length >= 1);
    for (const tab of ['article', 'data', 'source', 'vizforge', 'powerbi']) {
      await panel.evaluate((name) => document.querySelector(`#tab-${name}`).click(), tab);
      assert.equal(await panel.$eval(`#tab-${tab}`, (node) => node.getAttribute('aria-selected')), 'true');
    }
    console.log(`PASS browser scan and tabs: ${fixture}`);
  }
  assert.deepEqual(errors, [], 'The side panel must not throw uncaught errors.');

  console.log(`VizLens Personal real-browser CI passed: ${extension.id.slice(0, 8)}...`);
} finally {
  await browser?.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}
