import { chooseDeterministicPrimary, inferVizForgeFamily } from './model.js';
import { extractNumericFacts, resolveFactRefs } from './article-facts.js';

export const ARTICLE_FAMILIES = ['ranking', 'time-series', 'contribution', 'table'];
export const ARTICLE_FAMILY_ENUM = [...ARTICLE_FAMILIES, 'none'];

export const PLANNING_TOOLS = [
  {
    type: 'function',
    name: 'use_existing_visual',
    description: 'Choose one already detected analytical visual when it is more useful than generating a new chart from article text.',
    parameters: {
      type: 'object',
      properties: {
        visualId: { type: 'string', description: 'A visualId that appears in the supplied visual catalog.' },
        reason: { type: 'string', description: 'Short non-numeric reason for choosing the visual.' },
        evidenceIds: { type: 'array', items: { type: 'string' }, maxItems: 12 },
      },
      required: ['visualId', 'reason', 'evidenceIds'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'create_visual_recipe',
    description: 'Create one grounded visual plan from 2-12 explicit numeric fact IDs. Use only supplied fact IDs; never supply numeric values.',
    parameters: {
      type: 'object',
      properties: {
        family: { type: 'string', enum: ARTICLE_FAMILIES },
        factIds: {
          type: 'array',
          minItems: 2,
          maxItems: 12,
          items: { type: 'string', description: 'A non-year numeric fact ID from the supplied fact catalog.' },
          description: 'Select only host-owned value fact IDs. VizLens deterministically binds any associated year/time evidence.',
        },
        reason: { type: 'string', description: 'Short non-numeric reason for the visual choice.' },
        evidenceIds: { type: 'array', items: { type: 'string' }, maxItems: 12 },
      },
      required: ['family', 'factIds', 'reason', 'evidenceIds'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'research_only',
    description: 'Stop without generating a chart when the evidence is insufficient, incompatible, misleading, or better kept as research notes.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Short non-numeric reason.' },
        evidenceIds: { type: 'array', items: { type: 'string' }, maxItems: 12 },
      },
      required: ['reason', 'evidenceIds'],
      additionalProperties: false,
    },
  },
];

// Backward-compatible alias for internal/tests that still import the old name.
export const SELECTION_TOOLS = PLANNING_TOOLS;

export const FINAL_RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    family: { type: 'string', enum: ARTICLE_FAMILY_ENUM },
    title: { type: 'string' },
    takeaway: { type: 'string' },
    reason: { type: 'string' },
    evidenceIds: { type: 'array', items: { type: 'string' }, maxItems: 12 },
    points: {
      type: 'array',
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          valueFactId: { type: 'string' },
          timeFactId: { type: 'string' },
          label: { type: 'string' },
          series: { type: 'string' },
        },
        required: ['valueFactId', 'timeFactId', 'label', 'series'],
        additionalProperties: false,
      },
    },
  },
  required: ['family', 'title', 'takeaway', 'reason', 'evidenceIds', 'points'],
  additionalProperties: false,
};

export const VIEWPORT_SCHEMA = {
  type: 'object',
  properties: {
    hasPrimaryVisual: { type: 'boolean' },
    visualType: { type: 'string', enum: ['chart', 'map', 'diagram', 'table', 'photo', 'illustration', 'mixed', 'none'] },
    family: { type: ['string', 'null'], enum: ['ranking', 'time-series', 'scatter', 'flow', 'table', 'contribution', 'forecast', 'event-map', null] },
    title: { type: 'string' },
    takeaway: { type: 'string' },
    dataRecoverability: { type: 'string', enum: ['high', 'medium', 'low', 'unknown'] },
    bbox: {
      type: 'object',
      properties: {
        x: { type: 'number', minimum: 0, maximum: 1 },
        y: { type: 'number', minimum: 0, maximum: 1 },
        width: { type: 'number', minimum: 0, maximum: 1 },
        height: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['x', 'y', 'width', 'height'],
      additionalProperties: false,
    },
    reason: { type: 'string' },
  },
  required: ['hasPrimaryVisual', 'visualType', 'family', 'title', 'takeaway', 'dataRecoverability', 'bbox', 'reason'],
  additionalProperties: false,
};

const MODEL_NUMERIC_PROSE_RE = /[\p{Nd}%$€£¥]|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|percent|percentage|basis\s+points?)\b/iu;

