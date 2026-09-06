// This function is passed directly to chrome.scripting.executeScript with world: 'MAIN'.
// Keep every helper nested so Chrome can serialize and execute it without module imports.
export function scanPage() {
  const MAX_ROWS = 250;
  const MAX_GROUPS = 30;
  const MAX_VISUALS = 120;
  const ATTRS = ['x','y','x1','y1','x2','y2','width','height','cx','cy','r','rx','ry','fill','stroke','stroke-width','opacity','class','transform'];

  function finite(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function sanitize(value, depth = 0, seen = new WeakSet()) {
    if (value == null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
    if (typeof value === 'bigint') return String(value);
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : String(value);
    if (ArrayBuffer.isView(value)) return Array.from(value).slice(0, 120).map((item) => sanitize(item, depth + 1, seen));
    if (typeof value === 'function' || typeof value === 'symbol') return undefined;
    if (depth > 3) return '[depth-limit]';
    if (typeof value !== 'object') return String(value);
    if (seen.has(value)) return '[circular]';
    seen.add(value);
    if (Array.isArray(value)) return value.slice(0, 120).map((item) => sanitize(item, depth + 1, seen));
    const out = {};
    let keys = [];
    try { keys = Object.keys(value).slice(0, 80); } catch { return '[uninspectable]'; }
    for (const key of keys) {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) continue;
        const next = sanitize(descriptor.value, depth + 1, seen);
        if (next !== undefined) out[key] = next;
      } catch {}
    }
    return out;
  }

  function dataObject(value) {
    if (value == null) return { value };
    if (Array.isArray(value)) return { values: sanitize(value) };
    if (typeof value === 'object') return sanitize(value);
    return { value };
  }

  function signature(value) {
    if (value == null) return 'null';
    if (Array.isArray(value)) return `array:${value.length}`;
    if (typeof value === 'object') return `object:${Object.keys(value).sort().join('|')}`;
    return typeof value;
  }

  function parseTranslate(transform) {
    const match = String(transform || '').match(/translate\(\s*([-+\d.eE]+)(?:[ ,]+([-+\d.eE]+))?/);
    if (!match) return {};
    return { tx: finite(match[1]), ty: finite(match[2] ?? 0) };
  }

  function attrsFor(node) {
    const out = { tag: node.tagName.toLowerCase() };
    for (const attr of ATTRS) {
      const value = node.getAttribute?.(attr);
      if (value == null || value === '') continue;
      const n = finite(value);
      out[attr] = n == null ? value : n;
    }
    Object.assign(out, parseTranslate(node.getAttribute?.('transform')));
    try {
      const style = getComputedStyle(node);
      if (!out.fill && style.fill && style.fill !== 'none') out.fill = style.fill;
      if (!out.stroke && style.stroke && style.stroke !== 'none') out.stroke = style.stroke;
      if (style.opacity && style.opacity !== '1') out.computedOpacity = finite(style.opacity) ?? style.opacity;
    } catch {}
    return out;
  }

  function regression(xs, ys) {
    if (xs.length < 3 || xs.length !== ys.length) return null;
    const n = xs.length;
    const mx = xs.reduce((a,b) => a+b, 0) / n;
    const my = ys.reduce((a,b) => a+b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    if (den === 0) return null;
    const slope = num / den;
    const intercept = my - slope * mx;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
      const pred = slope * xs[i] + intercept;
      ssRes += (ys[i] - pred) ** 2;
      ssTot += (ys[i] - my) ** 2;
    }
    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
    return { slope, intercept, r2 };
  }

  function inferMappings(records) {
    if (!records?.length) return [];
    const dataKeys = [...new Set(records.flatMap((record) => Object.keys(record.data || {})))];
    const attrKeys = [...new Set(records.flatMap((record) => Object.keys(record.attrs || {})))].filter((key) => key !== 'tag');
    const mappings = [];

    for (const dataKey of dataKeys) {
      for (const attrKey of attrKeys) {
        const pairs = records.map((record) => [record.data?.[dataKey], record.attrs?.[attrKey]])
          .filter(([d,a]) => Number.isFinite(Number(d)) && Number.isFinite(Number(a)));
        if (pairs.length >= 3) {
          const result = regression(pairs.map((p) => Number(p[0])), pairs.map((p) => Number(p[1])));
          if (result && result.r2 >= 0.98) {
            mappings.push({ type: 'linear', data: dataKey, attr: attrKey, r2: result.r2, slope: result.slope, intercept: result.intercept, samples: pairs.length });
          }
        }

        const categorical = records.map((record) => [record.data?.[dataKey], record.attrs?.[attrKey]])
          .filter(([d,a]) => ['string','boolean'].includes(typeof d) && ['string','boolean'].includes(typeof a));
        if (categorical.length >= 3) {
          const map = new Map();
          let consistent = true;
          for (const [d,a] of categorical) {
            const key = JSON.stringify(d);
            if (map.has(key) && map.get(key) !== a) consistent = false;
            map.set(key, a);
          }
          if (consistent && map.size >= 2 && new Set(map.values()).size >= 2) {
            mappings.push({ type: 'one-to-one', data: dataKey, attr: attrKey, samples: categorical.length, pairs: [...map.entries()].slice(0, 12).map(([d,a]) => [JSON.parse(d), a]) });
          }
        }
      }
    }
    return mappings.sort((a,b) => (b.r2 || 0) - (a.r2 || 0)).slice(0, 40);
  }

  function visibleRect(el) {
    try {
      const rect = el.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) return null;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return null;
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom };
    } catch { return null; }
  }

  function nearbyTitle(el) {
    const aria = el.getAttribute?.('aria-label') || el.getAttribute?.('title');
    if (aria) return aria.trim().slice(0, 180);
    const labelled = el.getAttribute?.('aria-labelledby');
    if (labelled) {
      const text = labelled.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim();
      if (text) return text.slice(0, 180);
    }
    const figure = el.closest?.('figure');
    const caption = figure?.querySelector?.('figcaption')?.textContent?.trim();
    if (caption) return caption.slice(0, 180);
    const parentText = el.parentElement?.querySelector?.('h1,h2,h3,h4,h5,h6')?.textContent?.trim();
    return parentText?.slice(0, 180) || '';
  }

  function metaContent(...selectors) {
    for (const selector of selectors) {
      const value = document.querySelector(selector)?.getAttribute?.('content')?.trim();
      if (value) return value.slice(0, 500);
    }
    return '';
  }

  function selectArticleRoot() {
    const candidates = [...document.querySelectorAll('article,[role="main"],main')];
    const scored = candidates.map((el) => {
      const text = (el.innerText || el.textContent || '').trim();
      const paragraphs = el.querySelectorAll('p').length;
      const links = el.querySelectorAll('a').length;
      return { el, score: Math.min(50000, text.length) + paragraphs * 240 - links * 18 };
    }).sort((a,b) => b.score - a.score);
    return scored[0]?.el || null;
  }

  function structuredArticleMetadata() {
    const candidates = [];
    for (const script of [...document.querySelectorAll('script[type="application/ld+json"]')].slice(0, 24)) {
      const raw = script.textContent?.trim();
      if (!raw || raw.length > 500000) continue;
      let parsed;
      try { parsed = JSON.parse(raw); } catch { continue; }
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length) {
        const item = queue.shift();
        if (!item || typeof item !== 'object') continue;
        if (Array.isArray(item)) { queue.push(...item.slice(0, 40)); continue; }
        if (Array.isArray(item['@graph'])) queue.push(...item['@graph'].slice(0, 80));
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (types.some((type) => /^(?:NewsArticle|Article|ReportageNewsArticle|AnalysisNewsArticle|LiveBlogPosting|BlogPosting)$/i.test(String(type || '')))) candidates.push(item);
      }
    }
    const item = candidates.find((candidate) => candidate.articleBody || candidate.headline) || candidates[0] || null;
    if (!item) return {};
    const authorValue = item.author;
    const authorList = Array.isArray(authorValue) ? authorValue : authorValue ? [authorValue] : [];
    const author = authorList.map((entry) => typeof entry === 'string' ? entry : entry?.name || '').filter(Boolean).join(', ');
    return {
      headline: String(item.headline || item.name || '').trim().slice(0, 300),
      description: String(item.description || '').trim().slice(0, 500),
      author: author.trim().slice(0, 240),
      published: String(item.datePublished || item.dateCreated || '').trim().slice(0, 120),
      articleBody: typeof item.articleBody === 'string' ? item.articleBody.replace(/\s+/g, ' ').trim().slice(0, 30000) : '',
    };
  }

  function extractArticleContext(root) {
    const scope = root || document.body;
    const structured = structuredArticleMetadata();
    const headline = scope?.querySelector?.('h1')?.textContent?.trim()
      || document.querySelector('h1')?.textContent?.trim()
      || structured.headline
      || metaContent('meta[property="og:title"]')
      || document.title;
    const description = metaContent('meta[name="description"]','meta[property="og:description"]','meta[name="twitter:description"]')
      || structured.description
      || '';
    const author = metaContent('meta[name="author"]','meta[property="article:author"]')
      || scope?.querySelector?.('[rel="author"], .author, [class*="byline"]')?.textContent?.trim()?.slice(0, 240)
      || structured.author
      || '';
    const published = metaContent('meta[property="article:published_time"]','meta[name="date"]','meta[name="pubdate"]')
      || scope?.querySelector?.('time[datetime]')?.getAttribute?.('datetime')
      || structured.published
      || '';
    const blocks = [];
    const seenBlockText = new Set();
    for (const node of [...(scope?.querySelectorAll?.('h1,h2,h3,h4,p,blockquote,li') || [])]) {
      if (node.closest('nav,footer,header,aside,form,[aria-hidden="true"]')) continue;
      const tag = node.tagName.toLowerCase();
      if (tag === 'li' && node.querySelector(':scope > p, :scope > blockquote')) continue;
      const text = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length < 20) continue;
      const key = text.toLocaleLowerCase();
      if (seenBlockText.has(key)) continue;
      seenBlockText.add(key);
      blocks.push({ id: `T${blocks.length + 1}`, type: /^h[1-4]$/.test(tag) ? 'heading' : tag === 'blockquote' ? 'quote' : 'text', text: text.slice(0, 900) });
      if (blocks.length >= 80) break;
    }
    if (blocks.length < 3 && structured.articleBody) {
      const fallbackParts = structured.articleBody
        .split(/\n+|(?<=[.!?。！？])\s*/u)
        .map((part) => part.replace(/\s+/g, ' ').trim())
        .filter((part) => part.length >= 20);
      for (const part of fallbackParts) {
        const key = part.toLocaleLowerCase();
        if (seenBlockText.has(key)) continue;
        seenBlockText.add(key);
        blocks.push({ id: `T${blocks.length + 1}`, type: 'text', text: part.slice(0, 900), source: 'json-ld' });
        if (blocks.length >= 60) break;
      }
    }
    const text = blocks.map((block) => block.text).join('\n').slice(0, 24000);
    return {
      likelyArticle: Boolean(root) || blocks.length >= 8 || Boolean(structured.articleBody),
      headline: (headline || '').slice(0, 300),
      description,
      author,
      published,
      blocks,
      text,
      wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
    };
  }

  function contextFor(el) {
    const figure = el.closest?.('figure');
    const caption = figure?.querySelector?.('figcaption')?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    const parent = figure || el.parentElement;
    const heading = parent?.querySelector?.('h1,h2,h3,h4,h5,h6')?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    const before = parent?.previousElementSibling?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    const after = parent?.nextElementSibling?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
    return { caption: caption.slice(0, 600), heading: heading.slice(0, 300), before: before.slice(0, 500), after: after.slice(0, 500) };
  }

  function primaryScore(el, item, articleRoot) {
    const viewportArea = Math.max(1, innerWidth * innerHeight);
    const areaRatio = Math.min(1, Math.max(0, item.rect.width * item.rect.height) / viewportArea);
    let score = 0.08 + Math.min(0.42, areaRatio * 1.4);
    if (articleRoot?.contains?.(el)) score += 0.15;
    if (el.closest?.('figure')) score += 0.10;
    if ((item.boundMarkCount || 0) > 0) score += 0.14;
    if (item.runtimeData || (item.chartTypes || []).length) score += 0.10;
    if (item.title || item.context?.caption) score += 0.06;
    if (item.kind === 'table') score += 0.04;
    if (item.kind === 'iframe' && item.analyticalHint) score += 0.12;
    if (['svg', 'canvas', 'runtime-host', 'table'].includes(item.kind) && (item.runtimeData || item.boundMarkCount || item.chartTypes?.length || item.kind === 'table')) score += 0.05;
    if (el.closest?.('nav,footer,header,aside')) score -= 0.32;
    if (item.kind === 'image' && !item.analyticalHint) score -= 0.20;
    if (item.kind === 'image' && /logo|avatar|icon|portrait/i.test(`${item.title || ''} ${el.alt || ''}`)) score -= 0.22;
    if (item.kind === 'svg' && (item.boundMarkCount || 0) === 0 && (item.markCount || 0) <= 4 && (item.textCount || 0) === 0) score -= 0.20;
    if (item.rect.width < 120 || item.rect.height < 80) score -= 0.12;
    return Math.max(0, Math.min(1, score));
  }

  function detectLibrary(el, boundCount = 0) {
    try {
      if (el.matches?.('.js-plotly-plot') || el.closest?.('.js-plotly-plot')) return 'Plotly';
      if (el.hasAttribute?.('_echarts_instance_') || el.closest?.('[_echarts_instance_]')) return 'ECharts';
      if (el.matches?.('[data-highcharts-chart], .highcharts-container') || el.closest?.('[data-highcharts-chart], .highcharts-container')) return 'Highcharts';
      if (el.matches?.('.vega-embed, .marks') || el.closest?.('.vega-embed')) return 'Vega/Vega-Lite';
      if (el.matches?.('.mapboxgl-map') || el.closest?.('.mapboxgl-map')) return 'Mapbox GL';
      if (el.matches?.('.maplibregl-map') || el.closest?.('.maplibregl-map')) return 'MapLibre GL';
      if (el.matches?.('.leaflet-container') || el.closest?.('.leaflet-container')) return 'Leaflet';
      if (el.matches?.('.mermaid') || el.closest?.('.mermaid')) return 'Mermaid';
      if (boundCount > 0) return 'D3-style bound SVG';
    } catch {}
    return el.tagName?.toLowerCase() === 'svg' ? 'SVG' : 'unknown';
  }

  function runtimeCanvas(canvas) {
    const result = { library: null, chartTypes: [], runtimeData: null, runtimeConfig: null };
    try {
      if (window.Chart?.getChart) {
        const chart = window.Chart.getChart(canvas);
        if (chart) {
          result.library = 'Chart.js';
          result.chartTypes = [...new Set([chart.config?.type, ...(chart.config?.data?.datasets || []).map((d) => d.type)].filter(Boolean))];
          result.runtimeData = sanitize(chart.config?.data);
          result.runtimeConfig = sanitize({ options: chart.config?.options });
          return result;
        }
      }
    } catch {}
    try {
      const host = canvas.closest?.('[_echarts_instance_]') || canvas.parentElement?.closest?.('[_echarts_instance_]');
      if (host && window.echarts?.getInstanceByDom) {
        const chart = window.echarts.getInstanceByDom(host);
        const option = chart?.getOption?.();
        if (option) {
          result.library = 'ECharts';
          result.chartTypes = [...new Set((option.series || []).map((series) => series.type).filter(Boolean))];
          result.runtimeData = sanitize(option.series || []);
          result.runtimeConfig = sanitize({ xAxis: option.xAxis, yAxis: option.yAxis, dataset: option.dataset });
          return result;
        }
      }
    } catch {}
    return result;
  }

  function runtimePlotly(root) {
    const host = root.matches?.('.js-plotly-plot') ? root : root.closest?.('.js-plotly-plot');
    if (!host) return null;
    function traceType(trace) {
      const type = String(trace?.type || '').toLowerCase();
      const mode = String(trace?.mode || '').toLowerCase();
      if ((type === 'scatter' || type === 'scattergl') && mode.includes('lines')) return 'line';
      if ((type === 'scatter' || type === 'scattergl') && mode.includes('markers')) return 'scatter';
      return type || mode;
    }
    try {
      const traces = host.data || host._fullData || [];
      return {
        library: 'Plotly',
        chartTypes: [...new Set(traces.map(traceType).filter(Boolean))],
        runtimeData: sanitize(traces),
        runtimeConfig: sanitize(host.layout || host._fullLayout || {})
      };
    } catch { return { library: 'Plotly', chartTypes: [], runtimeData: null, runtimeConfig: null }; }
  }

  function runtimeHighcharts(root) {
    const host = root.matches?.('[data-highcharts-chart]') ? root : root.closest?.('[data-highcharts-chart]');
    if (!host || !window.Highcharts?.charts) return null;
    try {
      const chart = window.Highcharts.charts.find((item) => item?.renderTo === host || item?.container === root || root.contains?.(item?.container));
      if (!chart) return null;
      const series = chart.series || [];
      return {
        library: 'Highcharts',
        chartTypes: [...new Set(series.map((s) => s.type).filter(Boolean))],
        runtimeData: sanitize(series.map((s) => ({ name: s.name, type: s.type, data: s.options?.data }))),
        runtimeConfig: sanitize({ title: chart.title?.textStr, xAxis: chart.xAxis?.map((a) => a.categories), yAxis: chart.yAxis?.map((a) => a.axisTitle?.textStr) })
      };
    } catch { return null; }
  }

  function inspectSvg(svg, id) {
    const rect = visibleRect(svg);
    if (!rect) return null;
    const markNodes = [...svg.querySelectorAll('rect,circle,ellipse,line,path,polygon,polyline,text,use')];
    const bound = markNodes.filter((node) => {
      try { return node.__data__ !== undefined; } catch { return false; }
    });
    const grouped = new Map();
    for (const node of bound.slice(0, 5000)) {
      let data;
      try { data = node.__data__; } catch { continue; }
      const tag = node.tagName.toLowerCase();
      const key = `${tag}::${signature(data)}`;
      if (!grouped.has(key)) grouped.set(key, { tag, signature: signature(data), records: [] });
      const group = grouped.get(key);
      if (group.records.length < MAX_ROWS) group.records.push({ data: dataObject(data), attrs: attrsFor(node), text: node.textContent?.trim()?.slice(0, 160) || '' });
      group.total = (group.total || 0) + 1;
    }
    const groups = [...grouped.values()].slice(0, MAX_GROUPS).map((group) => ({
      tag: group.tag,
      signature: group.signature,
      boundCount: group.total || group.records.length,
      dataRows: group.records.map((record) => record.data),
      markRows: group.records.map((record) => ({ ...record.attrs, __text: record.text || undefined })),
      mappings: inferMappings(group.records),
    }));
    return {
      id,
      kind: 'svg',
      title: nearbyTitle(svg),
      rect,
      library: detectLibrary(svg, bound.length),
      markCount: markNodes.length,
      boundMarkCount: bound.length,
      textCount: svg.querySelectorAll('text').length,
      groups,
      chartTypes: [],
      runtimeData: null,
      selectorHint: svg.id ? `#${svg.id}` : svg.getAttribute('class') || 'svg'
    };
  }

  function inspectCanvas(canvas, id) {
    const rect = visibleRect(canvas);
    if (!rect) return null;
    const runtime = runtimeCanvas(canvas);
    return {
      id,
      kind: 'canvas',
      title: nearbyTitle(canvas),
      rect,
      library: runtime.library || detectLibrary(canvas),
      markCount: null,
      boundMarkCount: null,
      groups: [],
      ...runtime,
      selectorHint: canvas.id ? `#${canvas.id}` : canvas.getAttribute('class') || 'canvas'
    };
  }

  function inspectTable(table, id) {
    const rect = visibleRect(table);
    if (!rect) return null;
    const rows = [...table.rows].slice(0, MAX_ROWS);
    const headerCells = [...(table.tHead?.rows?.[0]?.cells || rows[0]?.cells || [])];
    const headers = headerCells.map((cell, i) => cell.textContent?.trim() || `column_${i + 1}`);
    const bodyRows = table.tBodies?.length ? [...table.tBodies].flatMap((tbody) => [...tbody.rows]) : rows.slice(1);
    const tableRows = bodyRows.slice(0, MAX_ROWS).map((row) => Object.fromEntries([...row.cells].map((cell, i) => [headers[i] || `column_${i + 1}`, cell.textContent?.trim() || ''])));
    return {
      id,
      kind: 'table',
      title: nearbyTitle(table),
      rect,
      library: 'HTML table',
      markCount: tableRows.length,
      boundMarkCount: null,
      groups: [],
      chartTypes: ['table'],
      tableRows,
      columns: headers,
      selectorHint: table.id ? `#${table.id}` : table.getAttribute('class') || 'table'
    };
  }

  function inspectRuntimeHost(root, id) {
    const rect = visibleRect(root);
    if (!rect) return null;
    const plotly = runtimePlotly(root);
    const highcharts = runtimeHighcharts(root);
    const runtime = plotly || highcharts;
    if (!runtime) return null;
    return {
      id,
      kind: 'runtime-host',
      title: nearbyTitle(root),
      rect,
      markCount: null,
      boundMarkCount: null,
      groups: [],
      ...runtime,
      selectorHint: root.id ? `#${root.id}` : root.getAttribute('class') || root.tagName.toLowerCase()
    };
  }

  function lazySourceFor(el) {
    const attrs = ['src', 'data-src', 'data-lazy-src', 'data-defer-src', 'data-url', 'data-original-src', 'data-original', 'data-srcset', 'srcset'];
    for (const name of attrs) {
      const raw = el.getAttribute?.(name);
      if (!raw || /^about:blank$/i.test(raw.trim())) continue;
      const value = /srcset$/i.test(name) ? raw.split(',')[0].trim().split(/\s+/)[0] : raw;
      if (value) return { value, attribute: name };
    }
    const propertyValue = typeof el.src === 'string' ? el.src : '';
    if (propertyValue && !/^about:blank$/i.test(propertyValue)) return { value: propertyValue, attribute: 'src-property' };
    return { value: '', attribute: '' };
  }

  function inspectIframe(frame, id) {
    const rect = visibleRect(frame);
    if (!rect || rect.width < 180 || rect.height < 120) return null;
    const source = lazySourceFor(frame);
    const src = safeResourceUrl(source.value);
    const title = nearbyTitle(frame) || frame.getAttribute?.('title') || frame.getAttribute?.('aria-label') || '';
    const figureText = frame.closest?.('figure')?.textContent || '';
    const parentText = frame.parentElement?.textContent || '';
    const clue = `${title} ${src} ${figureText} ${parentText.slice(0, 600)}`;
    const analyticalHint = /chart|graph|plot|diagram|visuali[sz]ation|interactive|map|trend|distribution|infographic|datawrapper|flourish|observable|tableau|newsspec|scrolly|visual[-_ ]journal/i.test(clue);
    if (!analyticalHint && !frame.closest?.('figure')) return null;
    let library = 'Embedded interactive';
    if (/datawrapper/i.test(src)) library = 'Datawrapper embed';
    else if (/flourish/i.test(src)) library = 'Flourish embed';
    else if (/observable/i.test(src)) library = 'Observable embed';
    else if (/tableau/i.test(src)) library = 'Tableau embed';
    else if (/newsspec|news(?:\.test)?\.files\.bbci\.co\.uk/i.test(src)) library = 'BBC Visual Journalism embed';
    return {
      id,
      kind: 'iframe',
      title,
      rect,
      library,
      analyticalHint,
      chartTypes: ['embedded-interactive'],
      groups: [],
      src,
      sourceAttribute: source.attribute,
      lazySource: Boolean(source.attribute && source.attribute !== 'src' && source.attribute !== 'src-property'),
      selectorHint: frame.id ? `#${frame.id}` : frame.getAttribute('class') || 'iframe'
    };
  }

  function inspectImage(img, id) {
    const rect = visibleRect(img);
    if (!rect || rect.width < 180 || rect.height < 120) return null;
    const source = lazySourceFor(img);
    const clue = `${img.alt || ''} ${img.title || ''} ${source.value || ''} ${img.closest?.('figure')?.textContent || ''}`;
    const analyticalHint = /chart|graph|plot|diagram|visuali[sz]ation|map|trend|distribution|infographic|data|ranking|forecast|scatter|bar|line\s+chart/i.test(clue);
    if (!analyticalHint && !img.closest?.('figure')) return null;
    return {
      id,
      kind: 'image',
      title: nearbyTitle(img) || img.alt || '',
      rect,
      library: 'Raster image',
      analyticalHint,
      chartTypes: [],
      groups: [],
      src: safeResourceUrl(img.currentSrc || source.value || img.src),
      sourceAttribute: img.currentSrc ? 'currentSrc' : source.attribute,
      lazySource: Boolean(!img.currentSrc && source.attribute && source.attribute !== 'src' && source.attribute !== 'src-property'),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      selectorHint: img.id ? `#${img.id}` : img.getAttribute('class') || 'img'
    };
  }

  const articleRoot = selectArticleRoot();
  const article = extractArticleContext(articleRoot);
  const visuals = [];
  const seen = new Set();
  let seq = 1;
  function add(el, inspector) {
    if (!el || seen.has(el) || visuals.length >= MAX_VISUALS) return;
    const id = `vizlens-${seq++}`;
    const item = inspector(el, id);
    if (!item) return;
    item.context = contextFor(el);
    item.inArticle = Boolean(articleRoot?.contains?.(el));
    item.inFigure = Boolean(el.closest?.('figure'));
    item.primaryScore = primaryScore(el, item, articleRoot);
    seen.add(el);
    try { el.setAttribute('data-vizlens-id', id); } catch {}
    visuals.push(item);
  }

  const runtimeHosts = [...document.querySelectorAll('.js-plotly-plot,[data-highcharts-chart]')];
  runtimeHosts.forEach((el) => add(el, inspectRuntimeHost));
  const runtimeHostSet = new Set(runtimeHosts.filter((el) => seen.has(el)));
  const insideRecoveredRuntimeHost = (el) => runtimeHosts.some((host) => runtimeHostSet.has(host) && host !== el && host.contains(el));

  document.querySelectorAll('svg').forEach((el) => { if (!insideRecoveredRuntimeHost(el)) add(el, inspectSvg); });
  document.querySelectorAll('canvas').forEach((el) => { if (!insideRecoveredRuntimeHost(el)) add(el, inspectCanvas); });
  document.querySelectorAll('table').forEach((el) => add(el, inspectTable));
  document.querySelectorAll('iframe').forEach((el) => add(el, inspectIframe));
  document.querySelectorAll('img').forEach((el) => add(el, inspectImage));

  function safeResourceUrl(value) {
    const raw = String(value || '');
    if (/^data:/i.test(raw)) return 'data:[redacted]';
    if (/^blob:/i.test(raw)) return 'blob:[redacted]';
    if (/^file:/i.test(raw)) return 'file:[redacted]';
    try {
      const url = new URL(raw, location.href);
      url.username = '';
      url.password = '';
      url.search = '';
      url.hash = '';
      return url.href;
    } catch {
      return raw.split(/[?#]/, 1)[0].slice(0, 500);
    }
  }

  const resources = performance.getEntriesByType('resource')
    .map((entry) => safeResourceUrl(entry.name))
    .filter((url) => /\.(?:csv|tsv|json|geojson|topojson|ndjson|arrow|feather|parquet)(?:[?#]|$)/i.test(url) || /(?:data|dataset|metrics|series|chart|graph|viz)[^/]*\.(?:js|json|csv)(?:[?#]|$)/i.test(url))
    .slice(-120);

  const scripts = [...document.scripts]
    .map((script) => safeResourceUrl(script.src))
    .filter(Boolean)
    .filter((src) => /d3|echarts|plotly|vega|highcharts|chart(?:\.min)?\.js|observable|mapbox|maplibre|leaflet|mermaid/i.test(src))
    .slice(0, 80);

  const primary = visuals.slice().sort((a,b) => (b.primaryScore || 0) - (a.primaryScore || 0))[0] || null;
  const semanticSnapshot = {
    headline: article.headline || document.title,
    articleBlocks: article.blocks.slice(0, 40),
    visuals: visuals.slice(0, 30).map((visual, index) => ({
      evidenceId: `V${index + 1}`,
      id: visual.id,
      title: visual.title || visual.context?.caption || '',
      kind: visual.kind,
      library: visual.library,
      score: Number((visual.primaryScore || 0).toFixed(3)),
    })),
    dataResources: resources.slice(0, 30),
  };

  return {
    version: '0.13',
    page: {
      url: safeResourceUrl(location.href),
      title: document.title,
      lang: document.documentElement.lang || '',
      contentType: document.contentType || '',
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio: devicePixelRatio || 1 },
    },
    article,
    semanticSnapshot,
    summary: {
      visualCount: visuals.length,
      svgCount: visuals.filter((v) => v.kind === 'svg').length,
      canvasCount: visuals.filter((v) => v.kind === 'canvas').length,
      tableCount: visuals.filter((v) => v.kind === 'table').length,
      iframeCount: visuals.filter((v) => v.kind === 'iframe').length,
      imageCount: visuals.filter((v) => v.kind === 'image').length,
      dataBoundVisualCount: visuals.filter((v) => (v.boundMarkCount || 0) > 0).length,
      primaryVisualId: primary?.id || null,
      primaryScore: primary ? Number((primary.primaryScore || 0).toFixed(3)) : null,
    },
    visuals,
    resources,
    scripts,
  };
}

export function measureVisual(id) {
  const el = document.querySelector(`[data-vizlens-id="${CSS.escape(id)}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
    },
    viewport: { width: innerWidth, height: innerHeight, devicePixelRatio: devicePixelRatio || 1 },
  };
}

export function measureVisuals(ids = []) {
  return ids.map((id) => ({ id, measurement: measureVisual(id) })).filter((item) => item.measurement);
}

export function focusVisual(id) {
  const el = document.querySelector(`[data-vizlens-id="${CSS.escape(id)}"]`);
  if (!el) return false;
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center', inline: 'center' });
  const previous = el.style.outline;
  const previousOffset = el.style.outlineOffset;
  el.style.outline = '3px solid #0f6cbd';
  el.style.outlineOffset = '4px';
  setTimeout(() => {
    el.style.outline = previous;
    el.style.outlineOffset = previousOffset;
  }, 1800);
  return true;
}

export function extractSvg(id) {
  const svg = document.querySelector(`[data-vizlens-id="${CSS.escape(id)}"]`);
  if (!(svg instanceof SVGElement) || svg.tagName.toLowerCase() !== 'svg') return null;
  const clone = svg.cloneNode(true);
  const originals = [svg, ...svg.querySelectorAll('*')];
  const clones = [clone, ...clone.querySelectorAll('*')];
  const props = ['font-family','font-size','font-style','font-weight','fill','fill-opacity','stroke','stroke-width','stroke-opacity','opacity','text-anchor','dominant-baseline','paint-order','shape-rendering','visibility','display'];
  originals.forEach((node, index) => {
    const target = clones[index];
    if (!target) return;
    try {
      const style = getComputedStyle(node);
      const inline = props.map((prop) => `${prop}:${style.getPropertyValue(prop)}`).join(';');
      target.setAttribute('style', inline);
    } catch {}
  });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!clone.getAttribute('viewBox')) {
    const rect = svg.getBoundingClientRect();
    clone.setAttribute('viewBox', `0 0 ${Math.max(1, rect.width)} ${Math.max(1, rect.height)}`);
    if (!clone.getAttribute('width')) clone.setAttribute('width', String(Math.max(1, rect.width)));
    if (!clone.getAttribute('height')) clone.setAttribute('height', String(Math.max(1, rect.height)));
  }
  return new XMLSerializer().serializeToString(clone);
}
