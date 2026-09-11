import process from 'node:process';
import assert from 'node:assert/strict';
import { extractSingleModelText, makeGeminiRequest, postGemini } from '../server/gemini-core.mjs';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
if (!apiKey) {
  console.error('No GOOGLE_API_KEY or GEMINI_API_KEY is configured. This opt-in smoke test makes exactly one live Gemini structured-output request.');
  process.exit(2);
}

const schema = {
  type:'object',
  properties:{
    ok:{type:'boolean'},
    mode:{type:'string',enum:['structured-output']},
  },
  required:['ok','mode'],
  additionalProperties:false,
};
const request = makeGeminiRequest({
  input:'Return ok=true and mode=structured-output. Follow the JSON schema exactly.',
  responseFormat:schema,
  thinkingLevel:'low',
  maxOutputTokens:120,
});
assert.ok(!request.tools);
assert.ok(!request.generation_config.tool_choice);
assert.equal(request.response_format.mime_type, 'application/json');
const interaction = await postGemini(request, { apiKey });
assert.equal(interaction.status, 'completed', 'Structured-output interaction must complete normally.');
assert.ok(interaction.id == null || typeof interaction.id === 'string', 'An optional interaction ID must be a string.');
const text = extractSingleModelText(interaction, 'live structured output');
const parsed = JSON.parse(text);
assert.deepEqual(Object.keys(parsed).sort(), ['mode','ok']);
assert.equal(parsed.ok, true);
assert.equal(parsed.mode, 'structured-output');
console.log('VizLens live Gemini structured-output smoke passed; API requests: 1.');
