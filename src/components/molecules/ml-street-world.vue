<script setup lang="ts">
import { streetTargets } from '~/experience/street/level'
import { destinations } from '~/experience/explorer/world-data'
import { panelShortcut } from '~/experience/explorer/keyboard'
import { hatChoices } from '~/experience/explorer/seasonal-hats'
import type { ExplorerHandle, PetAction, PetState, TimeMode, WorldTargetId } from '~/experience/explorer/types'
import type { Profile, Resume } from '~/domain/content/models'
const { profile, skillGroups }=defineProps<{profile:Profile;skillGroups:Resume['skillGroups']}>()
const {config}=useContent(),scene=useTemplateRef<ExplorerHandle>('scene'),places=useTemplateRef<HTMLDetailsElement>('places'),panelTitle=useTemplateRef<HTMLElement>('panelTitle'),panelBody=useTemplateRef<HTMLElement>('panelBody')
const ready=ref(false),paused=ref(false),entered=ref(false),near=ref<WorldTargetId|null>(null),opened=ref<WorldTargetId|null>(null),reading=ref(true),time=ref<TimeMode>('day'),petState=ref<PetState>()
const announcement=ref('A little neighborhood to explore. Walk with WASD or arrow keys, or use Places to read every section.')
const {choice,selected:hat}=useSeasonalHat(),wardrobe=hatChoices.map(item=>({...item,label:item.value==='everyday'?'Everyday · no hat':item.label}))
watch(hat,value=>scene.value?.setHat(value),{immediate:true})
const selected=computed(()=>streetTargets.find(t=>t.id===opened.value)),nearby=computed(()=>streetTargets.find(t=>t.id===near.value))
const place=computed(()=>selected.value?.kind==='place'?selected.value.id:undefined),resident=computed(()=>selected.value?.kind==='resident'?selected.value:undefined),pet=computed(()=>selected.value?.kind==='pet'?selected.value:undefined)
function availability(value:boolean){ready.value=value;reading.value=!value;if(value)scene.value?.setHat(hat.value)}
function explore(){entered.value=true;scene.value?.explore();scene.value?.focus();announcement.value='WASD or arrows to walk. Space hops, F waves, and E talks to someone nearby.'}
function moved(){entered.value=true}
function nearPlace(id:WorldTargetId|null){near.value=id;if(id)announcement.value=`${streetTargets.find(t=>t.id===id)?.label} is nearby. Press E to interact.`}
async function open(id:WorldTargetId,travel=true){if(travel)scene.value?.visit(id);opened.value=id;entered.value=true;if(places.value)places.value.open=false;announcement.value=`${streetTargets.find(t=>t.id===id)?.label}. E or Escape returns to the street.`;await nextTick();panelTitle.value?.focus({preventScroll:true})}
async function close(){opened.value=null;await nextTick();scene.value?.focus()}
function petAction(action:PetAction){if(!pet.value)return;petState.value=scene.value?.interactPet(pet.value.id,action);announcement.value=action==='follow'?petState.value?.following?'Patch will walk with you.':'Patch is exploring independently.':action==='play'?'Patch is playing.':'Patch enjoyed that pat.'}
async function interact(){if(!entered.value){explore();return}if(near.value){await open(near.value,false);if(pet.value)petAction('pet')}else if(!entered.value)explore();else if(places.value)places.value.open=true}
function changeTime(){time.value=time.value==='cycle'?'day':time.value==='day'?'night':'cycle';scene.value?.setTimeMode(time.value);announcement.value=`Street lighting: ${time.value==='cycle'?'Auto':time.value}.`;scene.value?.focus()}
async function reset(){opened.value=null;await nextTick();scene.value?.reset();petState.value=undefined;near.value=null;scene.value?.focus();announcement.value='Back at the workshop.'}
function pause(){paused.value=!paused.value;if(!paused.value)scene.value?.focus()}
async function panelKey(event:KeyboardEvent){
    if(!opened.value||!(event.target instanceof Element))return
    const action=panelShortcut(event.code,event.repeat,event.altKey||event.ctrlKey||event.metaKey,!!event.target.closest('input,textarea,select,[contenteditable]'),!!event.target.closest('a,button,summary,[role="button"]'))
    if(!action)return;event.preventDefault();event.stopPropagation()
    if(action==='read'){const body=panelBody.value;if(body){const direction=['ArrowUp','PageUp'].includes(event.code)?-1:1;body.scrollTop=event.code==='Home'?0:event.code==='End'?body.scrollHeight:body.scrollTop+direction*(event.code.startsWith('Page')?body.clientHeight*.8:60)}return}
    await close();if(action==='walk')scene.value?.resumeKey(event.code)
}
function menuKey(event:KeyboardEvent){if(event.key==='Escape'&&event.target instanceof Element){const menu=event.target.closest('details');if(menu){event.preventDefault();menu.open=false;menu.querySelector('summary')?.focus()}}}
</script>
<template>
    <section class="explorer-world" data-experience="street" aria-label="Explore Ivan's workshop neighborhood">
        <div class="street-stage">
            <AtExplorerScene ref="scene" mode="street" :targets="streetTargets" :enabled="!paused" :blocked="!!opened" :engaged="opened" @availability="availability" @move="moved" @near="nearPlace" @place="open" @interact="interact" />
            <header class="street-header" @keydown="menuKey">
                <div class="street-identity"><h1>{{ profile.name }}<span aria-hidden="true">.</span></h1><p>{{ profile.headline }}</p></div>
                <div class="street-tools">
                    <details class="street-menu"><summary class="street-button" aria-label="Menu"><UIcon name="i-mdi-menu" aria-hidden="true" /></summary><div class="street-dropdown"><nav aria-label="Main navigation"><NuxtLink v-for="item in config.navItems" :key="item.path" :to="item.path" :aria-current="item.path==='/'?'page':undefined">{{ item.name }}<AtMotionArrow /></NuxtLink></nav><div class="street-wardrobe"><label for="street-hat">Explorer hat</label><USelect id="street-hat" v-model="choice" :items="wardrobe" aria-label="Explorer hat" :disabled="!ready" trailing-icon="i-mdi-chevron-down" selected-icon="i-mdi-check" :ui="{base:'rounded-full min-h-11 w-full',item:'min-h-11'}" /><p>{{ hat==='everyday'?'Everyday outfit. Seasonal hats follow Ivan’s Eastern Time calendar.':'Seasonal hat preview. Choose Automatic to follow Ivan’s calendar.' }}</p></div></div></details>
                    <details ref="places" class="street-places"><summary class="street-button" aria-label="Places"><UIcon name="i-mdi-map-marker-outline" aria-hidden="true" /></summary><div class="street-dropdown"><p>A little world. A lot of possibility.</p><a v-for="target in streetTargets" :key="target.id" :href="target.kind==='place'?`#read-${target.id}`:'#street-reading'" @click.prevent="open(target.id)">{{ target.label }}<AtMotionArrow /></a></div></details>
                </div>
            </header>
            <div class="street-settings"><button type="button" class="street-button" :aria-label="paused?'Resume world':'Pause world'" :aria-pressed="paused" @click="pause"><UIcon :name="paused?'i-mdi-play-outline':'i-mdi-pause'" aria-hidden="true" /></button><AtThemeToggle /><button type="button" class="street-button" data-world-light :aria-label="`Street light: ${time==='cycle'?'Auto':time}. Change lighting.`" :disabled="!ready" @click="changeTime"><UIcon :name="time==='night'?'i-mdi-weather-night':time==='day'?'i-mdi-weather-sunny':'i-mdi-weather-sunset'" aria-hidden="true" /></button><button type="button" class="street-button" aria-label="Reset" @click="reset"><UIcon name="i-mdi-refresh" aria-hidden="true" /></button></div>
            <div v-if="!opened" class="street-walking"><AtWalkControls :disabled="paused||!ready" @move="scene?.move($event)" @jump="scene?.jump()" @wave="scene?.wave()" /></div><div v-if="!opened" class="street-prompt"><button type="button" :disabled="!ready" @click="interact"><kbd v-if="nearby" aria-hidden="true">E</kbd>{{ !entered?'Take a little walk':nearby?.label ?? 'Explore the neighborhood' }}<AtMotionArrow /></button><p><span class="street-keyboard-hint">{{ entered?'WASD / arrows · Space to hop':'I turn complex ideas into usable products.' }}</span><span class="street-touch-hint">{{ entered?'Drag the stick · Tap a place to talk':'Take a walk. See what makes me tick.' }}</span></p></div>
            <aside v-if="opened" class="street-panel" aria-label="Selected place" @keydown="panelKey"><div class="street-panel-heading"><p ref="panelTitle" class="sr-only" tabindex="-1">{{ selected?.label }}</p><button type="button" class="street-button" aria-label="Close place" @click="close"><UIcon name="i-mdi-close" aria-hidden="true" /></button></div><div ref="panelBody" class="street-panel-body"><MlWorldContent v-if="place" :place :profile :skill-groups="skillGroups" /><MlVillageConversation v-else-if="resident" :resident :profile :skill-groups="skillGroups" /><MlPetCompanion v-else-if="pet" :pet :state="petState" :disabled="!ready" @action="petAction" /></div><button type="button" class="street-return" @click="close">Back to the neighborhood <kbd>E / Esc</kbd></button></aside>
            <footer class="street-footer"><a href="#selected-work">Projects <UIcon name="i-mdi-arrow-down" aria-hidden="true" /></a><a href="#street-reading" @click="reading=true">Text version</a></footer>
            <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ announcement }}</p>
            <noscript><p class="street-noscript">Every section is available in the text version below. <a href="#street-reading">Read the portfolio</a></p></noscript>
        </div>
        <details id="street-reading" class="street-reading site-shell" :open="reading" @toggle="reading=($event.target as HTMLDetailsElement).open"><summary>Explore without the 3D world <AtMotionArrow /></summary><div class="street-reading-grid"><section v-for="destination in destinations" :id="`read-${destination.id}`" :key="destination.id"><MlWorldContent :place="destination.id" :profile :skill-groups="skillGroups" /></section></div></details>
    </section>
