import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startFixtureServer } from './serve-fixtures.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function chromePath() {
  const candidates = [
    process.env.CHROME_BIN,
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : null,
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : null,
    process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : null,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}
const executablePath = chromePath();
if (!executablePath) {
  console.error('No installed Chrome/Chromium found. Set CHROME_BIN to run the unpacked-extension E2E test.');
  process.exit(2);
}
const { server, url } = await startFixtureServer({ port:0 });
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vizlens-e2e-'));
let browser;
try {
  browser = await puppeteer.launch({
    executablePath,
    headless:false,
    userDataDir,
    enableExtensions:[root],
    args:['--no-first-run','--no-default-browser-check'],
  });
  const targets = await browser.targets();
  let worker = targets.find((target) => target.type() === 'service_worker' && target.url().startsWith('chrome-extension://'));
  for (let i = 0; !worker && i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    worker = browser.targets().find((target) => target.type() === 'service_worker' && target.url().startsWith('chrome-extension://'));
  }
  assert.ok(worker, 'VizLens service worker should load as an unpacked extension.');
  const extensionId = new URL(worker.url()).host;
  const page = await browser.newPage();
  await page.goto(url, { waitUntil:'domcontentloaded' });
  const session = await page.createCDPSession();
  const result = await session.send('Runtime.evaluate', { expression:'document.title', returnByValue:true });
  assert.match(result.result.value, /BBC-like VizLens fixture/);
  const panel = await browser.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil:'domcontentloaded' });
  assert.equal(await panel.$eval('h1', (node) => node.textContent), 'VizLens');
  assert.equal(await panel.$eval('#scanButton', (node) => node.textContent), 'Scan page');
  console.log(`VizLens unpacked-extension E2E passed with installed Chrome; extension ${extensionId.slice(0,8)}…`);
} finally {
  await browser?.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(userDataDir, { recursive:true, force:true });
}
