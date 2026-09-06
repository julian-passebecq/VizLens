import process from 'node:process';
import assert from 'node:assert/strict';
import { makeTextScan } from '../src/article-facts.js';
import { planArticleWithGemini } from '../server/gemini-core.mjs';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
if (!apiKey) {
  console.error('No GEMINI_API_KEY or GOOGLE_API_KEY is configured. This opt-in smoke test makes exactly one live Gemini request.');
  process.exit(2);
}

const scan = makeTextScan(
  'Synthetic VizLens test. Revenue was USD 10 million in 2024. Revenue was USD 14 million in 2025.',
  { headline: 'Synthetic VizLens Gemini smoke test' },
);

const result = await planArticleWithGemini({ scan, apiKey });
assert.equal(result.apiRequests, 1, 'Live smoke should use exactly one Gemini API request.');
assert.ok(result.interactionId, 'Gemini Interactions response must include a top-level interaction ID.');
assert.ok(result.functionCall?.id, 'Gemini function call must include a unique call ID.');
assert.ok(result.functionCall?.name, 'Gemini must return one VizLens function call.');
assert.ok(['create_visual_recipe', 'research_only', 'use_existing_visual'].includes(result.functionCall.name));
assert.ok(result.functionCall.arguments && typeof result.functionCall.arguments === 'object' && !Array.isArray(result.functionCall.arguments), 'Function arguments must be a JSON object.');
if (result.functionCall.name === 'create_visual_recipe') {
  assert.ok(Array.isArray(result.functionCall.arguments.factIds), 'create_visual_recipe must return flat factIds[].');
  assert.equal('points' in result.functionCall.arguments, false, 'Gemini must not return nested points.');
  assert.equal('timeFactId' in result.functionCall.arguments, false, 'Gemini must not bind values to years.');
}
assert.ok(result.result?.kind, 'VizLens must materialize a grounded result.');
console.log(`VizLens live Gemini smoke passed: ${result.functionCall.name} -> ${result.result.kind}; API requests: ${result.apiRequests}.`);
