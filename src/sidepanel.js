import { scanPage, focusVisual, extractSvg, measureVisual, measureVisuals } from './page-scanner.js';
import {
  bestRowsForVisual,
  inferVizForgeFamily,
  makeArticleVisualRecipe,
  makePowerBIHandoff,
  makeVizForgeResearchBrief,
  rowsToCsv,
  slugify,
} from './model.js';
import { analyzeViewportWithGemini, getGeminiApiStatus, planVisualWithGemini } from './gemini-api.js';
import { extractNumericFacts, makeTextScan } from './article-facts.js';

const state = {
  scan: null,
  selectedId: null,
  aiResult: null,
  aiExport: null,
  lastViewportDataUrl: null,
  lastViewportAnalysis: null,
  importedDocumentText: false,
};
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const scanButton = $('#scanButton');
const viewportButton = $('#viewportButton');
const status = $('#status');
const summary = $('#summary');
const visualList = $('#visualList');
const template = $('#visualCardTemplate');

function setStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? 'var(--warn)' : '';
}

function pageAccessGuidance(error) {
  const message = String(error?.message || error || '');
  if (/chrome:\/\/|edge:\/\/|about:|Chrome Web Store|extensions gallery cannot be scripted|Cannot access a chrome/i.test(message)) {
    return 'This browser-internal page cannot be inspected through the DOM. Use Analyze viewport for visible PDFs/internal pages, or paste selectable text in the Gemini tab.';
  }
  if (/Cannot access contents of url|Missing host permission|Cannot access page|The extensions gallery cannot be scripted|Cannot access.*origin/i.test(message)) {
    return 'Temporary page access is no longer active, usually after navigating to another site. Click the VizLens toolbar icon while on this page to re-grant activeTab access, then try again.';
  }
  return null;
}

function formatPageActionError(prefix, error) {
  return pageAccessGuidance(error) || `${prefix}: ${error?.message || error}`;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active browser tab is available.');
  return tab;
}

async function runInPage(func, args = []) {
  const tab = await activeTab();
  const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func, args });
  if (!results?.length) throw new Error('The page returned no inspection result.');
  return results[0].result;
}

function visualById(id = state.selectedId) {
  return state.scan?.visuals?.find((visual) => visual.id === id) || null;
}

function labelFor(visual) {
  if (!visual) return 'visual';
  return visual.title || visual.context?.caption || `${visual.library || visual.kind} ${visual.id}`;
}

function metaFor(visual) {
  const bits = [];
  if (visual.markCount != null) bits.push(`${visual.markCount} marks/rows`);
  if (visual.boundMarkCount) bits.push(`${visual.boundMarkCount} bound`);
  if (visual.rect) bits.push(`${Math.round(visual.rect.width)}×${Math.round(visual.rect.height)}`);
  if (visual.primaryScore != null) bits.push(`main ${Math.round(visual.primaryScore * 100)}%`);
  return bits.join(' · ') || visual.kind;
}

