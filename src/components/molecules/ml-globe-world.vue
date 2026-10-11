<script setup lang="ts">
import {targets as legacyTargets,mapStops as legacyMapStops} from '~/experience/globe/layout'
import {destinations} from '~/experience/explorer/world-data'
import {panelShortcut} from '~/experience/explorer/keyboard'
import {freshWorkshop} from '~/experience/globe/workshop'
import {spawn as legacySpawn} from '~/experience/globe/geography'
import {roomLabels} from '~/experience/globe/rooms'
import type {QualityChoice} from '~/experience/globe/quality'
import type {GlobeHandle,Snapshot,RuntimeState,NavigationState,ResidentGreeting} from '~/experience/globe/types'
import type {TimeMode} from '~/experience/explorer/types'
import type {TalkView} from '~/experience/globe/talk-view'
import type {TalkHandle} from '~/experience/globe/conversation-flow'
import type {Profile,Resume,RoleSummary} from '~/domain/content/models'
import {createPassport,trailDefinitions,type WorldEvent,type TrailId} from '~/experience/globe/passport'
import type {TrailGuidance} from '~/experience/globe/trail-guidance'
import {defaultPhotoOptions} from '~/experience/globe/photo'
import type {WeatherChoice} from '~/experience/globe/weather'
import {isSecret} from '~/experience/globe/secrets'
import {hasSessionReset,rememberSessionReset} from '~/experience/archipelago/reset-barrier'
import {deliveryStops,ferryStops} from '~/experience/archipelago/activities'
import type {CompiledArchipelagoWorld} from '~/experience/archipelago/compile'
const {profile,roles,skillGroups}=defineProps<{profile:Profile;roles:RoleSummary[];skillGroups:Resume['skillGroups']}>()
const {config}=useContent(),scene=useTemplateRef<GlobeHandle>('scene'),places=useTemplateRef<HTMLDetailsElement>('places'),menu=useTemplateRef<HTMLDetailsElement>('menu'),settingsTrigger=useTemplateRef<HTMLButtonElement>('settingsTrigger'),passportTrigger=useTemplateRef<HTMLButtonElement>('passportTrigger'),panelTitle=useTemplateRef<HTMLElement>('panelTitle'),panelBody=useTemplateRef<HTMLElement>('panelBody')
const route=useRoute(),controlsReady=ref(false),v2=computed(()=>!controlsReady.value||route.query.controls!=='legacy')
const world=ref<'legacy'|'archipelago'>('legacy'),archipelago=shallowRef<CompiledArchipelagoWorld|null>(null),worldSwitching=ref(false),worldError=ref('')
const targets=computed(()=>world.value==='archipelago'&&archipelago.value?archipelago.value.targets:legacyTargets),mapStops=computed(()=>world.value==='archipelago'&&archipelago.value?archipelago.value.mapStops:legacyMapStops)
let selectionSequence=0,worldInitialized=false
const modalBodySuspended=ref(false),menuOpened=ref(false),placesOpened=ref(false),settingsOpen=ref(false),passportOpen=ref(false),photoOpen=ref(false),weather=ref<WeatherChoice>('auto'),photoOptions=ref(defaultPhotoOptions()),photoBusy=ref(false),photoError=ref(''),photoStatus=ref(''),guidance=shallowRef<TrailGuidance|null>(null)
let visit=createPassport(targets.value,null),dialogAction:(()=>void)|null=null,dialogOrigin:'settings'|'passport'='settings',componentDisposed=false
const passportState=shallowRef(visit.snapshot()),celebration=ref('');let celebrationTimer:ReturnType<typeof setTimeout>|undefined
const ready=ref(false),paused=ref(false),opened=ref<string|null>(null),reading=ref(true),sprinting=ref(false),time=ref<TimeMode>('day'),state=ref<Snapshot>({near:null,inside:null,overview:true,crouched:false,discovered:0,total:targets.value.filter(t=>t.kind!=='exit').length,workshop:freshWorkshop()})
const cameraExpanded=ref(false)
const runtime=ref<RuntimeState>({sound:'off',quality:{choice:'auto',level:'balanced',measurement:'idle',report:null}}),graphicsChoice=ref<QualityChoice>('auto'),soundBusy=ref(false),calm=ref(false),walked=ref(false)
const navigation=shallowRef<NavigationState>({...legacySpawn,yaw:.2,inside:null})
const talk=useTemplateRef<TalkHandle>('talk'),talkView=shallowRef<TalkView|null>(null)
const greeting=shallowRef<ResidentGreeting|null>(null),ivanLine=ref('')
function residentGreeting(value:ResidentGreeting|null){greeting.value=value;if(value)ivanLine.value=value.text}
const stage=useTemplateRef<HTMLElement>('stage'),{locked:scrollLocked,release:releaseScroll}=useWorldPageScroll(stage,ready,modalBodySuspended)
const announcement=ref('A meadow planet to explore. The complete portfolio is also available in the text version.'),outcome=ref('')
const {choice,selected:hat}=useSeasonalHat()
watch(hat,value=>scene.value?.setHat(value),{immediate:true})
const selected=computed(()=>targets.value.find(t=>t.id===opened.value)),nearby=computed(()=>targets.value.find(t=>t.id===state.value.near)),stops=computed(()=>{
 const available=state.value.inside?targets.value.filter(t=>t.room===state.value.inside):mapStops.value.flatMap(id=>{const target=targets.value.find(item=>item.id===id);return target?[target]:[]})
 return available.filter(target=>!isSecret(target.id)||passportState.value.secrets.includes(target.id))
})
const talking=computed(()=>selected.value?.kind==='person')
const sailing=computed(()=>state.value.ferry?.phase==='sailing'),activityPanel=computed(()=>world.value==='archipelago'&&!!selected.value&&(deliveryStops.some(stop=>stop.targetId===selected.value?.id)||ferryStops.some(stop=>stop.targetId===selected.value?.id)))
const districtStops=computed(()=>world.value==='archipelago'&&archipelago.value?archipelago.value.districts.map(district=>({id:district.id,name:district.name,target:targets.value.find(target=>target.id===district.targetId)})).filter(district=>district.target):[])
const placeGroups=computed(()=>{
 if(state.value.inside||world.value!=='archipelago'||!archipelago.value)return[{name:state.value.inside?roomLabels[state.value.inside]:'Your meadow guide',targets:stops.value}]
 const data=archipelago.value
 function area(target:typeof stops.value[number]){return data.areaAt(target.arrival)??data.districts.reduce((nearest,district)=>data.distance(target.arrival,district.arrival)<data.distance(target.arrival,nearest.arrival)?district:nearest).id}
 return data.districts.map(district=>({name:district.name,targets:stops.value.filter(target=>area(target)===district.id)})).filter(group=>group.targets.length)
})
function availability(value:boolean){ready.value=value;reading.value=!value||(import.meta.client&&window.location.hash==='#globe-reading');if(value){scene.value?.setHat(hat.value);scene.value?.setTimeMode(time.value);scene.value?.setQuality(graphicsChoice.value);scene.value?.setWeather(weather.value);scene.value?.setProgress(passportState.value)}}
function snapshot(value:Snapshot){const before=state.value;state.value=value;if(value.inside!==before.inside)announcement.value=value.inside?`Inside ${roomLabels[value.inside]}. Walk around, or use Places to find an interaction.`:world.value==='archipelago'?'Back on the islands.':'Back in the meadow.';else if(value.near!==before.near&&value.near)announcement.value=`${targets.value.find(t=>t.id===value.near)?.label}. Press E to interact.`}
function closeMenus(){menuOpened.value=placesOpened.value=false;if(places.value)places.value.open=false;if(menu.value)menu.value.open=false;settingsOpen.value=false;passportOpen.value=false}
function explore(){scene.value?.explore();scene.value?.focus();announcement.value='WASD or arrows walk. Shift runs, Space jumps, C crouches, F waves. E interacts.'}
async function open(id:string){if(sailing.value)return;opened.value=id;outcome.value='';talkView.value=null;closeMenus();const target=targets.value.find(t=>t.id===id);announcement.value=target?.kind==='person'?`Talking with ${target.name}. E continues, 1 to 3 choose a reply, and Escape says goodbye.`:`${target?.label}. E or Escape returns to the world.`;await nextTick();if(talking.value)talk.value?.focus();else panelTitle.value?.focus({preventScroll:true})}
async function close(){opened.value=null;await nextTick();scene.value?.focus()}
async function resumeTalk(code:string){await close();scene.value?.resumeKey(code)}
async function travel(id:string){if(sailing.value)return;if(!ready.value){reading.value=true;releaseScroll();closeMenus();await nextTick();document.getElementById('globe-reading')?.scrollIntoView();return}const target=targets.value.find(t=>t.id===id);if(!target)return;opened.value=null;closeMenus();await nextTick();scene.value?.visit(id);if(target.kind==='door'||target.kind==='exit')scene.value?.interact();else if(target.kind==='place')announcement.value=`Welcome to ${target.name}. Keep walking to explore the neighbourhood.`;else await open(id);if(!opened.value)scene.value?.focus()}
function browse(event:MouseEvent,text=false){if(!releaseScroll(event))return;if(text)reading.value=true;closeMenus();scene.value?.halt()}
function interact(){if(sailing.value)return;if(state.value.overview)explore();else{scene.value?.interact();scene.value?.focus()}}
function action(value:string){const destination=value==='workshop'?'notebook':value.startsWith('travel:')?value.slice(7):null;if(destination&&targets.value.some(target=>target.id===destination)){void travel(destination);return}if(!selected.value)return;const id=selected.value.id;outcome.value=scene.value?.action(id,value).message??'';announcement.value=outcome.value;if(id==='duck-pond'&&value==='feed'||ferryStops.some(stop=>stop.targetId===id)&&value==='board')void close()}
function skipFerry(){const stop=ferryStops.find(candidate=>candidate.id===state.value.ferry?.from);if(!stop)return;announcement.value=scene.value?.action(stop.targetId,'skip').message??'Back on dry land.';scene.value?.focus()}
function changeTime(){time.value=time.value==='cycle'?'day':time.value==='day'?'night':'cycle';scene.value?.setTimeMode(time.value);announcement.value=`World lighting: ${time.value==='cycle'?'Auto':time.value}.`}
async function reset(){clearTimeout(celebrationTimer);celebration.value='';opened.value=null;sprinting.value=false;walked.value=false;closeMenus();await nextTick();scene.value?.reset();visit.reset();rememberSessionReset(window.history,world.value,visit.snapshot().storage==='local');refreshPassport();weather.value='auto';scene.value?.focus();announcement.value=world.value==='archipelago'?'A fresh start on the islands.':'A fresh start on the meadow planet.'}
function sprint(){sprinting.value=!sprinting.value;scene.value?.focus()}
function pause(){paused.value=!paused.value}
function viewWorld(){opened.value=null;sprinting.value=false;scene.value?.overview();scene.value?.focus()}
function leave(){opened.value=null;scene.value?.leave();scene.value?.focus()}
async function panelKey(event:KeyboardEvent){
 if(!opened.value||!(event.target instanceof Element))return
 const action=panelShortcut(event.code,event.repeat,event.altKey||event.ctrlKey||event.metaKey,!!event.target.closest('input,textarea,select,[contenteditable]'),!!event.target.closest('a,button,summary,[role="button"]'))
 if(!action)return;event.preventDefault();event.stopPropagation()
 if(action==='read'){const body=panelBody.value;if(body){const direction=['ArrowUp','PageUp'].includes(event.code)?-1:1;body.scrollTop=event.code==='Home'?0:event.code==='End'?body.scrollHeight:body.scrollTop+direction*(event.code.startsWith('Page')?body.clientHeight*.8:60)}return}
 await close();if(action==='walk')scene.value?.resumeKey(event.code)
}
function menuKey(event:KeyboardEvent){if(event.key==='Escape'&&event.target instanceof Element){const item=event.target.closest('details');if(item){event.preventDefault();item.open=false;item.querySelector('summary')?.focus()}}}
function menuToggle(which:'menu'|'places',event:Event){const isOpen=(event.target as HTMLDetailsElement).open;(which==='menu'?menuOpened:placesOpened).value=isOpen;if(isOpen){for(const [id,ref] of [['menu',menu],['places',places]] as const)if(id!==which&&ref.value)ref.value.open=false;settingsOpen.value=false;passportOpen.value=false;scene.value?.halt()}}
function runtimeState(value:RuntimeState){const previous=runtime.value.quality.measurement;runtime.value=value;if(previous==='running'&&value.quality.measurement==='ready')announcement.value='Performance sample ready in Settings.'}
async function sound(){soundBusy.value=true;const enabled=runtime.value.sound!=='on'&&runtime.value.sound!=='paused';const result=await scene.value?.setSound(enabled);soundBusy.value=false;announcement.value=enabled?(result?'Soundscape enabled.':'Sound could not start. Try enabling it again.'):'Soundscape muted.'}
function graphics(value:QualityChoice){graphicsChoice.value=value;scene.value?.setQuality(value)}
async function measure(){opened.value=null;closeMenus();await nextTick();scene.value?.explore();scene.value?.measure();scene.value?.focus();announcement.value='Sampling performance for ten seconds. Walk around, then find the result in Settings.'}

