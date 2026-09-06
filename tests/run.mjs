import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractNumericFacts, makeTextScan, parseLocalizedNumber, compatibleMeasureFacts } from '../src/article-facts.js';
import { compactEvidencePacket, materializeVisualRecipe } from '../src/ai-contract.js';
import { rowsToCsv } from '../src/model.js';
import { planningToolsForPacket, makeGeminiRequest } from '../server/gemini-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cases = JSON.parse(fs.readFileSync(path.join(root, 'tests/article-regression.json'), 'utf8'));
assert.equal(cases.length, 38, 'The v1 release must retain 38 article regression cases.');

function near(a, b) {
  return Math.abs(Number(a) - Number(b)) <= Math.max(1e-9, Math.abs(Number(b)) * 1e-12);
}

let casePasses = 0;
for (const testCase of cases) {
  const article = makeTextScan(testCase.text, { headline: testCase.name }).article;
  const facts = extractNumericFacts(article);
  if (Number.isInteger(testCase.count)) assert.equal(facts.length, testCase.count, `${testCase.name}: fact count`);
  for (const expected of testCase.contains || []) {
    const match = facts.find((fact) => {
      if (expected.raw != null && fact.raw !== expected.raw) return false;
      if (expected.value != null && !near(fact.value, expected.value)) return false;
      if (expected.kind != null && fact.kind !== expected.kind) return false;
      if (expected.unit != null && fact.unit !== expected.unit) return false;
      if (expected.trusted != null && fact.trustedForPlanning !== expected.trusted) return false;
      if (expected.trustedForPlanning != null && fact.trustedForPlanning !== expected.trustedForPlanning) return false;
      return true;
    });
    assert.ok(match, `${testCase.name}: missing ${JSON.stringify(expected)}`);
  }
  casePasses += 1;
}

const localized = [
  ['1,234.56', 1234.56], ['1.234,56', 1234.56], ["1'234", 1234], ['1 234', 1234],
  ['12,5', 12.5], ['12.5', 12.5], ['−5.2', -5.2], ['+12', 12], ['0,25', 0.25],
  ['10,000', 10000], ['10.000', 10000], ['999', 999], ['1,2', 1.2], ['1.2', 1.2],
  ['1,000,000', 1000000], ['1.000.000', 1000000], ['2 500 000', 2500000], ['-42', -42],
  ['3,1415', 31415], ['3.1415', 3.1415], ['0.001', 0.001], ['0,001', 0.001], ['100', 100], ['1', 1],
];
for (const [raw, expected] of localized) assert.equal(parseLocalizedNumber(raw), expected, `localized number ${raw}`);

const pairingScan = makeTextScan('Revenue was EUR 10 million and EUR 12 million in 2024 and 2025, respectively.', { headline: 'Pairing' });
const pairingFacts = extractNumericFacts(pairingScan.article);
const values = pairingFacts.filter((fact) => fact.kind === 'currency');
const recipe = {
  family: 'time-series', title: '', takeaway: '', reason: 'Revenue trend', evidenceIds: ['T1'],
  points: values.map((fact) => ({ valueFactId: fact.id, timeFactId: '', label: '', series: '' })),
};
const materialized = materializeVisualRecipe(recipe, pairingScan, pairingFacts, { facts: values });
assert.deepEqual(materialized.data.map((row) => row.time), [2024, 2025], 'Equal-size value/year lists must bind one-to-one in source order.');

const sentenceScan = makeTextScan('Revenue was EUR 10 million. A separate sentence mentions 2025.', { headline: 'Sentence boundary' });
const sentenceFacts = extractNumericFacts(sentenceScan.article);
const sentenceValue = sentenceFacts.find((fact) => fact.kind === 'currency');
const sentenceRecipe = { family:'time-series',title:'',takeaway:'',reason:'Trend',evidenceIds:['T1'],points:[
  {valueFactId:sentenceValue.id,timeFactId:'',label:'',series:''},
  {valueFactId:sentenceValue.id,timeFactId:'',label:'',series:''},
]};
const sentenceResult = materializeVisualRecipe(sentenceRecipe, sentenceScan, sentenceFacts, { facts:[sentenceValue] });
assert.equal(sentenceResult.data?.[0]?.time ?? null, null, 'Years must not leak across sentence boundaries.');