function downloadBlob(filename, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function selectVisual(id) {
  state.selectedId = id;
  $$('.visual-card').forEach((card) => card.classList.toggle('selected', card.dataset.visualId === id));
  renderData();
  renderVizForge();
  renderPowerBI();
}

function renderVisuals() {
  visualList.replaceChildren();
  if (!state.scan) {
    summary.textContent = 'No scan yet.';
    summary.classList.add('empty');
    return;
  }
  const scan = state.scan;
  summary.classList.remove('empty');
  summary.textContent = `${scan.summary.visualCount} candidates · ${scan.summary.svgCount} SVG · ${scan.summary.canvasCount} canvas · ${scan.summary.tableCount} tables · ${scan.summary.iframeCount || 0} embeds · ${scan.summary.dataBoundVisualCount} with bound data`;

  for (const visual of scan.visuals || []) {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector('.visual-card');
    card.dataset.visualId = visual.id;
    fragment.querySelector('.visual-kind').textContent = visual.kind;
    fragment.querySelector('.visual-library').textContent = visual.library || 'unknown';
    fragment.querySelector('.visual-title').textContent = labelFor(visual);
    fragment.querySelector('.visual-meta').textContent = metaFor(visual);
    const badge = fragment.querySelector('.primary-badge');
    badge.hidden = visual.id !== scan.summary.primaryVisualId;
    fragment.querySelector('.visual-select').addEventListener('click', () => selectVisual(visual.id));
    fragment.querySelector('[data-action="focus"]').addEventListener('click', () => focus(visual));
    fragment.querySelector('[data-action="png"]').addEventListener('click', () => exportPng(visual));
    const svgButton = fragment.querySelector('[data-action="svg"]');
    svgButton.disabled = visual.kind !== 'svg';
    svgButton.addEventListener('click', () => exportSvg(visual));
    fragment.querySelector('[data-action="json"]').addEventListener('click', () => exportJson(visual));
    visualList.append(fragment);
  }

  const defaultId = scan.summary.primaryVisualId || scan.visuals?.[0]?.id;
  if (defaultId) selectVisual(defaultId);
}

function renderArticle() {
  const empty = $('#articleEmpty');
  const content = $('#articleContent');
  const article = state.scan?.article;
  if (!article) { empty.hidden = false; content.hidden = true; return; }
  empty.hidden = true; content.hidden = false;
  $('#articleTitle').textContent = article.headline || state.scan.page.title || 'Article';
  const factCount = extractNumericFacts(article).length;
  $('#articleMeta').textContent = [article.author, article.published, article.wordCount ? `${article.wordCount} words captured` : '', `${factCount} numeric facts`, article.importedText ? 'imported document text' : (article.likelyArticle ? 'article-like content' : 'generic page')].filter(Boolean).join(' · ');
  const blocks = $('#articleBlocks');
  blocks.replaceChildren();
  for (const block of (article.blocks || []).slice(0, 60)) {
    const node = document.createElement('div');
    node.className = `article-block ${block.type === 'heading' ? 'heading' : ''}`;
    const id = document.createElement('span'); id.className = 'evidence-id'; id.textContent = block.id;
    const text = document.createElement('span'); text.textContent = block.text;
    node.append(id, text); blocks.append(node);
  }
}

function renderData() {
  const visual = visualById();
  const empty = $('#dataEmpty');
  const content = $('#dataContent');
  if (!visual) { empty.hidden = false; content.hidden = true; return; }
  empty.hidden = true; content.hidden = false;
  $('#dataTitle').textContent = labelFor(visual);
  const mappings = (visual.groups || []).flatMap((group) => group.mappings || []).slice(0, 16);
  const mappingList = $('#mappingList'); mappingList.replaceChildren();
  if (!mappings.length) {
    const node = document.createElement('div'); node.className = 'mapping';
    node.textContent = 'No high-confidence mark mapping recovered. Runtime or tabular data may still be available below.';
    mappingList.append(node);
  } else {
    for (const mapping of mappings) {
      const node = document.createElement('div'); node.className = 'mapping';
      const field = document.createElement('b'); field.textContent = String(mapping.data || 'field');
      const detail = mapping.type === 'linear'
        ? ` → ${String(mapping.attr || '')} · R² ${Number(mapping.r2).toFixed(3)} · ${mapping.samples} marks`
        : ` → ${String(mapping.attr || '')} · categorical mapping · ${mapping.samples} marks`;
      node.append(field, document.createTextNode(detail));
      mappingList.append(node);
    }
  }
  const rows = bestRowsForVisual(visual);
  renderTable(rows);
  $('#downloadCsvButton').disabled = rows.length === 0;
}

function renderTable(rows) {
  const table = $('#dataTable'); table.replaceChildren();
  if (!rows?.length) {
    const tbody = document.createElement('tbody'); const tr = document.createElement('tr'); const td = document.createElement('td');
    td.textContent = 'No tabular rows recovered for this visual.'; tr.append(td); tbody.append(tr); table.append(tbody); return;
  }
  const normalized = rows.slice(0, 100).map((row) => row && typeof row === 'object' && !Array.isArray(row) ? row : { value: row });
  const keys = [...new Set(normalized.flatMap((row) => Object.keys(row)))].slice(0, 24);
  const thead = document.createElement('thead'); const hr = document.createElement('tr');
  for (const key of keys) { const th = document.createElement('th'); th.textContent = key; hr.append(th); }
  thead.append(hr); table.append(thead);
  const tbody = document.createElement('tbody');
  for (const row of normalized) {
    const tr = document.createElement('tr');
    for (const key of keys) { const td = document.createElement('td'); const value = row[key]; td.textContent = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value); td.title = td.textContent; tr.append(td); }
    tbody.append(tr);
  }
  table.append(tbody);
}