function refreshPassport(){passportState.value=visit.snapshot();scene.value?.setProgress(passportState.value)}
function worldEvent(event:WorldEvent){
 if(!v2.value||photoOpen.value||worldSwitching.value||componentDisposed)return
 if(event.type==='trail-progress'){
  const name=trailDefinitions.find(trail=>trail.id===event.trailId)?.title??'Your trail'
  if(event.finished){celebration.value=`${name} · complete`;announcement.value=celebration.value;clearTimeout(celebrationTimer);celebrationTimer=setTimeout(()=>{celebration.value=''},3500)}
  else announcement.value=`${name} · ${event.completed} of ${event.total} little moments.`
  return
 }
 if(event.type==='activity'&&event.id==='return-wave')announcement.value='A friendly wave, returned.'
 const before=passportState.value,result=visit.record(event)
 if(result.changed){refreshPassport();for(const trail of trailDefinitions){const count=trail.requirements.filter(id=>passportState.value.activities.includes(id)).length,previous=trail.requirements.filter(id=>before.activities.includes(id)).length;if(count!==previous)worldEvent({type:'trail-progress',trailId:trail.id,completed:count,total:trail.requirements.length,finished:count===trail.requirements.length})}}
}
function conversationReply(node:string){if(selected.value?.id==='ivan'||selected.value?.id==='rue'&&(node==='history'||node.startsWith('role:')))worldEvent({type:'conversation',id:selected.value.id})}
function showSettings(){modalBodySuspended.value=true;closeMenus();dialogOrigin='settings';settingsOpen.value=true;scene.value?.halt()}
function showPassport(){modalBodySuspended.value=true;closeMenus();dialogOrigin='passport';passportOpen.value=true;scene.value?.halt()}
async function dialogClosed(){await nextTick();if(componentDisposed)return;if(!settingsOpen.value&&!passportOpen.value)modalBodySuspended.value=false;const next=dialogAction;dialogAction=null;if(next){next();return}if(opened.value||photoOpen.value||settingsOpen.value||passportOpen.value)return;(dialogOrigin==='settings'?settingsTrigger.value:passportTrigger.value)?.focus({preventScroll:true})}
function fromDialog(action:()=>void){dialogAction=action;settingsOpen.value=false;passportOpen.value=false}
function trackTrail(id:TrailId|null){visit.track(id);refreshPassport();announcement.value=id?'Follow the firefly, or use Places whenever you like.':'Trail guidance is off.';if(passportOpen.value||settingsOpen.value)fromDialog(()=>scene.value?.focus());else scene.value?.focus()}
async function togglePhoto(){if(!ready.value||!v2.value)return;if(photoOpen.value){photoOpen.value=false;scene.value?.setPhoto(false);await nextTick();scene.value?.focus();return}closeMenus();opened.value=null;photoError.value=photoStatus.value='';photoOptions.value=defaultPhotoOptions();photoOpen.value=true;scene.value?.setPhotoOptions(photoOptions.value);scene.value?.setPhoto(true);await nextTick();scene.value?.focus();announcement.value='Photo mode. Drag to frame, then save your postcard. Escape returns to exploring.'}
async function capturePhoto(){if(photoBusy.value)return;photoBusy.value=true;photoError.value=photoStatus.value='';try{const result=await scene.value?.capturePhoto();if(!result||componentDisposed||!photoOpen.value)return;const url=URL.createObjectURL(result.blob),link=document.createElement('a');link.href=url;link.download=`ivan-lara-postcard-${Date.now()}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);photoStatus.value=`Saved · ${result.width} × ${result.height} pixels`}catch(error){if(!componentDisposed&&photoOpen.value&&(error as Error).name!=='AbortError')photoError.value=(error as Error).message||'The postcard could not be saved. Try again.'}finally{if(!componentDisposed)photoBusy.value=false}}
watch(weather,value=>scene.value?.setWeather(value));watch(photoOptions,value=>scene.value?.setPhotoOptions(value),{deep:true})
async function selectWorld(value:unknown){
 const next=value==='legacy'?'legacy':'archipelago',sequence=++selectionSequence;worldError.value=''
 if(next===world.value&&worldInitialized){worldSwitching.value=false;return}
 if(next==='archipelago'&&!archipelago.value){
  worldSwitching.value=true;ready.value=false;scene.value?.halt()
  try{const loaded=await import('~/experience/archipelago/compile');if(sequence!==selectionSequence||componentDisposed)return;archipelago.value=loaded.archipelagoWorld}
  catch{if(sequence===selectionSequence&&!componentDisposed){worldError.value='The islands could not be loaded. Try again, or explore the text version below.';announcement.value=worldError.value}return}
 }
 if(sequence!==selectionSequence||componentDisposed)return
 if(next!==world.value){
  opened.value=null;photoOpen.value=false;scene.value?.setPhoto(false);closeMenus();clearTimeout(celebrationTimer);celebration.value='';guidance.value=null;greeting.value=null;sprinting.value=false;walked.value=false;ready.value=false;world.value=next
  state.value={near:null,inside:null,overview:true,crouched:false,discovered:0,total:targets.value.filter(target=>target.kind!=='exit').length,workshop:freshWorkshop()}
  navigation.value={...(next==='archipelago'?archipelago.value!.spawn:legacySpawn),yaw:.2,inside:null}
 }
 visit.dispose();visit=createPassport(targets.value,undefined,{worldId:next==='archipelago'?'archipelago':'meadow'});if(hasSessionReset(window.history,next)){visit.reset();rememberSessionReset(window.history,next,visit.snapshot().storage==='local')}refreshPassport();worldInitialized=true;worldSwitching.value=false
 announcement.value=next==='archipelago'?'A little archipelago to explore. Meet Ivan, wander through town, or take a boat to the orchard.':'A meadow planet to explore. The complete portfolio is also available in the text version.'
}
watch(()=>route.query.world,value=>{if(controlsReady.value)void selectWorld(value)})
watch(sailing,value=>{if(value){sprinting.value=false;scene.value?.halt();announcement.value='The ferry is on its way. Enjoy the water, or choose Skip ride.'}})
onMounted(()=>{controlsReady.value=true;void selectWorld(route.query.world)})
onBeforeUnmount(()=>{componentDisposed=true;selectionSequence++;visit.dispose();clearTimeout(celebrationTimer);dialogAction=null})

</script>
<template>
 <section class="explorer-world world-surface" data-experience="globe" :data-world="world" :data-scroll-locked="scrollLocked" :aria-label="world==='archipelago'?'Ivan’s island world':'Ivan’s meadow planet'">
  <div ref="stage" class="globe-stage">
   <AtGlobeScene v-if="!worldSwitching" :key="`${world}-${v2?'v2':'legacy'}`" ref="scene" :world :riding="sailing" :controls="v2?'v2':'legacy'" :photographing="photoOpen" :scroll-locked="scrollLocked" :enabled="!paused" :blocked="!!opened||menuOpened||placesOpened||settingsOpen||passportOpen||photoOpen" :engaged="opened" :sprinting :calm @world-event="worldEvent" @guidance="guidance=$event" @photo="togglePhoto" @move="walked=true" @runtime="runtimeState" @availability="availability" @state="snapshot" @navigation="navigation=$event" @talk-view="talkView=$event" @greeting="residentGreeting" @interact="open" />
   <div v-if="worldSwitching" class="world-loading" role="status"><p>{{ worldError||'Finding our little islands…' }}</p><button v-if="worldError" type="button" @click="selectWorld('archipelago')">Try again</button><a v-if="worldError" href="#globe-reading" @click="browse($event,true)">Read the portfolio</a></div>
   <header v-show="!photoOpen" class="globe-header" :inert="!ready" @keydown="menuKey">
    <div class="globe-identity"><span class="identity-dot" aria-hidden="true" /><div><h1>{{ profile.name }}</h1><p>{{ profile.headline }}</p></div></div>
    <div class="globe-tools">
     <details ref="places" class="globe-places" @toggle="menuToggle('places',$event)"><summary class="globe-button" aria-label="Places"><UIcon name="i-mdi-map-marker-outline" aria-hidden="true" /><span>Places</span></summary><div class="globe-dropdown"><p class="dropdown-title">{{ state.inside?`Inside ${roomLabels[state.inside]}`:world==='archipelago'?'Your island guide':'Your meadow guide' }}</p><p>Choose a place to travel. Blue doors open.</p><div v-if="districtStops.length&&!state.inside" class="district-quicklinks" aria-label="Explore the five island areas"><button v-for="(district,index) in districtStops" :key="district.id" type="button" :disabled="sailing" @click="district.target&&travel(district.target.id)"><small aria-hidden="true">{{ String(index+1).padStart(2,'0') }}</small>{{ district.name }}<AtMotionArrow /></button></div><section v-for="group in placeGroups" :key="group.name" class="place-group"><h3 v-if="world==='archipelago'&&!state.inside">{{ group.name }}</h3><button v-for="target in group.targets" :key="target.id" type="button" :disabled="sailing" @click="travel(target.id)">{{ target.label }}<AtMotionArrow /></button></section><button v-if="!state.inside" type="button" :disabled="sailing" @click="travel('notebook')">Try the workbench <AtMotionArrow /></button><a href="#globe-reading" @click="browse($event,true)">Read without the 3D world <AtMotionArrow /></a></div></details>
     <button ref="settingsTrigger" type="button" class="globe-button" aria-label="Settings" aria-haspopup="dialog" :aria-expanded="settingsOpen" @click="showSettings"><UIcon name="i-mdi-cog-outline" aria-hidden="true" /></button>
     <details ref="menu" class="globe-menu" @toggle="menuToggle('menu',$event)"><summary class="globe-button" aria-label="Menu"><UIcon name="i-mdi-menu" aria-hidden="true" /></summary><div class="globe-dropdown"><nav aria-label="Main navigation"><button v-if="v2" type="button" @click="togglePhoto">Take a postcard <span>P</span></button><NuxtLink v-for="item in config.navItems" :key="item.path" :to="item.path" :aria-current="item.path==='/'?'page':undefined">{{ item.name }}<AtMotionArrow /></NuxtLink></nav></div></details>
    </div>
   </header>

   <div v-if="!photoOpen&&!opened&&state.overview" class="globe-intro" :inert="!ready"><p class="globe-eyebrow">Welcome to my little corner of the world</p><h2><span>Small world.</span><em>Big ideas.</em></h2><p>I turn complex ideas into usable products.</p><button class="globe-primary" type="button" :disabled="!ready||paused" @click="explore">Explore the world <UIcon name="i-mdi-earth" aria-hidden="true" /></button><span class="globe-intro-hint">Walk, wander, ask a question. <span class="fine-pointer">Drag the globe to turn it.</span></span></div>
   <MlGlobeMinimap v-if="ready&&!state.overview&&!photoOpen" v-show="!opened" :position="navigation" :guidance :world="world==='archipelago'?archipelago:null" />
   <template v-if="!photoOpen&&!opened&&!state.overview">
    <div class="globe-journal"><button v-if="v2" ref="passportTrigger" type="button" aria-label="Open discovery passport" aria-haspopup="dialog" :aria-expanded="passportOpen" @click="showPassport"><span aria-hidden="true">✦</span>{{ passportState.earned }} / {{ passportState.total }} stamps</button><template v-else><span aria-hidden="true">✦</span>{{ state.inside?roomLabels[state.inside]:`${state.discovered} / ${state.total} discoveries` }}</template><button v-if="state.inside" type="button" aria-label="Go outside" @click="leave"><span class="journal-exit-wide">Go outside</span><span class="journal-exit-short">Exit</span><AtMotionArrow /></button></div>
    <div v-if="!sailing" class="globe-walking"><AtWalkControls advanced :disabled="paused||!ready||menuOpened||placesOpened||settingsOpen||passportOpen||photoOpen||sailing" :crouched="state.crouched" :sprinting @move="scene?.setInput($event)" @jump="scene?.jump()" @wave="scene?.wave()" @crouch="scene?.setCrouch(!state.crouched)" @sprint="sprint" /></div>
    <div v-if="!sailing" class="globe-prompt"><button v-if="nearby" type="button" :disabled="!ready||paused" @click="interact"><kbd aria-hidden="true">E</kbd>{{ nearby.label }}<AtMotionArrow /></button><p v-if="!walked" class="fine-pointer">WASD / arrows · Shift run · Space jump · C crouch · F wave</p><p v-if="!walked" class="coarse-pointer">Drag the stick to walk. Choose Places to travel.</p></div>
   </template>
   <MlResidentGreeting v-if="!photoOpen&&!opened&&!paused&&state.inside==='home'&&greeting" :greeting :view="talkView" :calm />
   <MlGlobeTalk v-if="selected&&talking" ref="talk" :key="selected.id" :target="selected" :profile :roles :skill-groups="skillGroups" :view="talkView" :greeting="selected.id==='ivan'?ivanLine:undefined" :calm @action="action" @close="close" @walk="resumeTalk" @reply="conversationReply" />
   <aside v-if="selected&&!talking" class="globe-panel" :aria-label="selected.id==='notebook'?'Workshop interaction':activityPanel?'Island activity':'Conversation'" @keydown="panelKey"><div class="globe-panel-heading"><p ref="panelTitle" class="sr-only" tabindex="-1">{{ selected.label }}</p><button type="button" class="globe-button" aria-label="Close conversation" @click="close"><UIcon name="i-mdi-close" aria-hidden="true" /></button></div><div ref="panelBody" class="globe-panel-body"><MlWorkshopInteraction v-if="selected.id==='notebook'" :state="state.workshop" @action="action" /><MlArchipelagoActivity v-else-if="activityPanel" :target="selected" :delivery="state.delivery" :ferry="state.ferry" :paused @action="action" /><MlGlobeConversation v-else :key="selected.id" :target="selected" :profile :roles :skill-groups="skillGroups" @action="action" /><p v-if="outcome&&selected.id!=='notebook'" class="globe-outcome" role="status">{{ outcome }}</p></div><button type="button" class="globe-return" @click="close">Back to exploring <kbd>E / Esc</kbd></button></aside>
   <div v-if="world==='archipelago'&&sailing&&!photoOpen&&!opened" class="ferry-ride"><span role="status">A little sea air · {{ state.ferry?.to==='orchard'?'Orchard landing':'Harbor landing' }}</span><progress :value="state.ferry?.progress??0" max="1" aria-label="Ferry crossing progress" /><button type="button" @click="skipFerry">Skip ride<AtMotionArrow /></button></div>
   <nav v-show="!talking&&!photoOpen" class="globe-footer" :inert="!ready" aria-label="Explore the portfolio"><a href="#selected-work" @click="browse($event)">Projects <UIcon name="i-mdi-arrow-down" aria-hidden="true" /></a><a href="#globe-reading" @click="browse($event,true)">Text version</a></nav>
   <div v-if="v2&&ready&&!opened&&!photoOpen" class="camera-tools" :class="{'camera-overview':state.overview}" role="group" aria-label="Camera controls"><button type="button" aria-label="Zoom in" @click="scene?.zoom(-.12)"><UIcon name="i-mdi-plus" /></button><button type="button" aria-label="Zoom out" @click="scene?.zoom(.12)"><UIcon name="i-mdi-minus" /></button><button type="button" aria-label="Recenter camera (R)" @click="scene?.recenter()"><UIcon name="i-mdi-refresh" /></button><button type="button" aria-label="More camera controls" :aria-expanded="cameraExpanded" aria-controls="camera-directions" @click="cameraExpanded=!cameraExpanded"><UIcon name="i-mdi-camera-control" /></button><div v-if="cameraExpanded" id="camera-directions" class="camera-directions"><button type="button" aria-label="Turn camera left" @click="scene?.orbit(.2,0)"><UIcon name="i-mdi-arrow-left" /></button><button type="button" aria-label="Look higher" @click="scene?.orbit(0,-.12)"><UIcon name="i-mdi-arrow-up" /></button><button type="button" aria-label="Turn camera right" @click="scene?.orbit(-.2,0)"><UIcon name="i-mdi-arrow-right" /></button><button type="button" aria-label="Look lower" @click="scene?.orbit(0,.12)"><UIcon name="i-mdi-arrow-down" /></button></div></div>
   <div v-if="v2&&guidance&&!opened&&!photoOpen&&!state.overview&&!sailing" class="trail-guide"><span>Follow the firefly</span><p>{{ guidance.label }}</p><small>{{ guidance.waitingAtDoor?'Press E at the door':guidance.unreachable?'Use Places to reach this stop':guidance.arrived?guidance.hint:'A little further along the path' }}</small><button type="button" aria-label="Stop trail guidance" @click="trackTrail(null)"><UIcon name="i-mdi-close" /></button></div>
   <div v-if="celebration&&!photoOpen" class="trail-celebration" role="status">{{ celebration }}</div>
   <MlGlobePhoto v-if="photoOpen" v-model:options="photoOptions" :busy="photoBusy" :error="photoError" :status="photoStatus" @close="togglePhoto" @capture="capturePhoto" />
   <MlWorldDialog v-model:open="settingsOpen" title="Make yourself at home." description="A few little adjustments, just for you." :calm @closed="dialogClosed"><MlGlobeSettings v-model:hat="choice" v-model:calm="calm" v-model:weather="weather" :runtime :ready :paused :time :sound-busy="soundBusy" :v2 :world @sound="sound" @pause="pause" @lighting="changeTime" @overview="fromDialog(viewWorld)" @reset="fromDialog(reset)" @quality="graphics" @measure="fromDialog(measure)" @photo="fromDialog(togglePhoto)" /></MlWorldDialog>
   <MlWorldDialog v-model:open="passportOpen" title="Your little world passport." description="People met, places found, and a few good things along the way." :calm @closed="dialogClosed"><MlGlobePassport :snapshot="passportState" :targets :profile :roles :skill-groups="skillGroups" @track="trackTrail" @travel="fromDialog(()=>travel($event))" @close="passportOpen=false" /></MlWorldDialog>
   <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ announcement }}</p><noscript>Explore the complete portfolio in the text version below.</noscript>
  </div>
  <details id="globe-reading" class="globe-reading site-shell" :open="reading" @toggle="reading=($event.target as HTMLDetailsElement).open"><summary>Explore without the 3D world <AtMotionArrow /></summary><div class="globe-reading-grid"><section v-for="destination in destinations" :id="`read-${destination.id}`" :key="destination.id" :aria-label="destination.label"><MlWorldContent :place="destination.id" :profile :skill-groups="skillGroups" /></section></div></details>
 </section>
</template>
<style scoped>
.explorer-world { --world-edge:24px; --world-bottom:max(var(--world-edge),env(safe-area-inset-bottom,0px)); --world-dock-height:54px; --world-controls-bottom:calc(var(--world-bottom) + var(--world-dock-height) + 16px); color:var(--world-ink); }
:global(html[data-world-scroll-locked]) { scrollbar-gutter:stable; }
.explorer-world :focus-visible { outline:3px solid var(--world-blue); outline-offset:4px; }
.globe-stage { position:relative; height:100svh; min-height:560px; overflow:hidden; isolation:isolate; background:#c9e5e5; }
.globe-header { position:absolute; z-index:7; inset:1.25rem 1.5rem auto; display:flex; justify-content:space-between; align-items:flex-start; pointer-events:none; }
.globe-identity { display:flex; gap:.65rem; align-items:center; padding:.75rem 1rem; background:var(--world-paper); border:1px solid var(--world-line); border-radius:22px; box-shadow:0 3px 12px #24443712; }
.identity-dot { width:9px; height:9px; background:#6c964a; border:2px solid #d7e6b7; border-radius:50%; }
.globe-identity h1 { font-family:'Bricolage Grotesque',sans-serif; font-size:1.1rem; font-weight:650; line-height:1.15; letter-spacing:-.025em; }
.globe-identity p { margin-top:.2rem; font-size:.6875rem; color:var(--world-muted); }
.globe-tools { display:flex; gap:.5rem; pointer-events:auto; }
.globe-button { display:flex; align-items:center; justify-content:center; gap:.45rem; min-width:46px; min-height:46px; border:1px solid var(--world-line); border-radius:50%; background:var(--world-paper); color:var(--world-ink); font-size:1.25rem; cursor:pointer; box-shadow:0 3px 12px #24443712; list-style:none; touch-action:manipulation; }
.globe-button span { font-size:.8125rem; }
.globe-places summary { padding-inline:1rem; border-radius:999px; }
.globe-button::-webkit-details-marker { display:none; }
.globe-button:active { transform:translateY(1px); }
.globe-button:disabled,.globe-primary:disabled { opacity:.5; }
.globe-dropdown { position:absolute; right:0; top:58px; width:min(300px,calc(100vw - 2rem)); max-height:72svh; overflow-y:auto; overscroll-behavior:contain; border:1px solid var(--world-line); border-radius:24px; padding:1rem; background:var(--world-paper); box-shadow:0 8px 24px #243d3220; scrollbar-color:var(--world-line) transparent; }
.globe-dropdown p { margin-bottom:.5rem; font-size:.75rem; line-height:1.6; color:var(--world-muted); }
.globe-dropdown .dropdown-title { font-size:1rem; font-weight:650; color:var(--world-ink); }
.globe-dropdown :is(a,button) { display:flex; justify-content:space-between; align-items:center; gap:1rem; width:100%; min-height:46px; padding:.5rem .65rem; border-radius:14px; font-size:.8125rem; text-align:left; cursor:pointer; }
.globe-dropdown :is(a,button)+:is(a,button) { border-top:1px solid var(--world-line); }
.place-group h3 { margin:.9rem .6rem .25rem; color:var(--world-muted); font-size:.625rem; letter-spacing:.07em; text-transform:uppercase; }
.district-quicklinks { padding-bottom:.75rem; margin-bottom:.5rem; border-bottom:1px solid var(--world-line); }.district-quicklinks button { background:var(--world-soft); margin-top:.3rem; }.district-quicklinks small { color:var(--world-muted); font-size:.625rem; }.district-quicklinks button>svg { flex:none; }.globe-dropdown button:disabled { opacity:.5; cursor:default; }
.world-loading { position:absolute; z-index:10; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem; padding:2rem; background:#c9e5e5; text-align:center; }.world-loading p { max-width:300px; font-size:.875rem; line-height:1.7; }.world-loading :is(button,a) { min-height:44px; border:1px solid var(--world-line); border-radius:999px; background:var(--world-paper); padding:.7rem 1rem; }
.ferry-ride { position:absolute; z-index:5; bottom:var(--world-controls-bottom); left:50%; transform:translateX(-50%); width:310px; max-width:calc(100% - 2 * var(--world-edge)); display:grid; gap:.6rem; padding:1rem; border:1px solid var(--world-line); border-radius:24px; background:var(--world-paper); }.ferry-ride>span { font-size:.8125rem; text-align:center; }.ferry-ride progress { display:block; appearance:none; width:100%; height:4px; border:0; border-radius:999px; overflow:hidden; background:var(--world-soft); accent-color:var(--world-blue); }.ferry-ride progress::-webkit-progress-bar { background:var(--world-soft); }.ferry-ride progress::-webkit-progress-value { background:var(--world-blue); }.ferry-ride progress::-moz-progress-bar { background:var(--world-blue); }.ferry-ride button { display:flex; align-items:center; justify-content:space-between; gap:1rem; min-height:44px; border:1px solid var(--world-line); border-radius:999px; padding:.55rem .85rem; font-size:.8125rem; }
.globe-intro { position:absolute; z-index:3; left:var(--world-edge); bottom:var(--world-bottom); width:350px; max-width:calc(100% - 2 * var(--world-edge)); padding:1.25rem; border-radius:28px; background:var(--world-paper); border:1px solid var(--world-line); }
.globe-eyebrow { max-width:210px; font-size:.6875rem; letter-spacing:.08em; line-height:1.6; text-transform:uppercase; color:var(--world-muted); }
.globe-intro h2 { font-family:'Bricolage Grotesque',sans-serif; font-size:clamp(2rem,3.5vw,3.15rem); line-height:1.05; letter-spacing:-.05em; font-weight:650; margin-block:1rem; }
.globe-intro h2 :is(span,em) { display:block; white-space:nowrap; }
.globe-intro h2 em { color:var(--world-blue); font-style:normal; }
.globe-intro > p:not(.globe-eyebrow) { font-size:.875rem; line-height:1.6; max-width:230px; }
.globe-primary { display:flex; align-items:center; justify-content:space-between; gap:1.5rem; min-height:48px; width:100%; padding:.75rem 1rem; background:#285a4d; color:#fffef4; border-radius:999px; margin-top:1.25rem; font-size:.875rem; cursor:pointer; }
.globe-primary .iconify { flex:none; font-size:1.125rem; }
.globe-intro-hint { display:block; color:var(--world-muted); font-size:.6875rem; line-height:1.7; margin-top:.65rem; }
.globe-walking { position:absolute; z-index:3; bottom:var(--world-controls-bottom); left:1.5rem; right:1.5rem; pointer-events:none; }
.globe-walking :deep(.walk-stick) { background:#fffdf3dd; box-shadow:none; border:1px solid #65795266; }
.globe-walking :deep(.stick-knob) { background:#346f58; box-shadow:none; }
.globe-walking :deep(.walk-actions button) { box-shadow:none; border:1px solid var(--world-line); }
.globe-prompt { position:absolute; z-index:3; bottom:var(--world-controls-bottom); left:50%; transform:translateX(-50%); text-align:center; max-width:calc(100vw - 560px); }
.globe-prompt button { max-width:100%; display:inline-flex; align-items:center; justify-content:center; gap:.65rem; min-height:46px; padding:.6rem 1rem; background:var(--world-paper); color:var(--world-ink); border:1px solid var(--world-line); border-radius:999px; font-size:.875rem; cursor:pointer; }
.globe-prompt kbd { font:inherit; font-size:.6875rem; padding:.15rem .35rem; border:1px solid var(--world-line); border-radius:5px; }
.globe-prompt p { margin-top:.5rem; background:var(--world-paper); border-radius:999px; padding:.3rem .65rem; font-size:.6875rem; line-height:1.5; color:var(--world-muted); }
.globe-journal { position:absolute; z-index:3; top:102px; left:1.5rem; display:flex; align-items:center; gap:.5rem; padding:.4rem .7rem; border-radius:999px; background:var(--world-paper); color:var(--world-muted); font-size:.6875rem; border:1px solid var(--world-line); }
.globe-journal > span { color:#678744; }
.globe-journal button { display:flex; align-items:center; gap:.6rem; min-height:44px; padding:.2rem .5rem; font-size:.75rem; color:var(--world-blue); }
.journal-exit-short { display:none; }
@media (max-width:767px) { .globe-journal { white-space:nowrap; } .globe-journal button { gap:.35rem; padding-inline:.2rem; } .journal-exit-wide { display:none; } .journal-exit-short { display:inline; } }
.globe-footer { position:absolute; z-index:3; left:50%; bottom:var(--world-bottom); transform:translateX(-50%); display:flex; align-items:center; gap:2px; padding:4px; min-height:var(--world-dock-height); width:max-content; max-width:calc(100% - 2 * var(--world-edge)); border:1px solid var(--world-line); border-radius:999px; background:var(--world-paper); box-shadow:0 3px 12px #24443712; }
.globe-footer a { display:flex; align-items:center; gap:.4rem; min-height:44px; color:var(--world-ink); border-radius:999px; padding:.4rem 1rem; font-size:.75rem; }
.globe-footer a+a { position:relative; } .globe-footer a+a::before { content:''; position:absolute; left:-1px; height:16px; width:1px; background:var(--world-line); }
.globe-footer a:focus-visible { background:var(--world-soft); }
.globe-panel { position:absolute; z-index:6; right:1.5rem; top:100px; bottom:var(--world-controls-bottom); width:min(400px,calc(100% - 110px)); display:flex; flex-direction:column; background:var(--world-paper); border:1px solid var(--world-line); border-radius:24px; box-shadow:0 6px 28px #243d3220; }
.globe-panel-heading { position:absolute; z-index:1; top:.7rem; right:.7rem; }
.globe-panel-heading .globe-button { border:0; box-shadow:none; }
.globe-panel-body { padding:1.5rem; overflow:auto; overscroll-behavior:contain; scrollbar-color:var(--world-line) transparent; }
.globe-return { display:flex; align-items:center; justify-content:space-between; gap:1rem; min-height:50px; padding:.65rem 1.5rem; margin-top:auto; border-top:1px solid var(--world-line); font-size:.8125rem; color:var(--world-blue); cursor:pointer; }
.globe-return kbd { font:inherit; font-size:.6875rem; }
.globe-outcome { margin-top:1rem; padding:.75rem; border-radius:16px; background:var(--world-soft); color:var(--world-blue); font-size:.875rem; line-height:1.6; }
.coarse-pointer { display:none; }
.globe-reading { padding-block:1rem; }
.globe-reading summary { display:flex; gap:1rem; align-items:center; min-height:48px; cursor:pointer; font-size:.875rem; list-style:none; }
.globe-reading-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4rem; padding-block:2rem; }
.globe-noscript { position:absolute; bottom:70px; left:1rem; max-width:300px; padding:1rem; background:var(--world-paper); }
@media (hover:hover) and (pointer:fine) { .globe-dropdown :is(a,button):hover,.globe-button:hover,.globe-footer a:hover { background:var(--world-soft); color:var(--world-blue); } }
@media (min-width:768px) and (pointer:fine) { .globe-walking :deep(.walk-stick) { visibility:hidden; } }
@media (max-width:1023px) { .globe-intro { bottom:var(--world-controls-bottom); } }
@media (max-width:767px) { .explorer-world { --world-edge:16px; } .globe-header { inset:1rem; } .globe-identity { padding:.65rem .75rem; border-radius:18px; } .globe-identity p { display:none; } .globe-identity h1 { font-size:1rem; } .identity-dot { display:none; } .globe-places summary { padding-inline:.75rem; } .globe-button { min-width:44px; min-height:44px; } .globe-intro { padding:1rem; width:calc(100% - 2 * var(--world-edge)); max-width:none; } .globe-intro h2 { font-size:2.25rem; } .globe-intro-hint { max-width:240px; } .globe-walking { left:1rem; right:1rem; } .globe-walking :deep(.walk-actions button) { min-width:44px; min-height:44px; padding:.45rem .6rem; font-size:.75rem; } .globe-prompt { bottom:auto; top:133px; left:1rem; transform:none; max-width:calc(100% - 180px); text-align:left; } .globe-prompt button { font-size:.8125rem; padding:.5rem .7rem; } .fine-pointer { display:none; } .coarse-pointer { display:block; } .globe-prompt p { max-width:220px; } .globe-journal { top:78px; left:1rem; max-width:calc(100% - 180px); } .globe-panel { left:1rem; right:1rem; top:auto; bottom:var(--world-controls-bottom); max-height:55svh; width:auto; } .globe-panel-body { padding:1.2rem; } .globe-reading-grid { grid-template-columns:1fr; gap:3rem; } }
@media (pointer:coarse) { .fine-pointer { display:none; } .coarse-pointer { display:block; } }
@media (max-height:560px) { .globe-stage { min-height:360px; } .globe-intro { padding:.9rem; max-width:290px; } .globe-intro h2 { font-size:1.75rem; margin-block:.5rem; } .globe-intro > p:not(.globe-eyebrow) { font-size:.8125rem; line-height:1.5; } .globe-primary { min-height:44px; margin-top:.75rem; } .globe-intro-hint,.globe-eyebrow,.globe-prompt p { display:none; } .globe-panel { top:75px; bottom:var(--world-controls-bottom); max-height:none; } .globe-prompt { top:145px; bottom:auto; } }

.camera-tools { position:absolute; z-index:4; right:var(--world-edge); top:280px; display:flex; gap:6px; }
.camera-tools.camera-overview { top:100px; }.camera-directions { position:absolute; top:52px; right:0; display:flex; gap:6px; padding:8px; border:1px solid var(--world-line); border-radius:999px; background:var(--world-paper); }
.camera-tools button { display:grid; place-items:center; min-width:44px; min-height:44px; border-radius:50%; background:var(--world-paper); color:var(--world-ink); border:1px solid var(--world-line); }
.globe-journal:has(>button[aria-haspopup]) { padding:0 8px; }.globe-journal>button[aria-haspopup] { gap:.4rem; padding:.25rem 0; color:var(--world-ink); }
.trail-guide { position:absolute; z-index:4; left:var(--world-edge); top:152px; width:215px; max-width:calc(100% - 180px); background:var(--world-paper); border:1px solid var(--world-line); border-radius:20px; padding:.85rem 2.2rem .85rem .9rem; }
.trail-guide>span { font-size:.625rem; letter-spacing:.08em; text-transform:uppercase; color:var(--world-muted); }.trail-guide p { font-size:.875rem; font-weight:600; margin-block:.2rem; }.trail-guide small { font-size:.6875rem; line-height:1.5; color:var(--world-muted); display:block; }.trail-guide button { position:absolute; top:0; right:0; width:36px; }
.trail-celebration { position:absolute; z-index:8; left:50%; top:20%; transform:translateX(-50%); max-width:calc(100% - 2rem); padding:.8rem 1.2rem; border-radius:999px; background:var(--world-paper); color:var(--world-blue); border:1px solid var(--world-line); box-shadow:0 5px 24px #263f3820; font-size:.9375rem; }
@media (max-width:767px) { .camera-tools { top:222px; gap:4px; }.trail-guide { top:250px; padding:.7rem 1.8rem .7rem .7rem; }.trail-guide p { font-size:.8125rem; } }
@media (max-height:560px) { .camera-tools { top:76px; right:calc(var(--world-edge) + 132px); }.trail-guide { top:150px; width:190px; } }

@media print { :global(html),:global(body) { overflow:visible !important; } .globe-stage { display:none; } .globe-reading,.globe-reading-grid { display:block; } .globe-reading summary { display:none; } }
</style>
