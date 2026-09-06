import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { planArticleWithGemini, analyzeViewportWithGemini, DEFAULT_GEMINI_MODEL, API_SCHEMA, GeminiApiError } from './gemini-core.mjs';

const HOST = '127.0.0.1';
const PORT = 3987;
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const PACKAGE_VERSION = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const PROXY_VERSION = PACKAGE_VERSION;

function apiKey() {
  return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
}

function allowedOrigin(req) {
  const origin = String(req.headers.origin || '');
  const configured = String(process.env.VIZLENS_EXTENSION_ORIGIN || '').trim();
  if (!origin) return '';
  if (configured) return origin === configured ? origin : null;
  return origin.startsWith('chrome-extension://') ? origin : null;
}

function send(req, res, status, payload, extraHeaders = {}) {
  const requestId = req.vizlensRequestId || null;
  const responsePayload = requestId && payload && typeof payload === 'object' && !Array.isArray(payload) ? { ...payload, requestId } : payload;
  const body = JSON.stringify(responsePayload);
  const origin = allowedOrigin(req);
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
    'vary': 'Origin',
    'x-content-type-options': 'nosniff',
    ...(requestId ? { 'x-vizlens-request-id': requestId } : {}),
    ...extraHeaders,
  };
  if (origin) headers['access-control-allow-origin'] = origin;
  res.writeHead(status, headers);
  res.end(body);
}

function requireExtensionOrigin(req) {
  const origin = String(req.headers.origin || '');
  if (!origin || allowedOrigin(req) !== origin) {
    const error = new Error('Gemini proxy POST requests are restricted to the VizLens Chrome extension origin.');
    error.status = 403;
    error.code = 'ORIGIN_FORBIDDEN';
    throw error;
  }
  return origin;
}

function requireJsonRequest(req) {
  const contentType = String(req.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    throw Object.assign(new Error('POST requests must use application/json.'), { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' });
  }
}


function requireExactBodyKeys(body, allowedKeys, code) {
  const allowed = new Set(allowedKeys);
  const extras = Object.keys(body || {}).filter((key) => !allowed.has(key));
  if (extras.length) throw Object.assign(new Error(`Unexpected request field${extras.length === 1 ? '' : 's'}: ${extras.join(', ')}.`), { status: 400, code });
}

function validatePlanBody(body) {
  if (body && typeof body === 'object' && !Array.isArray(body)) requireExactBodyKeys(body, ['scan', 'imageDataUrl'], 'INVALID_PLAN_BODY');
  if (!body || typeof body !== 'object' || Array.isArray(body) || !body.scan || typeof body.scan !== 'object' || Array.isArray(body.scan) || !body.scan.article || typeof body.scan.article !== 'object') {
    throw Object.assign(new Error('Plan request requires a VizLens scan with article evidence.'), { status: 400, code: 'INVALID_PLAN_BODY' });
  }
  if (body.imageDataUrl != null && typeof body.imageDataUrl !== 'string') {
    throw Object.assign(new Error('imageDataUrl must be a data URL string when supplied.'), { status: 400, code: 'INVALID_PLAN_BODY' });
  }
  return body;
}

function validateViewportBody(body) {
  if (body && typeof body === 'object' && !Array.isArray(body)) requireExactBodyKeys(body, ['imageDataUrl', 'page'], 'INVALID_VIEWPORT_BODY');
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.imageDataUrl !== 'string' || !body.imageDataUrl.startsWith('data:image/')) {
    throw Object.assign(new Error('Viewport request requires an image data URL.'), { status: 400, code: 'INVALID_VIEWPORT_BODY' });
  }
  if (body.page != null && (typeof body.page !== 'object' || Array.isArray(body.page))) {
    throw Object.assign(new Error('Viewport page metadata must be an object.'), { status: 400, code: 'INVALID_VIEWPORT_BODY' });
  }
  return body;
}

async function readJson(req) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) throw Object.assign(new Error('Request body too large.'), { status: 413, code: 'BODY_TOO_LARGE' });
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400, code: 'INVALID_JSON' }); }
}

function publicError(error) {
  const aborted = error?.name === 'AbortError' || error?.code === 'ABORT_ERR' || error?.code === 'REQUEST_ABORTED';
  if (aborted) {
    return { status: 499, payload: { ok: false, error: 'VizLens request was cancelled by the browser.', code: 'REQUEST_ABORTED', retryable: false, retryAfterMs: null }, headers: {} };
  }
  const status = Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 500;
  const retryAfterMs = Number.isFinite(Number(error?.retryAfterMs)) ? Math.max(0, Number(error.retryAfterMs)) : null;
  return {
    status,
    payload: {
      ok: false,
      error: String(error?.message || error),
      code: String(error?.code || (error instanceof GeminiApiError ? 'GEMINI_API_ERROR' : 'VIZLENS_PROXY_ERROR')),
      retryable: Boolean(error?.retryable),
      retryAfterMs,
    },
    headers: retryAfterMs != null ? { 'retry-after': String(Math.max(1, Math.ceil(retryAfterMs / 1000))) } : {},
  };
}