function renderSource() {
  const content = $('#sourceContent'); content.replaceChildren();
  if (!state.scan) { content.textContent = 'Scan a page to see candidate data and library resources.'; return; }
  content.classList.remove('empty-state');
  const selected = visualById();
  const details = document.createElement('div'); details.className = 'source-group';
  const heading = document.createElement('h3'); heading.textContent = 'Selected visual';
  const identity = document.createElement('code'); identity.textContent = selected ? `${selected.library} · ${selected.selectorHint || selected.kind}` : 'None';
  const context = document.createElement('code'); context.textContent = selected?.context?.caption || selected?.context?.heading || '';
  details.append(heading, identity, context);
  content.append(details, sourceGroup('Candidate data resources', state.scan.resources), sourceGroup('Detected visualization scripts', state.scan.scripts));
}

function sourceGroup(title, items) {
  const group = document.createElement('div'); group.className = 'source-group';
  const h3 = document.createElement('h3'); h3.textContent = title; group.append(h3);
  if (!items?.length) { const p = document.createElement('code'); p.textContent = 'None detected from the page resource timeline.'; group.append(p); return group; }
  for (const item of items.slice(0, 40)) { const code = document.createElement('code'); code.textContent = item; group.append(code); }
  return group;
}

function renderVizForge() {
  const visual = visualById();
  const empty = $('#vizforgeEmpty'); const content = $('#vizforgeContent');
  if (!visual || !state.scan) { empty.hidden = false; content.hidden = true; return; }
  empty.hidden = true; content.hidden = false;
  const inference = inferVizForgeFamily(visual); const brief = makeVizForgeResearchBrief(state.scan, visual);
  const summaryNode = $('#vizforgeSummary'); summaryNode.replaceChildren();
  const strong = document.createElement('strong'); strong.textContent = inference.family || 'Research only';
  summaryNode.append(strong);
  if (inference.family) summaryNode.append(document.createTextNode(` · confidence ${Math.round(inference.confidence * 100)}%`));
  summaryNode.append(document.createElement('br'), document.createTextNode(inference.reason || ''));
  $('#vizforgePreview').textContent = JSON.stringify(brief, null, 2);
}

function renderPowerBI() {
  const visual = visualById(); const empty = $('#powerbiEmpty'); const content = $('#powerbiContent');
  if (!visual || !state.scan) { empty.hidden = false; content.hidden = true; return; }
  empty.hidden = true; content.hidden = false;
  $('#powerbiPreview').textContent = JSON.stringify(makePowerBIHandoff(state.scan, visual), null, 2);
}

function renderAiResult(result) {
  state.aiResult = result;
  const normalized = result?.result?.kind === 'vizlens-visual-json'
    ? result.result
    : result?.kind === 'vizlens-visual-json'
      ? result
      : result?.result?.kind === 'existing-visual-recipe'
        ? result.result.result
        : result?.result?.kind
          ? result.result
          : result;
  state.aiExport = normalized || null;
  $('#aiResultEmpty').hidden = Boolean(result);
  $('#aiResultContent').hidden = !result;
  if (!result) return;
  $('#aiPreview').textContent = JSON.stringify(normalized, null, 2);
  const cropButton = $('#downloadCropButton');
  cropButton.hidden = !(state.lastViewportAnalysis?.hasPrimaryVisual && state.lastViewportDataUrl);
}


async function scan() {
  scanButton.disabled = true;
  setStatus('Scanning rendered visuals, bound data, article structure and page resources…');
  try {
    state.scan = await runInPage(scanPage);
    state.selectedId = null;
    renderVisuals(); renderArticle(); renderSource(); renderData(); renderVizForge(); renderPowerBI();
    const primary = visualById(state.scan.summary.primaryVisualId);
    setStatus(`${state.scan.summary.visualCount} visual candidates found. Primary heuristic: ${primary ? labelFor(primary) : 'none'}.`);
  } catch (error) {
    console.error(error);
    setStatus(formatPageActionError('DOM inspection failed', error), true);
  } finally { scanButton.disabled = false; }
}

