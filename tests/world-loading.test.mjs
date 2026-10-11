import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {test} from 'node:test';
import {parse,compileScript} from 'vue/compiler-sfc';
import {createSSRApp,h} from 'vue';
import {renderToString} from 'vue/server-renderer';
import ts from 'typescript';
import {worldLoadStages,worldLoadState,advanceWorldLoad} from '../src/experience/globe/loading.ts';

test('startup progress counts completed preparation phases and only explicit ready can reach the maximum',()=>{
 const states=worldLoadStages.map(worldLoadState),total=states[0].total;
 assert.equal(states[0].stage,'module');assert.equal(states[0].completed,0);assert.equal(states.at(-1).stage,'ready');
 for(const [index,state] of states.entries()){
  assert.equal(state.completed,index);assert.equal(state.total,total);assert.ok(state.title.length>8);assert.ok(state.detail.length>20);
  if(state.stage!=='ready')assert.ok(state.completed<total);
 }
 assert.equal(states.at(-1).completed,total);assert.equal(new Set(states.map(state=>state.title)).size,states.length);
 const first=worldLoadState('terrain');first.completed=99;first.title='Changed';assert.deepEqual(worldLoadState('terrain'),states[1]);
});

test('late or duplicate phase callbacks never regress progress or accept an invented completion count',()=>{
 let state=worldLoadState('module');
 for(const stage of ['terrain','buildings','city','residents','shaders']){
  const next=worldLoadState(stage);state=advanceWorldLoad(state,next);assert.deepEqual(state,next);
  assert.equal(advanceWorldLoad(state,next),state);assert.equal(advanceWorldLoad(state,worldLoadState('module')),state);
 }
 assert.equal(advanceWorldLoad(state,{...worldLoadState('module'),completed:999}),state);
 const ready=advanceWorldLoad(state,worldLoadState('ready'));assert.equal(ready.completed,ready.total);
 assert.equal(advanceWorldLoad(ready,worldLoadState('terrain')),ready);
});

// Render the actual component with Vue's installed compiler, rather than a test copy of its markup.
const require=createRequire(import.meta.url),source=await readFile(new URL('../src/components/molecules/ml-world-loader.vue',import.meta.url),'utf8');
const {descriptor}=parse(source),script=compileScript(descriptor,{id:'world-loader-test',inlineTemplate:true});
const compiled=ts.transpileModule(script.content,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
 .replaceAll('from "vue"',`from ${JSON.stringify(pathToFileURL(require.resolve('vue')).href)}`)
 .replaceAll("from 'vue'",`from ${JSON.stringify(pathToFileURL(require.resolve('vue')).href)}`);
const {default:WorldLoader}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const render=props=>renderToString(createSSRApp({render:()=>h(WorldLoader,props)}));

test('the SSR loading surface exposes real phase progress, one polite status and an immediate text route',async()=>{
 for(const stage of worldLoadStages.filter(stage=>stage!=='ready')){
  const state=worldLoadState(stage),html=await render({state});
  assert.match(html,/role="progressbar"/);assert.ok(html.includes(`aria-valuenow="${state.completed}"`));assert.ok(html.includes(`aria-valuemax="${state.total}"`));
  assert.ok(html.includes(`aria-valuetext="${state.title}"`));assert.equal((html.match(/role="status"/g)??[]).length,1);
  assert.match(html,/aria-live="polite"/);assert.match(html,/href="#globe-reading"/);assert.match(html,/Read the portfolio/);assert.match(html,/aria-hidden="true"/);
  assert.ok(!html.includes('Your world is ready'));
 }
});

test('failure replaces the progress bar with a complete-portfolio escape and reduced-motion state is retained',async()=>{
 const html=await render({state:worldLoadState('residents'),failed:true,reduced:true});
 assert.match(html,/The 3D world could not open/);assert.match(html,/complete portfolio is ready below/);assert.match(html,/href="#globe-reading"/);
 assert.ok(!html.includes('role="progressbar"'));assert.match(html,/data-reduced="true"/);assert.match(html,/data-failed="true"/);
 assert.match(source,/@media \(prefers-reduced-motion:reduce\)/);assert.match(source,/animation:none/);assert.match(source,/transition:none/);
});