function safeModelText(value, fallback = '', maxLength = 240) {
  const text = String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
  if (!text || MODEL_NUMERIC_PROSE_RE.test(text)) return String(fallback || '').slice(0, maxLength);
  return text;
}

function normalizedGroundingText(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

function groundedModelText(candidate, source, fallback = '', maxLength = 160) {
  const clean = safeModelText(candidate, '', maxLength);
  if (!clean) return String(fallback || '').slice(0, maxLength);
  const haystack = normalizedGroundingText(source);
  const needle = normalizedGroundingText(clean);
  if (!needle || !haystack.includes(needle)) return String(fallback || '').slice(0, maxLength);
  return clean;
}

function findVisual(scan, visualId) {
  return scan?.visuals?.find((visual) => visual.id === visualId) || null;
}

function validEvidenceIds(scan) {
  const textIds = new Set((scan?.article?.blocks || []).map((block) => block.id).filter(Boolean));
  const visualIds = new Set((scan?.visuals || []).slice(0, 30).map((_, index) => `V${index + 1}`));
  return new Set([...textIds, ...visualIds]);
}

function cleanEvidenceIds(ids, scan) {
  const allowed = validEvidenceIds(scan);
  return [...new Set((Array.isArray(ids) ? ids : []).filter((id) => allowed.has(id)))].slice(0, 12);
}

function cleanFactIds(ids, facts) {
  const allowed = new Set((facts || []).filter((fact) => fact.trustedForPlanning !== false).map((fact) => fact.id));
  return [...new Set((Array.isArray(ids) ? ids : []).filter((id) => allowed.has(id)))].slice(0, 12);
}

function compatibleSelectedFacts(selected) {
  const measures = selected.filter((fact) => fact.kind !== 'year');
  if (measures.length < 2) return { ok: false, reason: 'At least two explicit non-year numeric facts are required for a generated analytical visual.' };
  const byUnit = new Map();
  for (const fact of measures) {
    const key = `${fact?.kind || ''}|${fact?.unit || ''}`;
    if (!byUnit.has(key)) byUnit.set(key, []);
    byUnit.get(key).push(fact);
  }
  const largest = [...byUnit.values()].sort((a, b) => b.length - a.length)[0] || [];
  if (largest.length < 2) return { ok: false, reason: 'Selected article facts do not share a compatible unit/kind.' };
  return { ok: true, facts: largest };
}

function cleanHostLabelCandidate(value) {
  let prefix = String(value || '').replace(/\s+/g, ' ').trim();
  prefix = prefix.split(/[.;:]/).pop() || prefix;
  prefix = prefix.split(',').pop() || prefix;
  prefix = prefix
    .replace(/^\s*(?:and|while|whereas|but)(?:\s+|$)/i, '')
    .replace(/\b(?:was|were|is|are|reached|hit|stood|rose|fell|grew|declined|increased|decreased|climbed|dropped|at|to|from|by|of|had)\s*$/i, '')
    .trim();
  const words = prefix.split(/\s+/).filter(Boolean).slice(-7).join(' ');
  if (words && !MODEL_NUMERIC_PROSE_RE.test(words)) return words.slice(0, 160);
  return '';
}

function hostLabelForFact(fact, facts = []) {
  const sentence = String(fact?.sentence || '');
  const start = Math.max(0, Number(fact?.offsetStart) || 0);
  const direct = cleanHostLabelCandidate(sentence.slice(0, start));
  if (direct) return direct;

  const peers = (Array.isArray(facts) ? facts : [])
    .filter((candidate) => candidate.kind === fact?.kind && candidate.unit === fact?.unit && candidate.trustedForPlanning !== false && sameSentenceSegment(candidate, fact))
    .sort((a, b) => (a.offsetStart ?? 0) - (b.offsetStart ?? 0));
  const peerIndex = peers.findIndex((candidate) => candidate.id === fact?.id);
  if (peerIndex > 0) {
    const previous = peers[peerIndex - 1];
    const bridge = cleanHostLabelCandidate(sentence.slice(previous.offsetEnd ?? previous.offsetStart ?? 0, start));
    if (bridge) return bridge;
  }

  const firstPeer = peers[0];
  if (firstPeer && firstPeer.id !== fact?.id) {
    const bounds = sentenceSegmentBounds(sentence, firstPeer.offsetStart);
    const shared = cleanHostLabelCandidate(sentence.slice(bounds.start, firstPeer.offsetStart ?? 0));
    if (shared) return shared;
  }

  if (fact?.unit) return `Value (${fact.unit})`;
  return 'Value';
}

function hostTakeaway(scan, rows) {
  const sentences = [...new Set((rows || []).map((row) => String(row?._sourceSentence || '').trim()).filter(Boolean))];
  if (sentences.length) return sentences.slice(0, 2).join(' ').slice(0, 600);
  return String(scan?.article?.description || '').slice(0, 600);
}

function visualTypeForFamily(family) {
  if (family === 'time-series') return 'line';
  if (family === 'ranking' || family === 'contribution') return 'bar';
  if (family === 'table') return 'table';
  return 'none';
}

function sentenceSegmentBounds(text, offset) {
  const source = String(text || '');
  const at = Math.max(0, Math.min(source.length, Number(offset) || 0));
  let start = 0;
  let end = source.length;
  const boundary = /[.!?;](?:["')\]]*)\s+/g;
  let match;
  while ((match = boundary.exec(source))) {
    const afterBoundary = match.index + match[0].length;
    if (afterBoundary <= at) {
      start = afterBoundary;
      continue;
    }
    end = match.index + 1;
    break;
  }
  return { start, end };
}

function sameSentenceSegment(candidate, fact) {
  if (!candidate || !fact || candidate.evidenceId !== fact.evidenceId) return false;
  const source = String(fact.sentence || '');
  if (String(candidate.sentence || '') !== source) return false;
  const bounds = sentenceSegmentBounds(source, fact.offsetStart);
  const offset = Number(candidate.offsetStart) || 0;
  return offset >= bounds.start && offset < bounds.end;
}

function factCenter(fact) {
  return ((fact?.offsetStart ?? 0) + (fact?.offsetEnd ?? fact?.offsetStart ?? 0)) / 2;
}

function findYearForFact(fact, facts) {
  const sourceFacts = Array.isArray(facts) ? facts : [];
  const localYears = sourceFacts
    .filter((candidate) => candidate.kind === 'year' && candidate.trustedForPlanning !== false && sameSentenceSegment(candidate, fact))
    .sort((a, b) => (a.offsetStart ?? 0) - (b.offsetStart ?? 0));
  if (!localYears.length) return null;

  // Equal-size value/year groups are common in article prose: both
  // "10 in 2024 and 12 in 2025" and "10 and 12 in 2024 and 2025,
  // respectively" are correctly resolved by stable source order. This also
  // prevents two values from independently collapsing onto the same nearest
  // year. Numbers remain host-owned; Gemini never supplies the pairing.
  const peers = sourceFacts
    .filter((candidate) => candidate.kind === fact?.kind && candidate.unit === fact?.unit && candidate.trustedForPlanning !== false && sameSentenceSegment(candidate, fact))
    .sort((a, b) => (a.offsetStart ?? 0) - (b.offsetStart ?? 0));
  if (peers.length === localYears.length) {
    const peerIndex = peers.findIndex((candidate) => candidate.id === fact?.id);
    if (peerIndex >= 0 && localYears[peerIndex]) return localYears[peerIndex];
  }

  const center = factCenter(fact);
  return localYears.slice().sort((a, b) => Math.abs(factCenter(a) - center) - Math.abs(factCenter(b) - center))[0] || null;
}

function localFactContext(fact, maxLength) {
  const text = String(fact?.sentence || '');
  const limit = Math.max(40, Number(maxLength) || 380);
  if (text.length <= limit) return text;
  const center = factCenter(fact);
  let start = Math.max(0, Math.floor(center - limit / 2));
  let end = Math.min(text.length, start + limit);
  start = Math.max(0, end - limit);
  return text.slice(start, end).trim();
}

export function compactEvidencePacket(scan, facts = extractNumericFacts(scan?.article), profile = {}) {
  const limits = { maxVisuals: profile.maxVisuals ?? 14, maxFacts: profile.maxFacts ?? 54, maxBlocks: profile.maxBlocks ?? 22, sentenceChars: profile.sentenceChars ?? 380, blockChars: profile.blockChars ?? 480 };
  const visuals = (scan?.visuals || []).slice(0, limits.maxVisuals).map((visual, index) => ({
    evidenceId: `V${index + 1}`,
    visualId: visual.id,
    title: visual.title || '',
    kind: visual.kind,
    library: visual.library,
    chartTypes: visual.chartTypes || [],
    primaryScore: visual.primaryScore || 0,
    boundMarks: visual.boundMarkCount || 0,
    context: { caption: String(visual.context?.caption || '').slice(0, 220), heading: String(visual.context?.heading || '').slice(0, 140) },
    deterministicFamily: inferVizForgeFamily(visual),
  }));
  const factList = (facts || []).filter((fact) => fact.trustedForPlanning !== false).slice(0, limits.maxFacts).map((fact) => ({
    id: fact.id,
    evidenceId: fact.evidenceId,
    raw: String(fact.raw || '').slice(0, 120),
    unit: fact.unit || '',
    kind: fact.kind,
    sentence: localFactContext(fact, limits.sentenceChars),
  }));
  const factEvidence = new Set(factList.map((fact) => fact.evidenceId));
  const blocks = (scan?.article?.blocks || []).filter((block, index) => index < 4 || factEvidence.has(block.id) || block.type === 'heading').slice(0, limits.maxBlocks).map((block) => ({ id: block.id, type: block.type, text: String(block.text || '').slice(0, limits.blockChars) }));
  return {
    page: { title: scan?.page?.title || '' },
    article: scan?.article ? { headline: scan.article.headline || '', description: String(scan.article.description || '').slice(0, 420), blocks } : null,
    numericFacts: factList,
    visuals,
    primaryByHeuristic: scan?.summary?.primaryVisualId || null,
  };
}

export function executeSelectionTool(call, scan, facts = extractNumericFacts(scan?.article)) {
  const args = call?.arguments || {};
  const evidenceIds = cleanEvidenceIds(args.evidenceIds, scan);
  if (call?.tool === 'use_existing_visual') {
    const visual = args.visualId ? findVisual(scan, args.visualId) : chooseDeterministicPrimary(scan);
    if (!visual) return { kind: 'research-only', reason: 'The requested existing visual is not one of the scanned candidates.', evidenceIds };
    return { kind: 'existing-visual', visualId: visual.id, visual, evidenceIds, deterministicFamily: inferVizForgeFamily(visual) };
  }
  if (call?.tool === 'select_article_facts') {
    const factIds = cleanFactIds(args.factIds, facts);
    const selected = resolveFactRefs(facts, factIds);
    const compatible = compatibleSelectedFacts(selected);
    if (!compatible.ok) return { kind: 'research-only', reason: compatible.reason, evidenceIds, selectedFactIds: factIds };
    return { kind: 'article-facts', family: ARTICLE_FAMILIES.includes(args.family) ? args.family : null, facts: compatible.facts, allSelectedFacts: selected, evidenceIds, reason: safeModelText(args.reason, 'Grounded article facts selected.', 600) };
  }
  return { kind: 'research-only', reason: safeModelText(args.reason, 'No grounded visual should be produced.', 600), evidenceIds };
}

export function materializeVisualRecipe(recipe, scan, facts, selection = null) {
  const args = recipe || {};
  const family = ARTICLE_FAMILIES.includes(args.family) ? args.family : null;
  if (!family) return { kind: 'research-only', reason: safeModelText(args.reason, 'A supported article visual family was not selected.', 600) };
  const allowed = new Map((selection?.facts || facts || []).map((fact) => [fact.id, fact]));
  const allFacts = new Map((facts || []).map((fact) => [fact.id, fact]));
  const rows = [];
  const usedFactIds = [];
  const warnings = [];
  for (const point of Array.isArray(args.points) ? args.points.slice(0, 12) : []) {
    const valueFact = allowed.get(point.valueFactId);
    if (!valueFact || valueFact.kind === 'year') continue;
    let timeFact = point.timeFactId ? allFacts.get(point.timeFactId) : null;
    if (timeFact && timeFact.kind !== 'year') timeFact = null;
    if (!timeFact && family === 'time-series') timeFact = findYearForFact(valueFact, facts);
    const hostLabel = hostLabelForFact(valueFact, facts);
    rows.push({
      label: groundedModelText(point.label, valueFact.sentence, hostLabel, 160),
      value: valueFact.value,
      unit: valueFact.unit || '',
      time: timeFact?.value ?? null,
      series: point.series == null ? null : groundedModelText(point.series, valueFact.sentence, '', 120) || null,
      sourceFactId: valueFact.id,
      timeFactId: timeFact?.id || null,
      evidenceId: valueFact.evidenceId,
      raw: valueFact.raw,
      _sourceSentence: valueFact.sentence,
    });
    usedFactIds.push(valueFact.id);
    if (timeFact) usedFactIds.push(timeFact.id);
  }
  if (rows.length < 2) return { kind: 'research-only', reason: 'Gemini did not reference at least two valid host-owned numeric facts.' };
  const unitKeys = new Set(rows.map((row) => `${row.unit}|${allFacts.get(row.sourceFactId)?.kind || ''}`));
  if (unitKeys.size > 1) return { kind: 'research-only', reason: 'The proposed visual mixes incompatible numeric units.' };
  const distinctTimes = new Set(rows.map((row) => row.time).filter((value) => value != null));
  if (family === 'time-series' && distinctTimes.size < 2) warnings.push('Time-series requested, but fewer than two distinct explicit year facts were grounded. Falling back to ranking.');
  const resolvedFamily = family === 'time-series' && distinctTimes.size < 2 ? 'ranking' : family;
  const evidenceIds = cleanEvidenceIds([...(args.evidenceIds || []), ...rows.map((row) => row.evidenceId)], scan);
  const confidence = Math.min(0.96, 0.66 + Math.min(rows.length, 6) * 0.05 + (unitKeys.size === 1 ? 0.08 : 0));
  const publicRows = rows.map(({ _sourceSentence, ...row }) => row);
  return {
    kind: 'vizlens-visual-json',
    version: '0.3',
    source: { url: scan?.page?.url || '', headline: scan?.article?.headline || scan?.page?.title || '', author: scan?.article?.author || '', published: scan?.article?.published || '' },
    visual: {
      family: resolvedFamily,
      type: visualTypeForFamily(resolvedFamily),
      title: String(scan?.article?.headline || scan?.page?.title || 'Visual').slice(0, 240),
      takeaway: hostTakeaway(scan, rows),
      encodings: resolvedFamily === 'time-series' ? { x: 'time', y: 'value', series: 'series' } : resolvedFamily === 'table' ? { columns: ['label', 'value', 'unit', 'time', 'series'] } : { x: 'label', y: 'value', series: 'series' },
    },
    data: publicRows,
    confidence: Number(confidence.toFixed(3)),
    grounding: { evidenceIds, numericFactIds: [...new Set(usedFactIds)], allNumbersHostResolved: true, modelWasNotAllowedToSupplyNumericValues: true, userFacingTextGroundedByHost: true },
    warnings,
    reason: safeModelText(args.reason, '', 600),
  };
}