async function focus(visual) {
  try { await runInPage(focusVisual, [visual.id]); setStatus(`Focused ${labelFor(visual)}.`); }
  catch (error) { setStatus(formatPageActionError('Could not focus visual', error), true); }
}

async function exportSvg(visual) {
  if (visual.kind !== 'svg') return;
  try {
    const svg = await runInPage(extractSvg, [visual.id]);
    if (!svg) throw new Error('SVG serialization failed.');
    downloadBlob(`${slugify(labelFor(visual))}.svg`, svg, 'image/svg+xml;charset=utf-8');
    setStatus('Exported SVG with key computed presentation styles inlined.');
  } catch (error) { setStatus(formatPageActionError('SVG export failed', error), true); }
}

async function captureViewportDataUrl() {
  const tab = await activeTab();
  return chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
}

async function exportPng(visual) {
  let image = null;
  try {
    const measurement = await runInPage(measureVisual, [visual.id]);
    if (!measurement?.rect) throw new Error('Could not re-measure the selected visual.');
    const dataUrl = await captureViewportDataUrl();
    image = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const viewport = measurement.viewport || state.scan?.page?.viewport || { width: image.width, height: image.height };
    const sxScale = image.width / viewport.width; const syScale = image.height / viewport.height; const rect = measurement.rect;
    const sx = Math.max(0, Math.round(rect.x * sxScale)); const sy = Math.max(0, Math.round(rect.y * syScale));
    const sw = Math.max(1, Math.min(image.width - sx, Math.round(rect.width * sxScale))); const sh = Math.max(1, Math.min(image.height - sy, Math.round(rect.height * syScale)));
    if (rect.right <= 0 || rect.bottom <= 0 || rect.x >= viewport.width || rect.y >= viewport.height || sw <= 1 || sh <= 1) {
      throw new Error('The visual is outside the visible viewport. Use Focus, then export PNG again.');
    }
    const canvas = new OffscreenCanvas(sw, sh); const ctx = canvas.getContext('2d'); ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    downloadBlob(`${slugify(labelFor(visual))}.png`, blob, 'image/png'); setStatus('Exported the currently visible visual region as PNG.');
  } catch (error) { setStatus(formatPageActionError('PNG export failed', error), true); }
  finally { image?.close?.(); }
}

function exportJson(visual) {
  downloadBlob(`${slugify(labelFor(visual))}-evidence.json`, JSON.stringify({ page: state.scan?.page, article: state.scan?.article, visual }, null, 2), 'application/json;charset=utf-8');
  setStatus('Exported recovered visual evidence as JSON.');
}

async function resizeBlobForGemini(blob, { maxEdge = 1600, maxPixels = 1_800_000 } = {}) {
  const image = await createImageBitmap(blob);
  try {
    const edgeScale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const pixelScale = Math.min(1, Math.sqrt(maxPixels / Math.max(1, image.width * image.height)));
    const scale = Math.min(edgeScale, pixelScale);
    if (scale >= 0.995) return blob;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    return await canvas.convertToBlob({ type: 'image/webp', quality: 0.9 });
  } finally { image.close?.(); }
}

