const SCALE = new Map([
  ['k', 1e3], ['thousand', 1e3],
  ['m', 1e6], ['mn', 1e6], ['million', 1e6], ['millions', 1e6], ['millionen', 1e6], ['millón', 1e6], ['millones', 1e6],
  ['b', 1e9], ['bn', 1e9], ['bln', 1e9], ['billion', 1e9], ['billions', 1e9], ['milliard', 1e9], ['milliards', 1e9], ['milliarde', 1e9], ['milliarden', 1e9], ['mil millones', 1e9], ['mrd', 1e9],
  ['tn', 1e12], ['trillion', 1e12], ['trillions', 1e12],
  ['万', 1e4], ['億', 1e8], ['兆', 1e12],
]);

const CURRENCY_SYMBOLS = new Map([
  ['$', '$'], ['US$', 'USD'], ['C$', 'CAD'], ['CA$', 'CAD'], ['A$', 'AUD'], ['AU$', 'AUD'], ['NZ$', 'NZD'],
  ['€', 'EUR'], ['£', 'GBP'], ['¥', '¥'], ['kr', 'kr'],
  ['dollar', 'USD'], ['dollars', 'USD'], ['euro', 'EUR'], ['euros', 'EUR'], ['yen', 'JPY'], ['円', 'JPY'],
]);

const MEASURE_UNITS = new Map([
  ['people', 'people'], ['person', 'people'], ['persons', 'people'],
  ['user', 'user'], ['users', 'user'], ['customer', 'customer'], ['customers', 'customer'],
  ['job', 'job'], ['jobs', 'job'], ['household', 'household'], ['households', 'household'],
  ['employee', 'employee'], ['employees', 'employee'], ['worker', 'worker'], ['workers', 'worker'],
  ['vote', 'vote'], ['votes', 'vote'], ['vehicle', 'vehicle'], ['vehicles', 'vehicle'],
  ['unit', 'unit'], ['units', 'unit'], ['barrel', 'barrel'], ['barrels', 'barrel'],
  ['tonne', 'tonne'], ['tonnes', 'tonne'], ['ton', 'ton'], ['tons', 'ton'],
  ['kg', 'kg'], ['kilogram', 'kg'], ['kilograms', 'kg'], ['g', 'g'], ['gram', 'g'], ['grams', 'g'],
  ['gw', 'GW'], ['mw', 'MW'], ['kw', 'kW'], ['twh', 'TWh'], ['mwh', 'MWh'], ['kwh', 'kWh'],
  ['km', 'km'], ['kilometer', 'km'], ['kilometers', 'km'], ['kilometre', 'km'], ['kilometres', 'km'],
  ['mile', 'mile'], ['miles', 'mile'], ['second', 'second'], ['seconds', 'second'],
  ['minute', 'minute'], ['minutes', 'minute'], ['hour', 'hour'], ['hours', 'hour'],
  ['day', 'day'], ['days', 'day'], ['point', 'point'], ['points', 'point'],
  ['c', '°C'], ['°c', '°C'], ['celsius', '°C'],
  ['f', '°F'], ['°f', '°F'], ['fahrenheit', '°F'],
]);

const MONTH_RE = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;
const REFERENCE_PREFIX_RE = /\b(?:figure|fig\.?|table|chart|section|chapter|page|p\.)\s*$/i;

