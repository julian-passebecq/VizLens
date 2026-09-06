import assert from 'node:assert/strict';
import { createProxyServer } from '../server/gemini-proxy.mjs';

const origin = 'chrome-extension://vizlens-test';
const planner = async ({ signal }) => {
  if (signal?.aborted) throw signal.reason;
  return { provider:'fixture', apiRequests:1, result:{kind:'research-only',reason:'fixture',evidenceIds:[]} };
};
const viewportAnalyzer = async () => ({ hasPrimaryVisual:false,visualType:'none',family:null,title:'',takeaway:'',dataRecoverability:'unknown',bbox:{x:0,y:0,width:0,height:0},reason:'fixture',apiRequests:1 });
const server = createProxyServer({ key:'test-key', planner, viewportAnalyzer });
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
try {
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  const h = await health.json();
  assert.equal(h.ok, true);
  assert.equal(h.model, 'gemini-3.8-flash');
  assert.equal(h.proxyVersion, '1.0.0');
  assert.equal(h.keyConfigured, true);
  assert.equal(h.geminiContract.articlePlanning.toolChoiceMode, 'any');
  assert.equal(h.geminiContract.viewportAnalysis.mimeType, 'application/json');
  assert.equal(health.headers.get('vary'), 'Origin');
  assert.equal(health.headers.get('access-control-allow-origin'), null);

  const forbidden = await fetch(`${base}/api/plan`, { method:'POST', headers:{'content-type':'application/json','origin':'https://example.com'}, body:JSON.stringify({scan:{article:{blocks:[]}}}) });
  assert.equal(forbidden.status, 403);
  assert.equal((await forbidden.json()).code, 'ORIGIN_FORBIDDEN');

  const media = await fetch(`${base}/api/plan`, { method:'POST', headers:{'content-type':'text/plain','origin':origin}, body:'{}' });
  assert.equal(media.status, 415);
  assert.equal((await media.json()).code, 'UNSUPPORTED_MEDIA_TYPE');

  const invalid = await fetch(`${base}/api/plan`, { method:'POST', headers:{'content-type':'application/json','origin':origin}, body:JSON.stringify({scan:{article:{blocks:[]}},extra:true}) });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).code, 'INVALID_PLAN_BODY');

  const ok = await fetch(`${base}/api/plan`, { method:'POST', headers:{'content-type':'application/json','origin':origin}, body:JSON.stringify({scan:{article:{blocks:[]}}}) });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('access-control-allow-origin'), origin);
  assert.equal(ok.headers.get('vary'), 'Origin');
  const body = await ok.json();
  assert.equal(body.ok, true);
  assert.equal(body.apiRequests, 1);
  assert.equal(body.proxyStats.geminiApiRequests, 1);

  const view = await fetch(`${base}/api/viewport`, { method:'POST', headers:{'content-type':'application/json','origin':origin}, body:JSON.stringify({imageDataUrl:'data:image/png;base64,iVBORw0KGgo=',page:{title:'fixture'}}) });
  assert.equal(view.status, 200);
  const viewBody = await view.json();
  assert.equal(viewBody.result.visualType, 'none');
  assert.equal(viewBody.proxyStats.geminiApiRequests, 2);
  console.log('VizLens proxy smoke passed: loopback API, Origin/CORS, JSON/body validation and request accounting.');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