async function annotateScreenshot(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  if (!state.scan?.visuals?.length) return resizeBlobForGemini(blob);
  const image = await createImageBitmap(blob);
  try {
    const ids = state.scan.visuals.slice(0, 20).map((visual) => visual.id);
    let measurements = [];
    try { measurements = await runInPage(measureVisuals, [ids]); } catch {}
    const measurementById = new Map((measurements || []).map((item) => [item.id, item.measurement]));
    const edgeScale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const pixelScale = Math.min(1, Math.sqrt(1_800_000 / Math.max(1, image.width * image.height)));
    const scale = Math.min(edgeScale, pixelScale);
    const canvasWidth = Math.max(1, Math.round(image.width * scale));
    const canvasHeight = Math.max(1, Math.round(image.height * scale));
    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight); const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
    const liveViewport = measurements?.[0]?.measurement?.viewport;
    const viewport = liveViewport || state.scan.page.viewport || { width: image.width, height: image.height };
    const rx = canvasWidth / viewport.width; const ry = canvasHeight / viewport.height;
    ctx.lineWidth = Math.max(2, Math.round(canvasWidth / 800)); ctx.font = `${Math.max(13, Math.round(canvasWidth / 75))}px sans-serif`;
    state.scan.visuals.slice(0, 20).forEach((visual, index) => {
      const r = measurementById.get(visual.id)?.rect || visual.rect; if (!r) return;
      if (r.right <= 0 || r.bottom <= 0 || r.x >= viewport.width || r.y >= viewport.height) return;
      const x = r.x * rx; const y = r.y * ry; const w = r.width * rx; const h = r.height * ry;
      ctx.strokeStyle = '#0f6cbd'; ctx.fillStyle = '#0f6cbd'; ctx.strokeRect(x, y, w, h);
      const label = `V${index + 1}`; const textWidth = ctx.measureText(label).width + 10; const labelH = Math.max(18, Math.round(canvasHeight / 45));
      ctx.fillRect(x, Math.max(0, y - labelH), textWidth, labelH); ctx.fillStyle = '#ffffff'; ctx.fillText(label, x + 5, Math.max(14, y - 4));
    });
    return await canvas.convertToBlob({ type: 'image/webp', quality: 0.9 });
  } finally { image.close?.(); }
}

function describeGeminiError(error) {
  const message = String(error?.message || error || 'Gemini request failed.');
  const requestSuffix = error?.requestId ? ` Request ${String(error.requestId).slice(0, 12)}.` : '';
  const retryMs = Number(error?.retryAfterMs);
  if (Number.isFinite(retryMs) && retryMs > 0) {
    const seconds = Math.max(1, Math.ceil(retryMs / 1000));
    return `${message} Suggested wait: about ${seconds}s.${requestSuffix}`;
  }
  if (error?.code === 'LOCAL_BUSY') return `${message} Wait for the current VizLens analysis to finish.${requestSuffix}`;
  return `${message}${requestSuffix}`;
}

async function analyzeArticle() {
  const button = $('#aiAnalyzeButton');
  button.disabled = true;
  try {
    if (!state.scan) throw new Error('Scan the page first.');
    setStatus('Sending grounded evidence to Gemini through the local VizLens proxy. Page text remains untrusted evidence.');

    let annotated = null;
    if (!state.scan?.article?.importedText && state.scan?.visuals?.length) {
      try {
        const screenshot = await captureViewportDataUrl();
        annotated = await annotateScreenshot(screenshot);
      } catch {
        annotated = null;
      }
    }

    const result = await planVisualWithGemini(state.scan, annotated);
    state.lastViewportAnalysis = null;
    state.lastViewportDataUrl = null;
    renderAiResult(result);
    if (Number(result?.apiRequests || 0) === 0) setStatus('VizLens found no plannable visual evidence and kept this research-only without spending a Gemini request.');
    else setStatus('Gemini completed one allowlisted planning function call. VizLens validated its arguments, bound time evidence, and materialized the final JSON from host-owned facts.');
  } catch (error) {
    const visual = visualById(state.scan?.summary?.primaryVisualId) || visualById();
    const facts = extractNumericFacts(state.scan?.article);
    const failure = describeGeminiError(error);
    const fallback = { kind: 'deterministic-fallback', reason: failure, numericFacts: facts, result: makeArticleVisualRecipe(state.scan, visual) };
    state.lastViewportAnalysis = null;
    state.lastViewportDataUrl = null;
    renderAiResult(fallback);
    setStatus(`Gemini unavailable; deterministic grounded fallback used (${failure}).`, true);
  } finally {
    button.disabled = false;
    updateAiAvailability().catch(() => {});
  }
}

async function analyzeImportedText() {
  const input = $('#documentTextInput');
  const text = input?.value?.trim() || '';
  if (text.length < 40) {
    setStatus('Paste at least a short article or PDF-text passage before converting it.', true);
    return;
  }
  state.scan = makeTextScan(text, { title: 'Imported article / PDF text', headline: text.split(/\n+/)[0]?.slice(0, 180) || 'Imported document' });
  state.selectedId = null;
  state.importedDocumentText = true;
  renderVisuals(); renderArticle(); renderSource(); renderData(); renderVizForge(); renderPowerBI();
  switchTab('ai');
  setStatus(`Imported ${state.scan.article.wordCount} words with ${extractNumericFacts(state.scan.article).length} deterministic numeric facts. Running Gemini planner…`);
  await analyzeArticle();
}

