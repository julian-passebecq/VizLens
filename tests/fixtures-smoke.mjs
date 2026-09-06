import assert from 'node:assert/strict';
import { startFixtureServer } from './serve-fixtures.mjs';

const { server, url } = await startFixtureServer({ port: 0 });
try {
  const bbc = await fetch(url).then((response) => {
    assert.equal(response.status, 200);
    return response.text();
  });
  assert.match(bbc, /data-src=.*newsspec/i);
  assert.match(bbc, /data-srcset=.*inflation-chart/i);
  assert.match(bbc, /NewsArticle/);

  const structuredUrl = new URL('jsonld-only.html', url).href;
  const structured = await fetch(structuredUrl).then((response) => {
    assert.equal(response.status, 200);
    return response.text();
  });
  assert.match(structured, /Structured article on energy prices/);
  assert.match(structured, /articleBody/);


  const d3Url = new URL('d3-bound.html', url).href;
  const d3 = await fetch(d3Url).then((response) => {
    assert.equal(response.status, 200);
    return response.text();
  });
  assert.match(d3, /__data__/);
  assert.match(d3, /Quarterly revenue/);


  const plotlyUrl = new URL('plotly-runtime.html', url).href;
  const plotly = await fetch(plotlyUrl).then((response) => {
    assert.equal(response.status, 200);
    return response.text();
  });
  assert.match(plotly, /js-plotly-plot/);
  assert.match(plotly, /plot\.data/);

  const traversal = await fetch(new URL('../package.json', url));
  assert.ok([403, 404].includes(traversal.status), 'Fixture server must not expose files outside tests/fixtures.');
  console.log('VizLens fixture-server smoke passed: BBC-like lazy sources + JSON-LD + D3-bound + Plotly-runtime fixtures served, traversal blocked.');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
