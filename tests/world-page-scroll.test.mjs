import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {test} from 'node:test';
import {createRenderer,h,ref,nextTick,markRaw} from 'vue';
import ts from 'typescript';

const require=createRequire(import.meta.url),vueURL=pathToFileURL(require.resolve('vue')).href,coreURL=pathToFileURL(require.resolve('@vueuse/core')).href;
const source=await readFile(new URL('../src/composables/useWorldPageScroll.ts',import.meta.url),'utf8');
const compiled=`import {ref,watch,onMounted,onBeforeUnmount,readonly,nextTick} from ${JSON.stringify(vueURL)};function onNuxtReady(callback){globalThis.__scrollTestReady(callback)}\n`+ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("from '@vueuse/core'",`from ${JSON.stringify(coreURL)}`).replace("from '~/experience/globe/scroll-mode'",`from ${JSON.stringify(new URL('../src/experience/globe/scroll-mode.ts',import.meta.url).href)}`);
class ElementStub extends EventTarget{
 constructor(tag='div'){super();this.tagName=tag.toUpperCase();this.children=[];this.parent=null;this.dataset={};this.clientWidth=1200;this.style={overflow:'',paddingRight:'',marginRight:'',pointerEvents:'',setProperty(name,value){this[name]=value},removeProperty(name){delete this[name]}}}
 getBoundingClientRect(){return{height:800,top:0,bottom:800}}contains(target){return target===this||this.children.some(child=>child.contains?.(target))}closest(){return null}scrollIntoView(){}
}
function detach(node){if(node.parent){const siblings=node.parent.children,index=siblings.indexOf(node);if(index>=0)siblings.splice(index,1);node.parent=null}}
const renderer=()=>createRenderer({createElement:tag=>markRaw(new ElementStub(tag)),createText:()=>markRaw(new ElementStub()),createComment:()=>markRaw(new ElementStub()),setText(){},setElementText(){},patchProp(){},insert(node,parent){detach(node);parent.children.push(node);node.parent=parent},remove:detach,parentNode:node=>node.parent,nextSibling:()=>null,setScopeId(){}});

test('actual world scroll composable hands body ownership to installed Reka and restores scrolling on modal navigation',async()=>{
 const names=['window','document','HTMLElement','Element','location','__scrollTestReady'],saved=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)])),document=new EventTarget(),window=new EventTarget(),callbacks=[];
 document.documentElement=markRaw(new ElementStub('html'));document.body=markRaw(new ElementStub('body'));document.getElementById=()=>null;
 Object.assign(window,{document,navigator:{userAgent:'Node scroll lifecycle test',maxTouchPoints:0},innerWidth:1200,innerHeight:800,scrollY:0,scrollTo({top}){this.scrollY=top}});
 for(const [name,value]of Object.entries({window,document,HTMLElement:ElementStub,Element:ElementStub,location:{hash:''},__scrollTestReady:callback=>callbacks.push(callback)}))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
 let app;
 try{
  // Import after installing the minimal browser surface, so VueUse's actual
  // isClient branch runs; no replacement implementation of either lock is used.
  const {useWorldPageScroll}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`),uiRequire=createRequire(import.meta.resolve('@nuxt/ui')),rekaEntry=pathToFileURL(uiRequire.resolve('reka-ui'));
  const {useBodyScrollLock}=await import(new URL('shared/useBodyScrollLock.js',rekaEntry));
  const open=ref(false),suspended=ref(false),ready=ref(true),stage=ref(markRaw(new ElementStub('section')));let world;
  const Overlay={setup(){useBodyScrollLock(true);return()=>h('div')}};
  const World={setup(){world=useWorldPageScroll(stage,ready,suspended);return()=>h('section',open.value?[h(Overlay)]:[])}};
  const mount=async()=>{app=renderer().createApp(World);app.mount(markRaw(new ElementStub('root')));await nextTick();await nextTick();for(const callback of callbacks.splice(0))await callback()};
  await mount();assert.equal(world.locked.value,true);assert.equal(document.body.style.overflow,'hidden');assert.equal(document.documentElement.style.overflow,'hidden');
  suspended.value=true;assert.equal(document.body.style.overflow,'','handoff is synchronous before the modal snapshots overflow');assert.equal(document.documentElement.style.overflow,'hidden','html continues protecting the globe');open.value=true;await nextTick();await nextTick();assert.equal(document.body.style.overflow,'hidden','the real Reka overlay owns body now');
  // Content after-leave is not sufficient. Keep suspension through overlay exit,
  // then reacquire only after the real Reka cleanup has run.
  assert.equal(suspended.value,true);open.value=false;await nextTick();await nextTick();assert.equal(document.body.style.overflow,'');suspended.value=false;assert.equal(document.body.style.overflow,'hidden');assert.equal(world.locked.value,true);
  // Re-open, then navigate/unmount the entire world while the modal is alive.
  suspended.value=true;open.value=true;await nextTick();await nextTick();app.unmount();app=null;await nextTick();await nextTick();assert.equal(document.body.style.overflow,'','Reka must restore the pre-modal empty value after parent cleanup');assert.equal(document.documentElement.style.overflow,'');assert.equal(document.body.style.pointerEvents,'');assert.equal(document.documentElement.dataset.worldScrollLocked,undefined);
  // A subsequent visit owns and releases both locks normally, without leftovers.
  open.value=false;suspended.value=false;await mount();assert.equal(document.body.style.overflow,'hidden');assert.equal(document.documentElement.style.overflow,'hidden');assert.equal(world.release(),true);assert.equal(document.body.style.overflow,'');assert.equal(document.documentElement.style.overflow,'');app.unmount();app=null;await nextTick();
 }finally{app?.unmount();await nextTick();await nextTick();for(const name of names){const descriptor=saved.get(name);if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name]}}
});
