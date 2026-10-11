<script setup lang="ts">
import type {GlobeController,GlobeHandle,Snapshot,RuntimeState,NavigationState,ResidentGreeting} from '~/experience/globe/types'
import type {MoveInput,TimeMode} from '~/experience/explorer/types'
import type {QualityChoice} from '~/experience/globe/quality'
import type {HatId} from '~/experience/explorer/seasonal-hats'
import type {TalkView} from '~/experience/globe/talk-view'
import {advanceWorldLoad,worldLoadState} from '~/experience/globe/loading'
import {createLookRouter,legacyLook} from '~/experience/globe/input-router'
import type {PhotoOptions} from '~/experience/globe/photo'
import type {WeatherChoice} from '~/experience/globe/weather'
import type {WorldEvent,PassportSnapshot} from '~/experience/globe/passport'
import type {TrailGuidance} from '~/experience/globe/trail-guidance'
const {enabled,blocked,engaged=null,sprinting=false,calm=false,controls='legacy',world='legacy',riding=false,photographing=false,scrollLocked=false}=defineProps<{enabled:boolean;blocked:boolean;engaged?:string|null;sprinting?:boolean;calm?:boolean;controls?:'v2'|'legacy';world?:'archipelago'|'legacy';riding?:boolean;photographing?:boolean;scrollLocked?:boolean}>()
const emit=defineEmits<{state:[snapshot:Snapshot];navigation:[value:NavigationState];talkView:[value:TalkView|null];greeting:[value:ResidentGreeting|null];runtime:[value:RuntimeState];availability:[ready:boolean];interact:[id:string];move:[];worldEvent:[event:WorldEvent];guidance:[value:TrailGuidance|null];photo:[]}>()
const stage=useTemplateRef<HTMLElement>('stage'),canvas=useTemplateRef<HTMLCanvasElement>('canvas'),ready=ref(false),failed=ref(false),reduced=ref(false)
const loadState=shallowRef(worldLoadState('module'))
let controller:GlobeController|undefined,observer:IntersectionObserver|undefined,media:MediaQueryList|undefined,visible=false,loading=false,disposed=false,isOverview=true,entered=false,requestedTime:TimeMode='day',requestedHat:HatId='everyday'
const keys=new Set<string>(),abort=new AbortController()
let current:MoveInput={x:0,forward:0,run:false}
const look=createLookRouter()
function activity(){const running=visible&&!document.hidden&&(enabled||photographing);if(!running)clear();controller?.setActive(running)}
function clear(){keys.clear();current={x:0,forward:0,run:false};controller?.halt();for(const id of look.ids())if(canvas.value?.hasPointerCapture(id))canvas.value.releasePointerCapture(id);look.clear()}
function failure(){if(disposed)return;failed.value=true;ready.value=false;controller?.dispose();controller=undefined;emit('availability',false)}
async function initialize(){
 if(disposed||loading||controller||failed.value||!visible)return
 loading=true
 try{
  const {createGlobeScene}=await import('~/experience/globe/scene')
  if(disposed||!visible||!canvas.value)return
  const created=await createGlobeScene(canvas.value,{reduced:reduced.value,controls,world,onEvent:event=>emit('worldEvent',event),onGuidance:value=>emit('guidance',value),onLoad(value){if(!disposed&&!failed.value)loadState.value=advanceWorldLoad(loadState.value,value)},onState(snapshot){if(disposed)return;isOverview=snapshot.overview;emit('state',snapshot)},onNavigation(value){if(!disposed)emit('navigation',value)},onTalkView(value){if(!disposed)emit('talkView',value)},onGreeting(value){if(!disposed)emit('greeting',value)},onRuntime(value){if(!disposed)emit('runtime',value)},onInteract:id=>emit('interact',id),onMove:()=>emit('move'),onFailure:failure},abort.signal)
  if(disposed||failed.value){created.dispose();return}
  controller=created;controller.setReduced(reduced.value);controller.setHat(requestedHat);controller.setTimeMode(requestedTime);controller.setEngaged(engaged);if(entered)controller.explore()
  ready.value=true;emit('availability',true);activity()
 }catch{if(!disposed)failure()}finally{loading=false}
}
function focus(){canvas.value?.focus({preventScroll:true})}
function move(input:MoveInput){current=input;if(!blocked&&!riding&&enabled)controller?.setInput({...input,run:input.run||sprinting})}
function updateKeys(){move({x:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),forward:Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),run:keys.has('ShiftLeft')||keys.has('ShiftRight')})}
function down(event:KeyboardEvent){
 if(event.altKey||event.ctrlKey||event.metaKey)return
 if(controls==='v2'&&(!blocked||photographing)){
  const cameraKey=['KeyR','Minus','Equal','BracketLeft','BracketRight','PageUp','PageDown'].includes(event.code)
  if(cameraKey){event.preventDefault();if(event.code==='KeyR')controller?.recenter();else if(event.code==='Minus'||event.code==='Equal')controller?.zoom(event.code==='Minus'?.12:-.12);else controller?.orbit(event.code==='BracketLeft'?.12:event.code==='BracketRight'?-.12:0,event.code==='PageUp'?-.08:event.code==='PageDown'?.08:0);return}
  if(event.code==='KeyP'||photographing&&event.code==='Escape'){event.preventDefault();if(!event.repeat)emit('photo');return}
  if(isOverview&&event.code.startsWith('Arrow')){event.preventDefault();controller?.orbit(event.code==='ArrowLeft'?.12:event.code==='ArrowRight'?-.12:0,event.code==='ArrowUp'?-.08:event.code==='ArrowDown'?.08:0);return}
 }
 if(blocked||riding||!enabled||photographing)return
 if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(event.code)){event.preventDefault();keys.add(event.code);updateKeys()}
 if(event.code==='Space')event.preventDefault()
 if(event.repeat)return
 if(event.code==='Space')controller?.jump()
 if(event.code==='KeyF'){event.preventDefault();controller?.wave()}
 if(event.code==='KeyC'){event.preventDefault();controller?.setCrouch(canvas.value?.dataset.crouched!=='true')}
 if(event.code==='KeyE'||event.code==='Enter'){event.preventDefault();controller?.interact()}
 if(event.code==='Escape'){event.preventDefault();controller?.leave()}
}
function up(event:KeyboardEvent){if(keys.delete(event.code))updateKeys()}
function preference(){reduced.value=calm||(media?.matches??false);controller?.setReduced(reduced.value)}
function pointerDown(event:PointerEvent){if(controls==='legacy'&&!event.isPrimary)return;if(blocked&&!photographing||event.pointerType==='touch'&&!scrollLocked&&!photographing)return;focus();if(controls==='v2'||isOverview){look.down(event.pointerId,event.clientX,event.clientY);canvas.value?.setPointerCapture(event.pointerId)}}
function pointerMove(event:PointerEvent){if(blocked&&!photographing)return;const width=canvas.value?.clientWidth??1,height=canvas.value?.clientHeight??1,gesture=look.move(event.pointerId,event.clientX,event.clientY,width,height),value=controls==='v2'?gesture:legacyLook(gesture,width,height);if(value.yaw||value.pitch)controller?.orbit(value.yaw,value.pitch);if(value.zoom)controller?.zoom(value.zoom)}
function pointerEnd(event:PointerEvent){look.up(event.pointerId);if(canvas.value?.hasPointerCapture(event.pointerId))canvas.value.releasePointerCapture(event.pointerId)}
function wheel(event:WheelEvent){if(controls!=='v2'||blocked&&!photographing||!scrollLocked&&!photographing||event.ctrlKey||event.metaKey)return;event.preventDefault();controller?.zoom(Math.max(-.2,Math.min(.2,event.deltaY*.001)))}
const handle:GlobeHandle={setInput:move,focus,halt:clear,setSound(value){return controller?.setSound(value)??Promise.resolve(false)},setQuality(value:QualityChoice){controller?.setQuality(value)},measure(){controller?.measure()},resumeKey(code){focus();keys.add(code);updateKeys()},explore(){entered=true;controller?.explore()},overview(){clear();controller?.overview()},visit(id){clear();controller?.visit(id)},interact(){controller?.interact()},leave(){clear();controller?.leave()},setCrouch(value){if(blocked||riding||!enabled)return;focus();controller?.setCrouch(value)},setEngaged(id){controller?.setEngaged(id)},setTimeMode(value){requestedTime=value;controller?.setTimeMode(value)},setHat(value){requestedHat=value;controller?.setHat(value)},jump(){if(blocked||riding||!enabled)return;focus();controller?.jump()},wave(){if(blocked||riding||!enabled)return;focus();controller?.wave()},orbit(x,y){controller?.orbit(x,y)},zoom(value){controller?.zoom(value);focus()},recenter(){controller?.recenter();focus()},setWeather(value:WeatherChoice){controller?.setWeather(value)},setProgress(value:PassportSnapshot){controller?.setProgress(value)},setPhoto(value){clear();controller?.setPhoto(value);activity()},setPhotoOptions(value:PhotoOptions){controller?.setPhotoOptions(value)},capturePhoto(){return controller?.capturePhoto()??Promise.reject(new Error('The world is not ready.'))},action(id,action){return controller?.action(id,action)??{message:'The world is still getting ready.'}},reset(){clear();entered=false;controller?.reset()}}
defineExpose(handle)
watch(()=>calm,preference);watch(()=>enabled,()=>{clear();activity()});watch(()=>photographing,()=>{clear();activity()});watch(()=>blocked,clear);watch(()=>riding,clear);watch(()=>engaged,value=>controller?.setEngaged(value));watch(()=>sprinting,()=>move(current))
onMounted(()=>{media=window.matchMedia('(prefers-reduced-motion: reduce)');reduced.value=calm||media.matches;media.addEventListener('change',preference);document.addEventListener('visibilitychange',activity);window.addEventListener('keyup',up);window.addEventListener('blur',clear);observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;activity();if(visible)void initialize()},{rootMargin:'32px'});if(stage.value)observer.observe(stage.value)})
onBeforeUnmount(()=>{disposed=true;abort.abort();clear();controller?.dispose();observer?.disconnect();media?.removeEventListener('change',preference);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',activity)})
</script>
<template>
 <div ref="stage" class="globe-scene" :data-world-state="ready?'ready':failed?'fallback':'loading'" :data-world-load-stage="loadState.stage" :data-world-load-completed="loadState.completed" :data-reduced-motion="reduced">
  <canvas ref="canvas" :tabindex="ready&&(!blocked||photographing)?0:-1" :style="{touchAction:scrollLocked||photographing?'none':'pan-y'}" :aria-hidden="!ready" :aria-busy="!ready&&!failed" :inert="!ready" role="application" :aria-label="`${world==='archipelago'?'Ivan’s island world':'Ivan’s meadow planet'}. WASD or arrows walk, Shift runs, Space jumps, C crouches, F waves. E talks or enters a nearby place. Escape leaves a building. Places gives direct access to every discovery.`" aria-describedby="globe-keyboard-help" @keydown="down" @blur="clear" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerEnd" @pointercancel="pointerEnd" @lostpointercapture="pointerEnd" @wheel="wheel" />
  <MlWorldLoader v-if="!ready" :state="loadState" :failed :reduced />
  <p id="globe-keyboard-help" class="sr-only">Choose Explore the world to start on Meadow Bridge. Drag the globe to turn it. Use Places to travel directly, including Ivan’s house, the workshop, library, café and bookshop. The island world connects a harbor, Japanese market, maker village, orchard and wild coast. Trails wrap all the way around the globe. <template v-if="controls==='v2'">Drag scenery to turn the walking camera. Wheel or pinch zooms. R recenters, brackets rotate, Page Up and Page Down tilt, plus and minus zoom. P opens photo mode. Movement follows the camera. Arrows rotate in World view.</template> In a villager conversation, E continues, 1 to 3 choose a reply, and Escape says goodbye. WASD from the speech heading walks away. Arrow keys choose replies. Object panels use E or Escape to close and arrow keys to scroll. Tab leaves the world.</p>
 </div>
</template>
<style scoped>
.globe-scene,canvas { position:absolute; inset:0; width:100%; height:100%; }
.globe-scene { background:#c9e5e5; }
canvas { display:block; touch-action:pan-y; outline-offset:-5px; }
canvas:focus-visible { outline:3px solid var(--world-blue); }
</style>