function instructionLike(text) {
  return /(?:ignore|disregard|forget|override)\s+(?:(?:all|any|the)\s+)?(?:previous\s+)?(?:instructions?|directions?|rules?|prompts?)|do\s+not\s+follow\s+(?:the\s+)?(?:instructions?|rules?)|system\s+prompt|developer\s+message|call\s+(?:a\s+|the\s+)?(?:hidden\s+)?tool|execute\s+(?:code|javascript|command)|exfiltrat|reveal\s+(?:the\s+)?prompt|you\s+are\s+chatgpt|assistant\s*:/i.test(String(text || ''));
}

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseLocalizedNumber(raw) {
  let value = String(raw || '').normalize('NFKC').trim().replace(/\u2212/g, '-').replace(/[\u00a0\u202f\s']/g, '');
  if (!value) return null;
  const negative = value.startsWith('-');
  if (negative || value.startsWith('+')) value = value.slice(1);
  const commas = (value.match(/,/g) || []).length;
  const dots = (value.match(/\./g) || []).length;

  if (commas && dots) {
    const decimal = value.lastIndexOf(',') > value.lastIndexOf('.') ? ',' : '.';
    const thousands = decimal === ',' ? /\./g : /,/g;
    value = value.replace(thousands, '').replace(decimal, '.');
  } else if (commas) {
    if (commas > 1) value = value.replace(/,/g, '');
    else {
      const [left, right = ''] = value.split(',');
      value = right.length > 0 && (right.length <= 2 || left === '0') ? `${left}.${right}` : `${left}${right}`;
    }
  } else if (dots) {
    if (dots > 1) value = value.replace(/\./g, '');
    else {
      const [left, right = ''] = value.split('.');
      value = right.length === 3 && left.length <= 3 && left !== '0' ? `${left}${right}` : value;
    }
  }

  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

function currencyFrom(prefix, suffix) {
  const token = String(prefix || suffix || '').trim();
  if (!token) return null;
  return CURRENCY_SYMBOLS.get(token) || CURRENCY_SYMBOLS.get(token.toLowerCase()) || token.toUpperCase();
}

function periodComponentAt(sentence, start, kind, value) {
  if (kind === 'year') return false;
  const prefix = String(sentence || '').slice(Math.max(0, start - 4), start);
  if (/\bQ$/i.test(prefix) && Number.isInteger(value) && value >= 1 && value <= 4) return true;
  if (/\bH$/i.test(prefix) && Number.isInteger(value) && value >= 1 && value <= 2) return true;
  return false;
}

function canonicalMeasureUnit(token) {
  return MEASURE_UNITS.get(String(token || '').trim().toLowerCase()) || '';
}

function dateComponentAt(sentence, start, end, kind) {
  // Only suppress unitless date fragments (for example the 21 in '21 May 2025').
  // A percentage/currency/measure next to a month name is still analytical evidence.
  if (kind !== 'number') return false;
  const text = String(sentence || '');
  const window = text.slice(Math.max(0, start - 18), Math.min(text.length, end + 18));
  if (MONTH_RE.test(window)) return true;
  return /\b(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/.test(window);
}

function referenceNumberAt(sentence, start) {
  const prefix = String(sentence || '').slice(Math.max(0, start - 28), start);
  return REFERENCE_PREFIX_RE.test(prefix);
}

function fiscalYearComponentAt(sentence, start, end, value) {
  if (!Number.isInteger(value)) return false;
  const text = String(sentence || '');
  const before = text.slice(Math.max(0, start - 8), start);
  const after = text.slice(end, Math.min(text.length, end + 8));
  if (value >= 1900 && value <= 2100) {
    const match = /^\s*([\/-])\s*(\d{2})(?!\d)/.exec(after);
    if (match) {
      const tail = after.slice(match[0].length);
      if (!/^\s*[\/-]\s*\d{1,2}(?!\d)/.test(tail)) return true;
    }
  }
  if (value >= 0 && value <= 99 && /(?:19|20)\d{2}\s*[\/-]\s*$/.test(before)) {
    if (!/^\s*[\/-]\s*\d{1,2}(?!\d)/.test(after)) return true;
  }
  return false;
}

function normalizeFact(match, evidenceId, sentence, index) {
  const groups = match.groups || {};
  const base = parseLocalizedNumber(groups.number);
  if (base == null) return null;
  const scaleToken = String(groups.scale || '').toLowerCase();
  const multiplier = SCALE.get(scaleToken) || 1;
  const start = Number(match.index) || 0;
  const end = start + match[0].length;
  const accountingNegative = start > 0 && sentence[start - 1] === '(' && sentence[end] === ')';
  const value = accountingNegative ? -Math.abs(base * multiplier) : base * multiplier;
  const suffix = String(groups.unit || '').toLowerCase();
  const currency = currencyFrom(groups.currencyPrefix, groups.currencySuffix);
  const measureUnit = canonicalMeasureUnit(groups.measureUnit);
  const percent = suffix === '%' || /percent|per\s*cent|por\s*ciento|prozent|pct/.test(suffix);
  const percentagePoints = /percentage\s*points?|\bpp\b/.test(suffix);
  const basisPoints = /basis\s*points?|\bbps?\b|\bbp\b/.test(suffix);
  const raw = match[0].trim();
  const plainYear = !currency && !percent && !percentagePoints && !basisPoints && !measureUnit && multiplier === 1 && Number.isInteger(value) && value >= 1900 && value <= 2100;

  let kind = 'number';
  let unit = '';
  if (currency) { kind = 'currency'; unit = currency; }
  else if (percentagePoints) { kind = 'percentage-points'; unit = 'pp'; }
  else if (basisPoints) { kind = 'basis-points'; unit = 'bps'; }
  else if (percent) { kind = 'percentage'; unit = '%'; }
  else if (plainYear) { kind = 'year'; unit = 'year'; }
  else if (measureUnit) { kind = 'measure'; unit = measureUnit; }
  // Scale words change magnitude, not the semantic unit. A million and a billion
  // of the same unlabeled count remain comparable after normalization.

  const instruction = instructionLike(sentence);
  const dateComponent = dateComponentAt(sentence, start, end, kind);
  const referenceNumber = referenceNumberAt(sentence, start);
  const periodComponent = periodComponentAt(sentence, start, kind, value);
  const fiscalYearComponent = fiscalYearComponentAt(sentence, start, end, value);

  return {
    id: `N${index}`,
    evidenceId,
    raw,
    value,
    unit,
    kind,
    sentence: String(sentence || '').slice(0, 1200),
    offsetStart: start,
    offsetEnd: end,
    trustedForPlanning: !instruction && !dateComponent && !referenceNumber && !periodComponent && !fiscalYearComponent,
    flags: {
      instructionLike: instruction,
      dateComponent,
      referenceNumber,
      periodComponent,
      fiscalYearComponent,
      accountingNegative,
    },
  };
}

const NUMBER_RE = /(?:(?<currencyPrefix>USD|EUR|GBP|NOK|CHF|SEK|DKK|JPY|CAD|AUD|NZD|CNY|HKD|SGD|US\$|CA\$|C\$|AU\$|A\$|NZ\$|\$|€|£|¥|kr)\s*)?(?<number>[+\-\u2212]?(?:\d{1,3}(?:[\s\u00a0\u202f'.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?))(?!\d)(?:\s*(?<scale>mil\s+millones|万|億|兆|thousand|million(?:s)?|millionen|millón|millones|billion(?:s)?|milliard(?:s)?|milliarde(?:n)?|trillion(?:s)?|mn|bn|bln|tn|mrd|[kmb](?![A-Za-z])))?(?:\s*(?<unit>percentage\s*points?|percent\s*points?|basis\s*points?|bps?|bp|pp|%|per\s*cent|por\s*ciento|prozent|percentage|percent|pct|パーセント))?(?:\s*(?<currencySuffix>USD|EUR|GBP|NOK|CHF|SEK|DKK|JPY|CAD|AUD|NZD|CNY|HKD|SGD|円|dollars?|euros?|yen|kr))?(?:\s*(?<measureUnit>people|persons?|users?|customers?|jobs?|households?|employees?|workers?|votes?|vehicles?|units?|barrels?|tonnes?|tons?|TWh|MWh|kWh|GW|MW|kW|kilograms?|kg|grams?|g|kilometers?|kilometres?|km|miles?|seconds?|minutes?|hours?|days?|points?|°?C|°?F|celsius|fahrenheit)(?![A-Za-z]))?/giu;

export function extractNumericFacts(article, { maxFacts = 120 } = {}) {
  const blocks = Array.isArray(article?.blocks) ? article.blocks : [];
  const facts = [];
  const dedupe = new Set();
  for (const block of blocks) {
    const text = String(block?.text || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    NUMBER_RE.lastIndex = 0;
    let match;
    while ((match = NUMBER_RE.exec(text))) {
      const fact = normalizeFact(match, block.id || `T${facts.length + 1}`, text, facts.length + 1);
      if (!fact) continue;
      const key = `${fact.evidenceId}|${match.index}|${fact.raw}`;
      if (dedupe.has(key)) continue;
      dedupe.add(key);
      facts.push(fact);
      if (facts.length >= maxFacts) return facts;
      if (match[0].length === 0) NUMBER_RE.lastIndex += 1;
    }
  }
  return facts;
}

export function buildArticleFromText(text, meta = {}) {
  const cleaned = String(text || '').replace(/\r\n?/g, '\n').trim();
  const seenParts = new Set();
  const parts = cleaned
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ0-9])/) 
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter((part) => {
      if (part.length < 8) return false;
      const key = part.toLocaleLowerCase();
      if (seenParts.has(key)) return false;
      seenParts.add(key);
      return true;
    })
    .slice(0, 120);
  const blocks = parts.map((part, index) => ({ id: `T${index + 1}`, type: index === 0 && part.length < 180 ? 'heading' : 'text', text: part.slice(0, 1200) }));
  return {
    likelyArticle: blocks.length > 0,
    headline: String(meta.headline || blocks[0]?.text || 'Imported document').slice(0, 300),
    description: String(meta.description || ''),
    author: String(meta.author || ''),
    published: String(meta.published || ''),
    blocks,
    text: blocks.map((block) => block.text).join('\n').slice(0, 32000),
    wordCount: cleaned ? cleaned.split(/\s+/).filter(Boolean).length : 0,
    importedText: true,
  };
}

export function makeTextScan(text, meta = {}) {
  const article = buildArticleFromText(text, meta);
  return {
    version: '0.13',
    page: {
      url: String(meta.url || 'local:text-import'),
      title: String(meta.title || article.headline || 'Imported text'),
      viewport: null,
    },
    article,
    visuals: [],
    resources: [],
    scripts: [],
    semanticSnapshot: {
      headline: article.headline,
      articleBlocks: article.blocks.slice(0, 40),
      visualCandidates: [],
      dataResources: [],
    },
    summary: {
      visualCount: 0,
      svgCount: 0,
      canvasCount: 0,
      tableCount: 0,
      imageCount: 0,
      dataBoundVisualCount: 0,
      primaryVisualId: null,
      primaryScore: null,
    },
  };
}

export function factsById(facts) {
  return new Map((facts || []).map((fact) => [fact.id, fact]));
}

export function compatibleMeasureFacts(facts) {
  const measures = (facts || []).filter((fact) => fact.kind !== 'year' && fact.trustedForPlanning !== false);
  const groups = new Map();
  for (const fact of measures) {
    const key = `${fact.kind}|${fact.unit || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(fact);
  }
  return [...groups.values()].sort((a, b) => b.length - a.length);
}

export function factCatalogForPrompt(article) {
  return extractNumericFacts(article)
    .filter((fact) => fact.trustedForPlanning !== false)
    .map(({ id, evidenceId, raw, unit, kind, sentence }) => ({ id, evidenceId, raw, unit, kind, sentence }));
}

export function resolveFactRefs(facts, ids) {
  const byId = new Map((facts || []).filter((fact) => fact.trustedForPlanning !== false).map((fact) => [fact.id, fact]));
  return [...new Set(Array.isArray(ids) ? ids : [])].map((id) => byId.get(id)).filter(Boolean);
}

export function safeNumber(value) {
  return finite(value);
}