export function createProxyServer({ key = apiKey(), planner = planArticleWithGemini, viewportAnalyzer = analyzeViewportWithGemini } = {}) {
  const activeOrigins = new Set();
  const stats = { requestsAccepted: 0, geminiApiRequests: 0, plans: 0, viewports: 0, successes: 0, failures: 0, aborts: 0, startedAt: new Date().toISOString() };

  async function runExclusive(req, res, kind, handler) {
    const origin = requireExtensionOrigin(req);
    if (activeOrigins.has(origin)) {
      return send(req, res, 429, { ok: false, error: 'VizLens already has a Gemini request in progress for this extension.', code: 'LOCAL_BUSY', retryable: true, retryAfterMs: 750 }, { 'retry-after': '1' });
    }
    const controller = new AbortController();
    const abortForDisconnect = () => {
      if (!res.writableEnded && !controller.signal.aborted) controller.abort(new DOMException('Browser client disconnected.', 'AbortError'));
    };
    req.once('aborted', abortForDisconnect);
    res.once('close', abortForDisconnect);
    activeOrigins.add(origin);
    stats.requestsAccepted += 1;
    stats[kind] += 1;
    try {
      const result = await handler(controller.signal);
      stats.geminiApiRequests += Math.max(0, Number(result?.apiRequests ?? result?.result?.apiRequests ?? 0) || 0);
      stats.successes += 1;
      return send(req, res, 200, { ok: true, ...result, proxyStats: { ...stats } });
    } catch (error) {
      stats.geminiApiRequests += Math.max(0, Number(error?.apiRequests || 0) || 0);
      const out = publicError(error);
      if (out.payload.code === 'REQUEST_ABORTED') stats.aborts += 1;
      else stats.failures += 1;
      if (res.destroyed || res.writableEnded) return;
      return send(req, res, out.status, { ...out.payload, proxyStats: { ...stats } }, out.headers);
    } finally {
      req.removeListener('aborted', abortForDisconnect);
      res.removeListener('close', abortForDisconnect);
      activeOrigins.delete(origin);
    }
  }

  return http.createServer(async (req, res) => {
    req.vizlensRequestId = randomUUID();
    if (req.method === 'OPTIONS') {
      const origin = allowedOrigin(req);
      if (!origin) return send(req, res, 403, { ok: false, error: 'Origin not allowed.', code: 'ORIGIN_FORBIDDEN' });
      return send(req, res, 200, { ok: true });
    }
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);
      if (req.method === 'GET' && url.pathname === '/health') {
        return send(req, res, 200, {
          ok: true,
          provider: 'gemini-api',
          model: DEFAULT_GEMINI_MODEL,
          apiSchema: API_SCHEMA,
          proxyVersion: PROXY_VERSION,
          keyConfigured: Boolean(key),
          extensionOriginPolicy: process.env.VIZLENS_EXTENSION_ORIGIN ? 'exact-extension-origin' : 'any-chrome-extension-origin',
          store: false,
          freeTierFirst: true,
          atMostOneRequestArticlePlanning: true,
          geminiContract: {
            articlePlanning: {
              mechanism: 'function-calling',
              toolChoiceMode: 'any',
              responseFormat: null,
              modelSelects: 'factIds-only',
              hostBindsTimeAndValues: true,
              maxFunctionCalls: 1,
              allowedResponseSteps: ['thought', 'function_call'],
            },
            viewportAnalysis: {
              mechanism: 'structured-output',
              tools: false,
              mimeType: 'application/json',
              hostRevalidatesSchema: true,
              allowedResponseSteps: ['thought', 'model_output'],
              exactlyOneJsonTextBlock: true,
            },
            thinkingLevel: 'low',
            thinkingSummaries: 'none',
            requiresInteractionId: true,
            customToolsAndResponseFormatSeparated: true,
            store: false,
          },
          proxyStats: { ...stats },
        });
      }
      if (req.method === 'POST' && url.pathname === '/api/plan') {
        if (!key) return send(req, res, 503, { ok: false, error: 'GEMINI_API_KEY is not configured on the local proxy.', code: 'KEY_NOT_CONFIGURED', retryable: false, retryAfterMs: null });
        requireExtensionOrigin(req);
        requireJsonRequest(req);
        const body = validatePlanBody(await readJson(req));
        return await runExclusive(req, res, 'plans', async (signal) => planner({ scan: body.scan, imageDataUrl: body.imageDataUrl || null, apiKey: key, signal }));
      }
      if (req.method === 'POST' && url.pathname === '/api/viewport') {
        if (!key) return send(req, res, 503, { ok: false, error: 'GEMINI_API_KEY is not configured on the local proxy.', code: 'KEY_NOT_CONFIGURED', retryable: false, retryAfterMs: null });
        requireExtensionOrigin(req);
        requireJsonRequest(req);
        const body = validateViewportBody(await readJson(req));
        return await runExclusive(req, res, 'viewports', async (signal) => {
          const result = await viewportAnalyzer({ imageDataUrl: body.imageDataUrl, page: body.page || {}, apiKey: key, signal });
          return { result };
        });
      }
      return send(req, res, 404, { ok: false, error: 'Not found.', code: 'NOT_FOUND' });
    } catch (error) {
      const out = publicError(error);
      return send(req, res, out.status, out.payload, out.headers);
    }
  });
}

const entry = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (entry) {
  const server = createProxyServer();
  server.listen(PORT, HOST, () => {
    console.log(`VizLens Gemini proxy listening on http://${HOST}:${PORT}`);
    console.log(`Gemini model: ${DEFAULT_GEMINI_MODEL}`);
    console.log('Mode: free-tier-first, at most one Gemini request per article plan');
    console.log(`Extension origin policy: ${process.env.VIZLENS_EXTENSION_ORIGIN ? 'exact configured origin' : 'Chrome extension origins'}`);
    console.log(`API key configured: ${Boolean(apiKey()) ? 'yes' : 'NO - set GEMINI_API_KEY or GOOGLE_API_KEY'}`);
  });
}
