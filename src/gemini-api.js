const PROXY_BASE = 'http://127.0.0.1:3987';
const PROXY_ORIGIN_PATTERN = 'http://127.0.0.1/*';

function proxyError(response, payload) {
  const error = new Error(payload?.error || `VizLens Gemini proxy HTTP ${response.status}`);
  error.status = response.status;
  error.code = payload?.code || `HTTP_${response.status}`;
  error.retryable = Boolean(payload?.retryable);
  error.retryAfterMs = Number.isFinite(Number(payload?.retryAfterMs)) ? Number(payload.retryAfterMs) : null;
  error.requestId = payload?.requestId || response?.headers?.get?.('x-vizlens-request-id') || null;
  return error;
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const relayAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort', relayAbort, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(new DOMException('VizLens Gemini proxy request timed out.', 'TimeoutError')), options.timeoutMs || 90_000);
  try {
    const response = await fetch(`${PROXY_BASE}${path}`, {
      method: options.method || 'GET',
      headers: options.body ? { 'content-type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw proxyError(response, payload);
    return payload;
  } finally {
    clearTimeout(timeout);
    if (externalSignal) externalSignal.removeEventListener('abort', relayAbort);
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not encode image.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

export async function getGeminiApiStatus() {
  try {
    return await request('/health', { timeoutMs: 2500 });
  } catch (error) {
    return { ok: false, provider: 'gemini-api', model: 'gemini-3.8-flash', keyConfigured: false, error: String(error?.message || error), code: error?.code || null };
  }
}

export async function planVisualWithGemini(scan, annotatedImageBlob = null, options = {}) {
  const imageDataUrl = annotatedImageBlob ? await blobToDataUrl(annotatedImageBlob) : null;
  return request('/api/plan', { method: 'POST', body: { scan, imageDataUrl }, timeoutMs: 120_000, signal: options.signal });
}

export async function analyzeViewportWithGemini(imageBlob, page = {}, options = {}) {
  const imageDataUrl = await blobToDataUrl(imageBlob);
  const payload = await request('/api/viewport', { method: 'POST', body: { imageDataUrl, page }, timeoutMs: 120_000, signal: options.signal });
  return payload.result;
}

export { PROXY_BASE, PROXY_ORIGIN_PATTERN };