async function analyzeViewport() {
  viewportButton.disabled = true;
  try {
    setStatus('Sending the visible viewport to Gemini 3.8 Flash through the local proxy…');
    const tab = await activeTab();
    const dataUrl = await captureViewportDataUrl();
    const blob = await (await fetch(dataUrl)).blob();
    const analysisBlob = await resizeBlobForGemini(blob);
    const analysis = await analyzeViewportWithGemini(analysisBlob, { title: tab.title || '' });
    state.lastViewportDataUrl = dataUrl;
    state.lastViewportAnalysis = analysis;
    renderAiResult(analysis);
    setStatus(analysis.hasPrimaryVisual ? `Gemini detected primary ${analysis.visualType}: ${analysis.title || 'visual'}.` : 'Gemini found no clear analytical visual in the current viewport.');
    switchTab('ai');
  } catch (error) {
    setStatus(`Viewport analysis failed: ${describeGeminiError(error)}`, true);
  } finally {
    viewportButton.disabled = false;
    updateAiAvailability().catch(() => {});
  }
}

async function exportDetectedCrop() {
  const dataUrl = state.lastViewportDataUrl; const analysis = state.lastViewportAnalysis;
  if (!dataUrl || !analysis?.hasPrimaryVisual) return;
  const image = await createImageBitmap(await (await fetch(dataUrl)).blob());
  try {
    const box = analysis.bbox;
    const sx = Math.max(0, Math.floor(box.x * image.width)); const sy = Math.max(0, Math.floor(box.y * image.height));
    const sw = Math.max(1, Math.min(image.width - sx, Math.ceil(box.width * image.width))); const sh = Math.max(1, Math.min(image.height - sy, Math.ceil(box.height * image.height)));
    const canvas = new OffscreenCanvas(sw, sh); canvas.getContext('2d').drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
    downloadBlob(`${slugify(analysis.title || 'detected-visual')}.png`, await canvas.convertToBlob({ type: 'image/png' }), 'image/png');
  } finally { image.close?.(); }
}

function switchTab(name, { focus = false } = {}) {
  $$('.tab').forEach((item) => {
    const selected = item.dataset.tab === name;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    if (selected && focus) item.focus();
  });
  $$('.panel').forEach((panel) => {
    const selected = panel.id === `${name}Panel`;
    panel.classList.toggle('active', selected);
    panel.setAttribute('aria-hidden', String(!selected));
  });
  if (name === 'source') renderSource();
}

function handleTabKeydown(event) {
  const tabs = $$('.tab');
  const index = tabs.indexOf(event.currentTarget);
  if (index < 0) return;
  let next = null;
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
  else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = tabs.length - 1;
  if (next == null) return;
  event.preventDefault();
  switchTab(tabs[next].dataset.tab, { focus: true });
}


async function exportDiagnostics() {
  let gemini = null;
  try {
    const info = await getGeminiApiStatus();
    gemini = {
      ok: Boolean(info?.ok),
      keyConfigured: Boolean(info?.keyConfigured),
      model: info?.model || null,
      proxyVersion: info?.proxyVersion || null,
      apiSchema: info?.apiSchema || null,
      proxyStats: info?.proxyStats || null,
    };
  } catch (error) {
    gemini = { ok: false, error: String(error?.message || error || 'unavailable') };
  }
  const selected = visualById();
  const report = {
    kind: 'vizlens-diagnostic',
    version: chrome.runtime.getManifest().version,
    generatedAt: new Date().toISOString(),
    page: state.scan?.page || null,
    summary: state.scan?.summary || null,
    article: state.scan?.article ? {
      headline: state.scan.article.headline || '',
      wordCount: state.scan.article.wordCount || 0,
      blockCount: state.scan.article.blocks?.length || 0,
      numericFactCount: extractNumericFacts(state.scan.article).length,
      hasAuthor: Boolean(state.scan.article.author),
      hasPublished: Boolean(state.scan.article.published),
      jsonLdBlockCount: (state.scan.article.blocks || []).filter((block) => block.source === 'json-ld').length,
    } : null,
    visuals: (state.scan?.visuals || []).slice(0, 40).map((visual) => ({
      id: visual.id,
      kind: visual.kind,
      library: visual.library || '',
      title: visual.title || visual.context?.caption || '',
      primaryScore: visual.primaryScore ?? null,
      chartTypes: visual.chartTypes || [],
      boundMarkCount: visual.boundMarkCount ?? null,
      rect: visual.rect || null,
      src: ['iframe','image'].includes(visual.kind) ? visual.src || '' : undefined,
      sourceAttribute: visual.sourceAttribute || undefined,
      lazySource: visual.lazySource || false,
    })),
    selectedVisualId: selected?.id || null,
    gemini,
    aiResultKind: state.aiExport?.kind || state.aiResult?.kind || state.aiResult?.result?.kind || null,
  };
  downloadBlob('vizlens-diagnostic.json', JSON.stringify(report, null, 2), 'application/json;charset=utf-8');
  setStatus('Exported a privacy-reduced diagnostic JSON. Send this file with a failing URL to reproduce a VizLens issue.');
}

