import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compatibleMeasureFacts, extractNumericFacts, makeTextScan } from '../src/article-facts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cases = JSON.parse(fs.readFileSync(path.join(root, 'tests/bbc-regression.json'), 'utf8'));
let passed = 0;
for (const testCase of cases) {
  const facts = extractNumericFacts(makeTextScan(testCase.text, { headline: testCase.name }).article);
  for (const expected of testCase.contains || []) {
    const match = facts.find((fact) =>
      Math.abs(fact.value - expected.value) <= Math.max(1e-9, Math.abs(expected.value) * 1e-12)
      && fact.kind === expected.kind && fact.unit === expected.unit);
    assert.ok(match, `${testCase.name}: missing ${JSON.stringify(expected)}`);
  }
  const groups = compatibleMeasureFacts(facts);
  if ((testCase.minCompatibleGroup || 0) >= 2) assert.ok(groups.some((group) => group.length >= testCase.minCompatibleGroup), `${testCase.name}: compatible group`);
  console.log(`PASS ${testCase.name} (${facts.length} facts)`);
  passed += 1;
}
console.log(`BBC-style regression pack passed: ${passed}/${cases.length}`);