</template>
<style scoped>
.explorer-world { --world-paper:#fff9ed; --world-ink:#263e59; --world-muted:#53677a; --world-blue:#2761bc; --world-line:#ced8db; --world-soft:#e9f1ff; color:var(--world-ink); }
:global(.dark .explorer-world) { --world-paper:#24343d; --world-ink:#edf0e3; --world-muted:#becdc9; --world-blue:#acd7dc; --world-line:#62767c; --world-soft:#344b53; }
.explorer-world :focus-visible { outline:3px solid var(--world-blue); outline-offset:4px; }
.explorer-world ::selection { background:var(--world-blue); color:var(--world-paper); }
.street-stage { position:relative; height:100svh; min-height:540px; overflow:hidden; isolation:isolate; background:#b9e4f1; }
.street-header { position:absolute; z-index:5; inset:1.15rem 1.15rem auto; display:flex; justify-content:space-between; align-items:flex-start; pointer-events:none; }
.street-identity { padding:.65rem .85rem; background:var(--world-paper); border-radius:12px; box-shadow:0 3px 6px #34414920; }
.street-identity h1 { font-family:'Bricolage Grotesque',sans-serif; font-size:1.1rem; font-weight:650; line-height:1.15; letter-spacing:-.025em; }
.street-identity h1 span { color:var(--world-blue); }
.street-identity p { margin-top:.2rem; font-size:.6875rem; color:var(--world-muted); }
.street-tools { display:flex; flex-direction:column; gap:.6rem; pointer-events:auto; }
.street-button { display:grid; place-items:center; min-width:46px; min-height:46px; border:1px solid var(--world-muted); border-radius:14px; background:var(--world-paper); color:var(--world-ink); font-size:1.35rem; cursor:pointer; box-shadow:1px 3px 2px #34414925; list-style:none; touch-action:manipulation; }
.street-button::-webkit-details-marker { display:none; }
.street-button:active { transform:translateY(1px); }
.street-button:disabled { opacity:.5; }
.street-dropdown { position:absolute; right:58px; top:0; width:min(265px,calc(100vw - 5.7rem)); max-height:75svh; overflow-y:auto; border:1px solid var(--world-line); border-radius:12px; padding:1rem; background:var(--world-paper); box-shadow:0 8px 24px #24363d25; scrollbar-color:var(--world-line) transparent; }
.street-dropdown p { margin-bottom:.5rem; font-size:.8125rem; line-height:1.6; color:var(--world-muted); }
.street-dropdown a { display:flex; justify-content:space-between; align-items:center; gap:1rem; min-height:46px; padding:.45rem .5rem; border-radius:999px; font-size:.875rem; }
.street-wardrobe { margin-top:.6rem; padding-top:1rem; border-top:1px solid var(--world-line); }
.street-wardrobe label { display:block; margin-bottom:.5rem; font-size:.875rem; }
.street-wardrobe p { margin-top:.6rem; font-size:.75rem; }
.street-settings { position:absolute; z-index:4; right:1.15rem; bottom:90px; display:flex; flex-direction:column; gap:.6rem; }
.street-settings :deep(.theme-toggle) { width:46px; height:46px; border:1px solid var(--world-muted); border-radius:14px; background:var(--world-paper); color:var(--world-ink); box-shadow:1px 3px 2px #34414925; }
.street-walking { position:absolute; z-index:3; bottom:48px; left:1.15rem; right:1.15rem; pointer-events:none; }
.street-walking :deep(.walk-actions) { visibility:hidden; }
.street-walking :deep(.walk-stick) { background:#fff9edde; box-shadow:none; border:1px solid #536b6c66; }
.street-walking :deep(.stick-knob) { background:#427eea; box-shadow:none; }
.street-touch-hint { display:none; }
.street-prompt { position:absolute; z-index:3; bottom:56px; left:50%; transform:translateX(-50%); text-align:center; pointer-events:auto; width:max-content; max-width:calc(100vw - 9rem); }
.street-prompt button { display:inline-flex; justify-content:center; align-items:center; gap:.65rem; min-height:44px; padding:.5rem .85rem; background:var(--world-paper); color:var(--world-ink); border:1px solid var(--world-line); border-radius:999px; font-size:.8125rem; }
.street-prompt kbd { font:inherit; font-size:.75rem; padding:.1rem .3rem; border:1px solid var(--world-line); border-radius:4px; }
.street-prompt p { margin-top:.5rem; background:var(--world-paper); border-radius:999px; padding:.2rem .5rem; font-size:.6875rem; color:var(--world-muted); }
.street-footer { position:absolute; z-index:3; inset:auto 1.2rem 8px; display:flex; justify-content:center; gap:1rem; }
.street-footer a { display:flex; align-items:center; gap:.35rem; min-height:44px; color:var(--world-ink); background:var(--world-paper); border-radius:999px; padding:.2rem .6rem; font-size:.6875rem; }
.street-panel { position:absolute; z-index:6; right:80px; top:100px; bottom:80px; width:min(390px,calc(100% - 110px)); display:flex; flex-direction:column; background:var(--world-paper); border:1px solid var(--world-line); border-radius:14px; box-shadow:0 6px 28px #24363d25; }
.street-panel-heading { position:absolute; z-index:1; top:.65rem; right:.65rem; }
.street-panel-body :deep(h2) { padding-right:2.6rem; }
.street-panel-heading p { font-size:.8125rem; color:var(--world-muted); }
.street-panel-heading .street-button { border:0; box-shadow:none; }
.street-panel-body { padding:1.3rem; overflow:auto; overscroll-behavior:contain; scrollbar-color:var(--world-line) transparent; }
.street-return { display:flex; align-items:center; justify-content:space-between; gap:1rem; min-height:48px; padding:.6rem 1.3rem; margin-top:auto; border-top:1px solid var(--world-line); font-size:.8125rem; color:var(--world-blue); }
.street-return kbd { font:inherit; font-size:.6875rem; }
.street-reading { padding-block:1rem; }
.street-reading summary { display:flex; gap:1rem; align-items:center; min-height:48px; cursor:pointer; font-size:.875rem; list-style:none; }
.street-reading-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4rem; padding-block:2rem; }
.street-noscript { position:absolute; bottom:140px; left:1rem; max-width:320px; padding:1rem; background:var(--world-paper); }
@media (hover:hover) and (pointer:fine) { .street-dropdown a:hover,.street-button:hover { background:var(--world-soft); color:var(--world-blue); } }
@media (min-width:768px) and (pointer:fine) { .street-walking :deep(.walk-stick) { visibility:hidden; } }
@media (max-width:767px) { .street-header { inset:1rem; } .street-identity p { display:none; } .street-tools { gap:.45rem; } .street-button { min-width:44px; min-height:44px; } .street-settings { right:1rem; bottom:145px; gap:.45rem; } .street-settings :deep(.theme-toggle) { width:44px; height:44px; } .street-walking { left:1rem; right:1rem; bottom:50px; } .street-walking :deep(.walk-actions) { visibility:visible; position:absolute; right:0; bottom:0; } .street-walking :deep(.walk-actions button) { min-width:44px; min-height:44px; border:1px solid var(--world-line); box-shadow:none; padding:.45rem .6rem; font-size:.75rem; } .street-prompt { bottom:auto; top:76px; max-width:calc(100vw - 5.5rem); left:1rem; transform:none; text-align:left; } .street-keyboard-hint { display:none; } .street-touch-hint { display:inline; } .street-prompt p { max-width:240px; } .street-dropdown { right:53px; } .street-panel { left:1rem; right:1rem; top:auto; bottom:48px; max-height:52svh; width:auto; } .street-panel-body { padding:1rem; } .street-reading-grid { grid-template-columns:1fr; gap:3rem; } }
@media (pointer:coarse) { .street-walking :deep(.walk-actions) { visibility:visible; position:absolute; right:0; bottom:0; } .street-settings { bottom:145px; } .street-keyboard-hint { display:none; } .street-touch-hint { display:inline; } }
@media (max-height:540px) { .street-stage { min-height:360px; } .street-settings { flex-direction:row; right:1rem; bottom:50px; } .street-prompt p { display:none; } .street-panel { top:70px; bottom:45px; } }
@media print { .street-stage { display:none; } .street-reading,.street-reading-grid { display:block; } .street-reading summary { display:none; } }
</style>