async function updateAiAvailability() {
  const box = $('#aiAvailability');
  const info = await getGeminiApiStatus();
  if (info.ok && info.keyConfigured) {
    const calls = Number(info.proxyStats?.geminiApiRequests || 0);
    box.textContent = `Gemini API: ready · ${info.model || 'gemini-3.8-flash'} · personal localhost companion · at most one function-call request per article plan · ${calls} Gemini request${calls === 1 ? '' : 's'} this proxy session.`;
    return;
  }
  if (info.ok && !info.keyConfigured) {
    box.textContent = 'Gemini proxy is running, but no server-side GEMINI_API_KEY/GOOGLE_API_KEY is configured.';
    return;
  }
  box.textContent = 'Gemini proxy is offline. Start start-vizlens.cmd (Windows) or npm run proxy after setting GEMINI_API_KEY. Deterministic extraction still works.';
}

scanButton.addEventListener('click', scan);
viewportButton.addEventListener('click', analyzeViewport);
$('#diagnosticsButton')?.addEventListener('click', exportDiagnostics);
$('#aiAnalyzeButton').addEventListener('click', analyzeArticle);
$('#documentTextAnalyzeButton')?.addEventListener('click', analyzeImportedText);
$('#downloadCropButton').addEventListener('click', exportDetectedCrop);
$('#downloadCsvButton').addEventListener('click', () => {
  const visual = visualById(); const rows = bestRowsForVisual(visual);
  if (visual && rows.length) downloadBlob(`${slugify(labelFor(visual))}.csv`, rowsToCsv(rows), 'text/csv;charset=utf-8');
});
$('#downloadBriefButton').addEventListener('click', () => {
  const visual = visualById(); if (!visual || !state.scan) return;
  downloadBlob(`${slugify(labelFor(visual))}-vizforge-research.json`, JSON.stringify(makeVizForgeResearchBrief(state.scan, visual), null, 2), 'application/json;charset=utf-8');
});
$('#downloadPowerBIButton').addEventListener('click', () => {
  const visual = visualById(); if (!visual || !state.scan) return;
  downloadBlob(`${slugify(labelFor(visual))}-powerbi-handoff.json`, JSON.stringify(makePowerBIHandoff(state.scan, visual), null, 2), 'application/json;charset=utf-8');
});
$('#downloadArticleButton').addEventListener('click', () => {
  if (!state.scan) return;
  downloadBlob(`${slugify(state.scan.article?.headline || state.scan.page.title)}-article-snapshot.json`, JSON.stringify({ page: state.scan.page, article: state.scan.article, semanticSnapshot: state.scan.semanticSnapshot }, null, 2), 'application/json;charset=utf-8');
});
$('#downloadAiButton').addEventListener('click', () => {
  if (!state.aiExport) return;
  const name = state.aiExport?.kind === 'vizlens-visual-json' ? 'vizlens-visual.json' : 'vizlens-gemini-result.json';
  downloadBlob(name, JSON.stringify(state.aiExport, null, 2), 'application/json;charset=utf-8');
});

for (const tab of $$('.tab')) {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  tab.addEventListener('keydown', handleTabKeydown);
}
updateAiAvailability().catch(() => {});
