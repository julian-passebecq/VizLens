import assert from 'node:assert/strict';
import { makeTextScan } from '../src/article-facts.js';
import { VIEWPORT_SCHEMA, compactEvidencePacket } from '../src/ai-contract.js';
import { analyzeViewportWithGemini, makeGeminiRequest, planArticleWithGemini, planningToolsForPacket } from '../server/gemini-core.mjs';
import { extractNumericFacts } from '../src/article-facts.js';

const scan = makeTextScan('Revenue was USD 10 million in 2024; revenue was USD 14 million in 2025.', { headline:'Gemini contract fixture' });
const packet = compactEvidencePacket(scan, extractNumericFacts(scan.article));
const tools = planningToolsForPacket(packet);
const recipeTool = tools.find((tool) => tool.name === 'create_visual_recipe');
assert.ok(recipeTool);
assert.deepEqual(recipeTool.parameters.required, ['family','factIds','reason','evidenceIds']);
assert.ok(!JSON.stringify(recipeTool).includes('timeFactId'));
assert.ok(!JSON.stringify(recipeTool).includes('points'));
assert.equal(recipeTool.parameters.additionalProperties, false);
assert.deepEqual(new Set(recipeTool.parameters.required), new Set(Object.keys(recipeTool.parameters.properties)));
const yearFactIds = packet.numericFacts.filter((fact) => fact.kind === 'year').map((fact) => fact.id);
for (const id of yearFactIds) assert.equal(recipeTool.parameters.properties.factIds.items.enum.includes(id), false, 'Year IDs must not be selectable as values.');
for (const tool of tools) {
  assert.equal(tool.type, 'function');
  assert.equal(tool.parameters.type, 'object');
  assert.equal(tool.parameters.additionalProperties, false);
  assert.deepEqual(new Set(tool.parameters.required), new Set(Object.keys(tool.parameters.properties)), 'All declared function arguments should be required in the active tool schema.');
}

let planningRequest;
const planFetch = async (_url, options) => {
  planningRequest = JSON.parse(options.body);
  return new Response(JSON.stringify({ id:'int_contract_plan', status:'requires_action', steps:[{type:'function_call',id:'fc_contract',name:'create_visual_recipe',arguments:{family:'time-series',factIds:['N1','N3'],reason:'Revenue trend',evidenceIds:['T1']}}] }), {status:200,headers:{'content-type':'application/json'}});
};
const planned = await planArticleWithGemini({ scan, apiKey:'contract-test-key', fetchImpl:planFetch });
assert.equal(planningRequest.store, false);
assert.equal(planningRequest.stream, false);
assert.equal(planningRequest.background, false);
assert.equal(planningRequest.input[0].type, 'user_input');
assert.equal(planningRequest.generation_config.thinking_summaries, 'none');
assert.equal(planningRequest.generation_config.tool_choice.allowed_tools.mode, 'any');
assert.deepEqual(planningRequest.generation_config.tool_choice.allowed_tools.tools, ['create_visual_recipe','research_only']);
assert.ok(planningRequest.tools.every((tool) => tool.type === 'function'));
assert.ok(!planningRequest.response_format, 'Function calling turn must not misuse final-response JSON mode.');
assert.equal(planned.interactionId, 'int_contract_plan');
assert.equal(planned.functionCall.id, 'fc_contract');
assert.deepEqual(planned.result.data.map((row) => row.time), [2024,2025]);
assert.deepEqual(planned.result.data.map((row) => row.timeFactId), ['N2','N4']);

const withoutInteractionId = (fetchImpl) => async (...args) => {
  const payload = await (await fetchImpl(...args)).json();
  delete payload.id;
  return new Response(JSON.stringify(payload), { status: 200 });
};
const statelessPlan = await planArticleWithGemini({ scan, apiKey:'contract-test-key', fetchImpl:withoutInteractionId(planFetch) });
assert.equal(statelessPlan.interactionId, undefined);
assert.deepEqual(statelessPlan.result.data, planned.result.data);
assert.equal(statelessPlan.functionCall.id, 'fc_contract');
await assert.rejects(() => planArticleWithGemini({ scan, apiKey:'contract-test-key', fetchImpl:async (...args) => {
  const payload = await (await planFetch(...args)).json();
  delete payload.id;
  payload.steps[0].arguments.factIds = ['N999', 'N3'];
  return new Response(JSON.stringify(payload), { status:200 });
} }), /not included|unknown|not.*prompt/i);

let viewportRequest;
const viewportFetch = async (_url, options) => {
  viewportRequest = JSON.parse(options.body);
  const result = {hasPrimaryVisual:false,visualType:'none',family:null,title:'',takeaway:'',dataRecoverability:'unknown',bbox:{x:0,y:0,width:0,height:0},reason:'No analytical visual'};
  return new Response(JSON.stringify({id:'int_contract_viewport',status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(result)}]}]}), {status:200,headers:{'content-type':'application/json'}});
};
const viewportResult = await analyzeViewportWithGemini({ imageDataUrl:'data:image/png;base64,iVBORw0KGgo=', page:{title:'Contract fixture'}, apiKey:'contract-test-key', fetchImpl:viewportFetch });
assert.equal(viewportResult.interactionId, 'int_contract_viewport');
const statelessViewport = await analyzeViewportWithGemini({ imageDataUrl:'data:image/png;base64,iVBORw0KGgo=', page:{title:'Contract fixture'}, apiKey:'contract-test-key', fetchImpl:withoutInteractionId(viewportFetch) });
assert.equal(statelessViewport.interactionId, undefined);
assert.equal(statelessViewport.hasPrimaryVisual, false);
assert.equal(viewportRequest.store, false);
assert.equal(viewportRequest.stream, false);
assert.equal(viewportRequest.background, false);
assert.equal(viewportRequest.generation_config.thinking_summaries, 'none');
assert.equal(viewportRequest.response_format.type, 'text');
assert.equal(viewportRequest.response_format.mime_type, 'application/json');
assert.deepEqual(viewportRequest.response_format.schema, VIEWPORT_SCHEMA);
assert.ok(!viewportRequest.tools, 'Structured-output turn should not declare custom functions.');
assert.ok(!viewportRequest.generation_config.tool_choice, 'Structured-output turn should not configure tool choice.');

assert.throws(() => makeGeminiRequest({ input:'Bad.', thinkingLevel:'minimal' }), /thinking_level must be low, medium, or high/i);
assert.throws(() => makeGeminiRequest({ input:'Mixed.', tools, responseFormat:VIEWPORT_SCHEMA, toolChoice:'any' }), /separate Gemini interactions/i);
const standaloneJsonRequest = makeGeminiRequest({ input:'Return JSON.', responseFormat:VIEWPORT_SCHEMA, maxOutputTokens:100 });
assert.equal(standaloneJsonRequest.response_format.mime_type, 'application/json');
assert.ok(!standaloneJsonRequest.tools);
console.log('VizLens Gemini contract audit passed: forced function call uses tool JSON only; viewport uses response_format JSON Schema only; host owns time binding.');
