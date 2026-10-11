import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {test} from 'node:test';
import {parse,compileScript} from 'vue/compiler-sfc';
import {createRenderer,h,reactive,nextTick,markRaw} from 'vue';
import ts from 'typescript';

// Exercise the real component and its Vue watchers without a DOM/WebGL dependency.
const require=createRequire(import.meta.url),vueURL=pathToFileURL(require.resolve('vue')).href;
const source=await readFile(new URL('../src/components/atoms/at-globe-scene.vue',import.meta.url),'utf8'),{descriptor}=parse(source),script=compileScript(descriptor,{id:'globe-scene-lifecycle',inlineTemplate:true});
const compiled=`import {useTemplateRef,ref,shallowRef,watch,onMounted,onBeforeUnmount} from ${JSON.stringify(vueURL)};\n`+ts.transpileModule(script.content,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
 .replaceAll('from "vue"',`from ${JSON.stringify(vueURL)}`).replaceAll("from 'vue'",`from ${JSON.stringify(vueURL)}`)
 .replace(/(['"])~\/([^'"]+)\1/g,(_match,_quote,path)=>JSON.stringify(new URL(`../src/${path}${path.endsWith('.ts')?'':'.ts'}`,import.meta.url).href));
const {default:GlobeScene}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

function events(){
 const listeners=new Map();
 return{addEventListener(type,listener){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(listener)},removeEventListener(type,listener){listeners.get(type)?.delete(listener)},dispatch(type,event={}){for(const listener of [...(listeners.get(type)??[])])listener(event)},count(type){return listeners.get(type)?.size??0}};
}
function hostNode(tag,text=''){return markRaw({tag,text,parent:null,children:[],props:{},dataset:{},focus(){},hasPointerCapture(){return false},releasePointerCapture(){}})}
function detach(node){if(!node.parent)return;const children=node.parent.children,index=children.indexOf(node);if(index>=0)children.splice(index,1);node.parent=null}
function renderer(){return createRenderer({
 createElement:tag=>hostNode(tag),createText:text=>hostNode('#text',text),createComment:text=>hostNode('#comment',text),
 setText(node,text){node.text=text},setElementText(node,text){node.text=text;node.children=[]},patchProp(node,key,_previous,value){node.props[key]=value},
 insert(node,parent,anchor=null){detach(node);const index=anchor?parent.children.indexOf(anchor):-1;if(index>=0)parent.children.splice(index,0,node);else parent.children.push(node);node.parent=parent},remove:detach,
 parentNode:node=>node.parent,nextSibling(node){if(!node.parent)return null;return node.parent.children[node.parent.children.indexOf(node)+1]??null},setScopeId(){},
})}

test('actual globe component respects OS reduced motion over Calm, updates live and disposes preference/input listeners',async()=>{
 const names=['window','document','IntersectionObserver'],saved=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)])),windowEvents=events(),documentEvents=events(),mediaEvents=events(),observers=[];
 const media={matches:true,...mediaEvents},document={hidden:false,...documentEvents},window={...windowEvents,matchMedia(query){assert.equal(query,'(prefers-reduced-motion: reduce)');return media}};
 class Observer{constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this)}observe(node){this.observed=node}disconnect(){this.disconnected=true}}
 for(const [name,value]of Object.entries({window,document,IntersectionObserver:Observer}))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
 let app;
 try{
  const props=reactive({enabled:true,blocked:false,calm:false,controls:'v2'}),availability=[],root=hostNode('root');
  app=renderer().createApp({render:()=>h(GlobeScene,{...props,onAvailability:value=>availability.push(value)})});app.component('MlWorldLoader',{props:['state','failed','reduced'],setup:props=>()=>h('div',{'data-loader-reduced':props.reduced})});app.mount(root);await nextTick();
  const stage=root.children.find(node=>node.props.class==='globe-scene'),loader=()=>stage.children.find(node=>'data-loader-reduced'in node.props),reduced=()=>stage.props['data-reduced-motion'];
  assert.ok(stage);assert.equal(reduced(),true);assert.equal(loader().props['data-loader-reduced'],true);assert.equal(stage.props['data-world-state'],'loading');assert.deepEqual(availability,[],'an invisible stage never starts the dynamic WebGL scene');assert.equal(observers.length,1);assert.equal(observers[0].observed,stage);
  assert.equal(mediaEvents.count('change'),1);assert.equal(windowEvents.count('blur'),1);assert.equal(windowEvents.count('keyup'),1);assert.equal(documentEvents.count('visibilitychange'),1);
  props.calm=true;await nextTick();props.calm=false;await nextTick();assert.equal(reduced(),true,'turning Calm off cannot override an OS preference');
  media.matches=false;mediaEvents.dispatch('change',{matches:false});await nextTick();assert.equal(reduced(),false);assert.equal(loader().props['data-loader-reduced'],false);
  props.calm=true;await nextTick();assert.equal(reduced(),true);media.matches=true;mediaEvents.dispatch('change',{matches:true});await nextTick();media.matches=false;mediaEvents.dispatch('change',{matches:false});await nextTick();assert.equal(reduced(),true,'an OS preference change cannot override an explicit Calm choice');
  props.calm=false;await nextTick();assert.equal(reduced(),false);props.enabled=false;media.matches=true;mediaEvents.dispatch('change',{matches:true});await nextTick();assert.equal(reduced(),true,'preferences still update while the world is paused');
  document.hidden=true;documentEvents.dispatch('visibilitychange');windowEvents.dispatch('blur');app.unmount();app=null;await nextTick();
  assert.equal(mediaEvents.count('change'),0);assert.equal(windowEvents.count('blur'),0);assert.equal(windowEvents.count('keyup'),0);assert.equal(documentEvents.count('visibilitychange'),0);assert.equal(observers[0].disconnected,true);assert.equal(root.children.length,0);
 }finally{
  app?.unmount();await nextTick();for(const name of names){const previous=saved.get(name);if(previous)Object.defineProperty(globalThis,name,previous);else delete globalThis[name]}
 }
});