const contractScan = makeTextScan('Revenue was USD 10 million in 2024 and USD 14 million in 2025.', { headline:'Contract' });
const contractFacts = extractNumericFacts(contractScan.article);
const packet = compactEvidencePacket(contractScan, contractFacts);
const tools = planningToolsForPacket(packet);
const recipeTool = tools.find((tool) => tool.name === 'create_visual_recipe');
assert.ok(recipeTool, 'Compatible facts should activate create_visual_recipe.');
assert.equal(recipeTool.parameters.additionalProperties, false);
assert.ok(!JSON.stringify(recipeTool).includes('timeFactId'), 'Gemini must not bind values to years.');
assert.ok(!JSON.stringify(recipeTool).includes('points'), 'Gemini planning arguments must stay flat.');
const request = makeGeminiRequest({ input:'test', tools, toolChoice:{allowed_tools:{mode:'any',tools:tools.map((tool)=>tool.name)}} });
assert.equal(request.store, false);
assert.equal(request.stream, false);
assert.equal(request.background, false);
assert.equal(request.generation_config.thinking_level, 'low');
assert.equal(request.generation_config.thinking_summaries, 'none');
assert.equal(request.generation_config.tool_choice.allowed_tools.mode, 'any');
assert.throws(() => makeGeminiRequest({ input:'bad', thinkingLevel:'minimal' }), /low, medium, or high/i);

const mixed = extractNumericFacts(makeTextScan('Inflation was 2.9% and revenue was EUR 3 million.', {headline:'Mixed'}).article);
assert.ok(compatibleMeasureFacts(mixed).every((group) => new Set(group.map((fact) => `${fact.kind}|${fact.unit}`)).size === 1));

const csv = rowsToCsv([{ label:'=1+1', value:2 }, { label:'safe', value:-3 }]);
assert.match(csv, /'=1\+1/);
assert.match(csv, /safe,-3/);

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(manifest.version, '1.0.0');
assert.equal(packageJson.version, '1.0.0');
assert.equal(manifest.version, packageJson.version);
assert.deepEqual(new Set(manifest.permissions), new Set(['activeTab','scripting','sidePanel']));
assert.deepEqual(manifest.host_permissions, ['http://127.0.0.1/*']);

for (const required of ['START_HERE.md','USER_GUIDE.md','FIRST_TEST_CHECKLIST.md','ARCHITECTURE.md','TROUBLESHOOTING.md','RELEASE_NOTES.md','KEY_MANAGEMENT.md','PRIVACY.md']) {
  assert.ok(fs.existsSync(path.join(root, required)), `${required} must ship in v1.`);
}

const sourceFiles = ['manifest.json','src/service-worker.js','src/model.js','src/article-facts.js','src/page-scanner.js','src/ai-contract.js','src/gemini-api.js','src/sidepanel.js','server/gemini-core.mjs','server/gemini-proxy.mjs'];
const source = sourceFiles.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
assert.doesNotMatch(source, /AIza[0-9A-Za-z_-]{20,}/, 'A real-looking Gemini key must never be bundled.');
assert.doesNotMatch(source, /\beval\s*\(|\bnew\s+Function\s*\(/, 'Runtime eval/new Function is forbidden.');
assert.doesNotMatch(source, /Access-Control-Allow-Origin['"\s:]*\*/, 'Wildcard CORS must not ship.');

console.log(`VizLens core regression passed: ${casePasses}/38 article cases + ${localized.length} localized numeric cases + grounding/security/release invariants.`);
