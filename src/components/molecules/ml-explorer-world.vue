<script setup lang="ts">
import { destinations, residents, pets, worldObjects, worldTargets, createObjectState, objectAction } from '~/experience/explorer/world-data'
import { panelShortcut } from '~/experience/explorer/keyboard'
import type { ExplorerHandle, WorldTargetId, TimeMode, PetAction, PetState } from '~/experience/explorer/types'
import type { Profile, Resume } from '~/domain/content/models'
import { hatChoices } from '~/experience/explorer/seasonal-hats'
const { profile, skillGroups } = defineProps<{ profile: Profile; skillGroups: Resume['skillGroups'] }>()
const { config } = useContent()
const scene = useTemplateRef<ExplorerHandle>('scene'), placesMenu = useTemplateRef<HTMLDetailsElement>('placesMenu'), panelTitle = useTemplateRef<HTMLElement>('panelTitle')
const { choice: selectedHatChoice, selected: selectedHat, description: hatDescription } = useSeasonalHat()
watch(selectedHat, hat => { scene.value?.setHat(hat) }, { immediate: true })
onMounted(() => scene.value?.setHat(selectedHat.value))
const panelBody = useTemplateRef<HTMLElement>('panelBody')
const worldStage = useTemplateRef<HTMLElement>('worldStage'), welcomePanel = useTemplateRef<HTMLElement>('welcomePanel'), worldFooter = useTemplateRef<HTMLElement>('worldFooter')
function overviewInsets() {
    const stage = worldStage.value?.getBoundingClientRect(), panel = welcomePanel.value?.getBoundingClientRect(), footer = worldFooter.value?.getBoundingClientRect()
    return stage && panel && footer ? { top: panel.bottom - stage.top + 12, bottom: stage.bottom - footer.top + 12 } : { top: 0, bottom: 0 }
}
const opened = ref<WorldTargetId | null>(null), near = ref<WorldTargetId | null>(null), paused = ref(false), welcome = ref(true), ready = ref(false), readingOpen = ref(true)
const announcement = ref('Choose Explore to walk with the keyboard, or use the movement stick. Places opens every section directly.')
const destination = computed(() => worldTargets.find(place => place.id === near.value))
const selectedTarget = computed(() => worldTargets.find(place => place.id === opened.value))
const openedPlace = computed(() => selectedTarget.value?.kind === 'place' ? selectedTarget.value.id : undefined)
const openedResident = computed(() => residents.find(person => person.id === opened.value))
const openedPet = computed(() => pets.find(pet => pet.id === opened.value))
const petStates = ref<Record<string,PetState>>({})
function usePet(action:PetAction) {
    if(!openedPet.value)return
    const state=scene.value?.interactPet(openedPet.value.id,action)
    if(state){petStates.value[openedPet.value.id]=state;announcement.value=action==='follow'?`${openedPet.value.name} ${state.following?'will walk with you.':'is exploring independently.'}`:action==='play'?`${openedPet.value.name} is playing!`:`${openedPet.value.name} enjoyed that pat.`}
}
const openedObject = computed(() => worldObjects.find(item => item.id === opened.value))
const objectState = ref(createObjectState()), timeMode = ref<TimeMode>('cycle')
const timeNames = { cycle: 'Auto', day: 'Day', night: 'Night' }
const nextTime = computed<TimeMode>(() => timeMode.value === 'cycle' ? 'day' : timeMode.value === 'day' ? 'night' : 'cycle')
function changeTime() { timeMode.value=nextTime.value;scene.value?.setTimeMode(timeMode.value);announcement.value=`World lighting: ${timeNames[timeMode.value]}.`;if(opened.value)panelTitle.value?.focus({preventScroll:true});else scene.value?.focus() }
function useObject() {
    if (!openedObject.value) return
    const state=scene.value?.interactObject(openedObject.value.id)
    if(state){objectState.value=state;announcement.value=`${openedObject.value.label}: ${objectStatus()}`}
}
function objectStatus() {
    const id=openedObject.value?.id
    if(!id)return ''
    if(id==='bell')return objectState.value.bell ? `Bell rung ${objectState.value.bell} ${objectState.value.bell===1?'time':'times'}.` : 'Ready to send a greeting.'
    const active=objectState.value[id]
    return id==='fountain'?active?'The water is flowing.':'The fountain is resting.':id==='windmill'?active?'The sails are turning faster.':'The mill is turning gently.':id==='campfire'?active?'The fire is lit.':'The fire is out.':active?'The bridge lanterns are lit.':'The bridge lanterns are off.'
}
function availability(value: boolean) { ready.value = value; readingOpen.value = !value; if(value)scene.value?.setHat(selectedHat.value) }
async function openPlace(value: WorldTargetId, travel = true) {
    if(travel)scene.value?.visit(value)
    near.value = value; opened.value = value; welcome.value = false
    if (placesMenu.value) placesMenu.value.open = false
    announcement.value = `${worldTargets.find(place => place.id === value)?.label} opened. E or Escape returns to exploring. WASD resumes walking.`
    await nextTick(); panelTitle.value?.focus({ preventScroll: true })
}
async function closePlace() { opened.value = null; await nextTick(); scene.value?.focus() }
function explore() { welcome.value = false; scene.value?.explore(); scene.value?.focus(); announcement.value = 'Walk with WASD or arrow keys. Space hops. E talks to villagers or uses nearby objects. Tab leaves the game.' }
function moved() { welcome.value = false }
function nearPlace(place: WorldTargetId | null) { near.value = place; if (place) announcement.value = `${worldTargets.find(item => item.id === place)?.label} is nearby. Press E or choose Open to read.` }
async function interact() { if (near.value) { const id=near.value;await openPlace(id,false);if(worldObjects.some(item=>item.id===id))useObject();if(pets.some(pet=>pet.id===id))usePet('pet') } else if (placesMenu.value) placesMenu.value.open = true }
async function reset() { opened.value = null; await nextTick(); scene.value?.reset(); objectState.value=createObjectState();petStates.value={}; scene.value?.focus(); near.value = null; welcome.value = true; announcement.value = 'Back at the beginning. Your explorer and the play objects have been reset.' }
async function panelKey(event: KeyboardEvent) {
    if (!opened.value || !(event.target instanceof Element)) return
    const target = event.target
    const action = panelShortcut(event.code, event.repeat, event.altKey || event.ctrlKey || event.metaKey, !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'), !!target.closest('a, button, summary, [role="button"]'))
    if (!action) return
    event.preventDefault(); event.stopPropagation()
    if (action === 'read') {
        const body = panelBody.value
        if (body) {
            const direction = ['ArrowUp', 'PageUp'].includes(event.code) ? -1 : 1
            body.scrollTop = event.code === 'Home' ? 0 : event.code === 'End' ? body.scrollHeight : body.scrollTop + direction * (event.code.startsWith('Page') ? body.clientHeight * .8 : 60)
        }
        return
    }
    await closePlace()
    if (action === 'walk') scene.value?.resumeKey(event.code)
}
function togglePause() { paused.value = !paused.value; if (!paused.value) scene.value?.focus() }
function closeMenu(event: KeyboardEvent) { if (event.key !== 'Escape' || !(event.target instanceof Element)) return; const menu = event.target.closest('details'); if (menu) { event.preventDefault(); menu.open = false; menu.querySelector('summary')?.focus() } }
function escape(event: KeyboardEvent) { if (event.key === 'Escape' && opened.value && !event.defaultPrevented) void closePlace() }
onMounted(() => window.addEventListener('keydown', escape))
onBeforeUnmount(() => window.removeEventListener('keydown', escape))
</script>
<template>
    <section class="explorer-world" aria-label="Explore Ivan's little world">
        <div ref="worldStage" class="world-stage">
            <AtExplorerScene ref="scene" :enabled="!paused" :blocked="!!opened" :engaged="opened" :overview-insets="overviewInsets" @near="nearPlace" @move="moved" @interact="interact" @place="openPlace" @availability="availability" />
            <header class="world-header" @keydown="closeMenu">
                <div class="world-identity"><h1>{{ profile.name }}<span aria-hidden="true">.</span></h1><p>{{ profile.headline }}</p></div>
                <div class="world-header-controls">
                    <details ref="placesMenu" class="world-places"><summary class="world-hud-button" aria-label="Places"><UIcon name="i-mdi-map-marker-outline" aria-hidden="true" /><span class="hud-label">Places</span></summary><div class="world-dropdown"><p>Where would you like to go?</p><a v-for="place in worldTargets" :key="place.id" :href="place.kind === 'place' ? `#read-${place.id}` : '#world-reading'" @click.prevent="openPlace(place.id)">{{ place.label }}<AtMotionArrow /></a></div></details>
                    <button class="world-hud-button" type="button" :aria-label="paused ? 'Resume world' : 'Pause world'" :aria-pressed="paused" @click="togglePause"><UIcon :name="paused ? 'i-mdi-play-outline' : 'i-mdi-pause'" aria-hidden="true" /></button>
                    <AtThemeToggle />
                    <details class="world-menu"><summary class="world-hud-button" aria-label="Menu"><UIcon name="i-mdi-menu" aria-hidden="true" /></summary><div class="world-dropdown"><nav aria-label="Main navigation"><NuxtLink v-for="item in config.navItems" :key="item.path" :to="item.path" :aria-current="item.path === '/' ? 'page' : undefined">{{ item.name }}<AtMotionArrow /></NuxtLink></nav><div class="world-wardrobe"><label for="explorer-hat">Explorer hat</label><USelect id="explorer-hat" v-model="selectedHatChoice" aria-label="Explorer hat" :ui="{base: 'rounded-full min-h-11 w-full', item: 'min-h-11'}" :items="hatChoices" trailing-icon="i-mdi-chevron-down" selected-icon="i-mdi-check" :disabled="!ready" aria-describedby="explorer-hat-description" class="world-hat-select" /><p id="explorer-hat-description" aria-live="polite">{{ hatDescription }}</p><p class="world-hat-calendar">June 1 · Oct 25–31 · Thanksgiving week · Dec 20–26<br>Ivan’s calendar · Eastern Time</p></div></div></details>
                </div>
            </header>
            <div v-if="welcome && !opened" ref="welcomePanel" class="world-welcome"><h2>Come for a little walk.</h2><p>{{ profile.headline }}.<br>I turn complex ideas into usable products.</p><div><UButton class="world-primary" :disabled="!ready" @click="explore">Explore <UIcon name="i-mdi-arrow-top-right" aria-hidden="true" /></UButton><button type="button" class="welcome-about" @click="openPlace('about')">Read about me</button></div></div>
            <aside v-if="opened" class="world-panel" :class="{'world-panel--village': !openedPlace, 'world-panel--pet': !!openedPet}" aria-label="Selected place" @keydown="panelKey"><div class="world-panel-top"><p ref="panelTitle" tabindex="-1">{{ selectedTarget?.label }}</p><button type="button" class="world-hud-button" aria-label="Close place" @click="closePlace"><UIcon name="i-mdi-close" aria-hidden="true" /></button></div><div ref="panelBody" class="world-panel-content"><MlWorldContent v-if="openedPlace" :place="openedPlace" :profile :skill-groups="skillGroups" /><MlVillageConversation v-else-if="openedResident" :resident="openedResident" :profile :skill-groups="skillGroups" /><MlPetCompanion v-else-if="openedPet" :pet="openedPet" :state="petStates[openedPet.id]" :disabled="!ready" @action="usePet" /><div v-else-if="openedObject" class="world-object-content"><h2>{{ openedObject.label }}</h2><p>{{ openedObject.description }}</p><UButton :disabled="!ready" :aria-pressed="openedObject.id === 'bell' ? undefined : !!objectState[openedObject.id]" @click="useObject">{{ objectAction(openedObject.id, objectState) }} <AtMotionArrow /></UButton><p role="status" aria-live="polite">{{ objectStatus() }}</p></div></div><button v-if="openedPlace" type="button" class="world-back" @click="closePlace"><span>Back to exploring</span><kbd>E / Esc</kbd></button></aside>
            <div v-if="!opened" class="world-bottom-controls"><AtWalkControls :disabled="paused || !ready" @move="scene?.move($event)" @jump="scene?.jump()" @wave="scene?.wave()" /><div class="world-center-actions"><button type="button" class="world-interact" @click="interact"><span v-if="destination" class="interact-key" aria-hidden="true">E</span>{{ destination ? ['resident','pet'].includes(destination.kind) ? destination.label : destination.kind === 'object' ? `Use ${destination.label}` : `Open ${destination.label}` : 'Discover the village' }}<UIcon name="i-mdi-arrow-top-right" aria-hidden="true" /></button><p class="world-key-hint">WASD / arrows to walk · Space to hop</p></div></div>
            <div ref="worldFooter" class="world-footer"><a href="#selected-work" aria-label="See my projects"><span class="footer-wide">See my projects</span><span class="footer-short">Projects</span><UIcon name="i-mdi-arrow-down" aria-hidden="true" /></a><button type="button" @click="reset"><UIcon name="i-mdi-refresh" aria-hidden="true" />Reset</button><button type="button" data-world-light :disabled="!ready" :aria-label="`World light: ${timeNames[timeMode]}. Switch to ${timeNames[nextTime]}.`" :title="`World lighting: ${timeNames[timeMode]}`" @click="changeTime"><UIcon :name="timeMode === 'night' ? 'i-mdi-weather-night' : timeMode === 'day' ? 'i-mdi-weather-sunny' : 'i-mdi-weather-sunset'" aria-hidden="true" /><span class="footer-wide">Light: {{ timeNames[timeMode] }}</span><span class="footer-short">{{ timeNames[timeMode] }}</span></button><a href="#world-reading" aria-label="Text version" @click="readingOpen = true"><span class="footer-wide">Text version</span><span class="footer-short">Read</span><UIcon name="i-mdi-text-box-outline" aria-hidden="true" /></a></div>
            <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ announcement }}</p>
            <noscript><p class="world-no-script">The text version below includes every section. <a href="#world-reading">Read the portfolio</a></p></noscript>
        </div>
        <details id="world-reading" class="world-reading site-shell" :open="readingOpen" @toggle="readingOpen = ($event.target as HTMLDetailsElement).open"><summary>Explore without the 3D world <AtMotionArrow /></summary><div class="world-reading-grid"><section v-for="place in destinations" :id="`read-${place.id}`" :key="place.id"><MlWorldContent :place="place.id" :profile :skill-groups="skillGroups" /></section></div></details>
    </section>
</template>
<style scoped>
.explorer-world { --world-paper: #fffcf4; --world-ink: #243547; --world-muted: #536576; --world-blue: #234bc4; --world-line: #c9d2d4; --world-soft: #e8edf5; color: var(--world-ink); }
:global(.dark .explorer-world) { --world-paper: #1c2939; --world-ink: #f3f4ed; --world-muted: #becbd7; --world-blue: #a1beff; --world-line: #53667a; --world-soft: #314358; }
.explorer-world ::selection { background: var(--world-blue); color: var(--world-paper); }
.explorer-world :focus-visible { outline: 2px solid var(--world-blue); outline-offset: 4px; }
.world-stage { position: relative; height: 100svh; min-height: 540px; overflow: hidden; isolation: isolate; background: #83c3c3; }
.world-header { position: absolute; z-index: 5; inset: 1.25rem 1.5rem auto; display: flex; justify-content: space-between; gap: .75rem; align-items: flex-start; pointer-events: none; }
.world-identity { background: var(--world-paper); padding: .75rem 1.15rem; border-radius: 16px; box-shadow: 0 4px 18px #22384b15; }
.world-identity h1 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.375rem; line-height: 1.2; font-weight: 650; letter-spacing: -.025em; }
.world-identity h1 span { color: var(--world-blue); }
.world-identity p { color: var(--world-muted); font-size: .75rem; margin-top: .2rem; }
.world-header-controls { display: flex; align-items: center; gap: .5rem; pointer-events: auto; }
.world-hud-button { display: inline-flex; justify-content: center; align-items: center; gap: .4rem; min-height: 48px; min-width: 48px; padding: .7rem; border-radius: 999px; background: var(--world-paper); color: var(--world-ink); cursor: pointer; box-shadow: 0 3px 12px #22384b15; font-size: 1.2rem; list-style: none; }
.world-hud-button .hud-label { font-size: .8125rem; padding-right: .2rem; }
.world-hud-button::-webkit-details-marker { display: none; }
.world-header :deep(.theme-toggle) { background: var(--world-paper); width: 48px; height: 48px; color: var(--world-ink); box-shadow: 0 3px 12px #22384b15; border-radius: 999px; }
.world-dropdown { position: absolute; right: 0; top: 68px; min-width: 230px; max-width: calc(100vw - 2rem); background: var(--world-paper); padding: 1rem; border-radius: 16px; box-shadow: 0 8px 28px #1c3a5426; }
.world-dropdown { max-height: min(65svh, 650px); overflow-y: auto; scrollbar-color: var(--world-line) transparent; }
.world-dropdown p { font-size: .8125rem; color: var(--world-muted); margin-bottom: .5rem; }
.world-dropdown a { display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; min-height: 48px; padding: .45rem .5rem; border-radius: 999px; font-size: .9375rem; }
.world-wardrobe { margin-top: .75rem; padding-top: 1rem; border-top: 1px solid var(--world-line); width: 245px; max-width: 100%; }
.world-wardrobe label { display: block; font-size: .875rem; margin-bottom: .5rem; font-weight: 600; }
.world-wardrobe :deep(.world-hat-select) { width: 100%; min-height: 44px; border-radius: 999px; background: var(--world-soft); color: var(--world-ink); }
.world-wardrobe p { font-size: .75rem; line-height: 1.6; margin-top: .6rem; margin-bottom: 0; }
.world-wardrobe .world-hat-calendar { font-size: .6875rem; }
.world-stage:has(.world-welcome) .world-bottom-controls { visibility: hidden; }
.world-welcome { position: absolute; z-index: 2; left: 1.5rem; bottom: 186px; width: min(310px, calc(100% - 3rem)); padding: 1.5rem; background: var(--world-paper); border-radius: 16px; box-shadow: 0 7px 28px #22384b1c; }
.world-welcome h2 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 2rem; line-height: 1.05; letter-spacing: -.03em; font-weight: 600; }
.world-welcome p { font-size: .875rem; line-height: 1.6; color: var(--world-muted); margin-block: 1rem; }
.world-welcome > div { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; }
.world-primary { background: var(--world-blue); color: var(--world-paper); min-height: 44px; border-radius: 999px; padding: .6rem 1rem; gap: .75rem; }
.welcome-about { min-height: 44px; color: var(--world-blue); font-size: .8125rem; }
.world-bottom-controls { position: absolute; z-index: 3; bottom: 65px; left: 1.5rem; right: 1.5rem; pointer-events: none; }
.world-center-actions { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); text-align: center; pointer-events: auto; }
.world-interact { min-height: 48px; display: inline-flex; align-items: center; gap: .65rem; padding: .6rem 1rem; border-radius: 999px; background: var(--world-paper); color: var(--world-blue); font-size: .875rem; box-shadow: 0 4px 18px #22384b20; white-space: nowrap; }
.interact-key { width: 25px; height: 25px; display: grid; place-items: center; border: 1px solid var(--world-line); border-radius: 6px; font-size: .75rem; }
.world-key-hint { font-size: .75rem; margin-top: .7rem; color: #30485a; background: #fff9eddd; border-radius: 999px; padding: .15rem .6rem; white-space: nowrap; }
.world-footer { position: absolute; z-index: 3; inset: auto 1.5rem 12px; display: flex; justify-content: center; gap: 1.5rem; }
.world-footer a, .world-footer button { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; min-height: 44px; padding: .4rem .75rem; border-radius: 999px; background: var(--world-paper); color: var(--world-ink); font-size: .75rem; }
.footer-short { display: none; }
.world-panel { position: absolute; z-index: 6; top: 90px; right: 1.5rem; bottom: 72px; width: min(420px, calc(100% - 3rem)); display: flex; flex-direction: column; background: var(--world-paper); color: var(--world-ink); border-radius: 16px; box-shadow: 0 8px 36px #23384a26; }
.world-panel--village { top: auto; bottom: 150px; max-height: calc(100% - 250px); }
.world-object-content h2 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.75rem; line-height: 1.1; font-weight: 600; letter-spacing: -.025em; }
.world-object-content p { font-size: .9375rem; line-height: 1.7; color: var(--world-muted); margin-block: 1.25rem; }
.world-object-content :deep(button) { min-height: 44px; border-radius: 999px; }
.world-panel-top { display: flex; align-items: center; justify-content: space-between; padding: .65rem 1rem .65rem 1.5rem; border-bottom: 1px solid var(--world-line); }
.world-panel-top p { font-size: .8125rem; color: var(--world-muted); }
.world-panel-top .world-hud-button { box-shadow: none; }
.world-panel-content { padding: 1.5rem; overflow-y: auto; overscroll-behavior: contain; scrollbar-color: var(--world-line) transparent; }
.world-back { display: flex; justify-content: space-between; align-items: center; padding: .65rem 1.5rem; min-height: 52px; color: var(--world-blue); font-size: .875rem; margin-top: auto; border-top: 1px solid var(--world-line); }
.world-back kbd { font-family: inherit; font-size: .75rem; color: var(--world-muted); }
.world-reading { background: var(--color-background); color: var(--color-title); padding-block: 1rem; scroll-margin-top: 1rem; }
.world-reading summary { display: inline-flex; align-items: center; gap: .75rem; min-height: 48px; cursor: pointer; font-size: .875rem; list-style: none; }
.world-reading-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4rem; padding-block: 2rem; }
.world-reading-grid > section { scroll-margin-top: 2rem; }
.world-no-script { position: absolute; left: 1rem; right: 1rem; bottom: 185px; padding: 1rem; border-radius: 16px; background: var(--world-paper); color: var(--world-ink); }
@media (hover: hover) and (pointer: fine) { .world-hud-button:hover, .world-dropdown a:hover, .world-footer a:hover, .world-footer button:hover { color: var(--world-blue); background: var(--world-soft); } }
@media (max-width: 767px) { .world-header { inset: 1rem 1rem auto; } .world-identity { padding: .65rem .85rem; } .world-identity h1 { font-size: 1.125rem; } .world-identity p { display: none; } .world-header-controls { gap: .4rem; } .world-hud-button { min-height: 44px; min-width: 44px; padding: .6rem; } .world-header :deep(.theme-toggle) { width: 44px; height: 44px; } .hud-label { display: none; } .world-welcome { left: 1rem; top: 80px; bottom: auto; width: calc(100% - 2rem); max-width: 360px; padding: 1rem; } .world-welcome h2 { font-size: 1.35rem; } .world-welcome p { font-size: .8125rem; margin-block: .5rem; } .world-bottom-controls { left: 1rem; right: 1rem; bottom: 68px; } .world-center-actions { bottom: 120px; width: max-content; max-width: 100%; } .world-key-hint { display: none; } .world-footer { left: .75rem; right: .75rem; gap: .5rem; bottom: 8px; } .world-footer a, .world-footer button { padding-inline: .6rem; font-size: .75rem; } .footer-wide { display: none; } .footer-short { display: inline; } .world-panel { left: 1rem; right: 1rem; top: auto; bottom: 65px; width: auto; max-height: calc(100% - 145px); } .world-panel-content { padding: 1.25rem; } .world-reading-grid { grid-template-columns: minmax(0, 1fr); gap: 3rem; } }
@media (max-width: 767px) { .world-panel--village { bottom: 65px; max-height: 44svh; } .world-footer { gap: .35rem; } .world-footer a, .world-footer button { padding-inline: .45rem; } }
@media (max-width: 767px) { .world-panel--pet { top: 80px; bottom: auto; max-height: 40svh; } .world-panel--pet .world-panel-content { padding: 1rem; } }
@media (max-width: 374px) { .world-footer a, .world-footer button { font-size: .6875rem; } .world-identity { padding-inline: .65rem; } .world-identity h1 { font-size: 1rem; } .world-header { gap: .5rem; } .world-header-controls { gap: .25rem; } .world-welcome { top: 76px; padding: .85rem; } .world-welcome h2 { font-size: 1.25rem; } .world-welcome p { font-size: .75rem; line-height: 1.5; } .world-welcome > div { gap: .5rem; } }
@media (max-height: 540px) { .world-stage { min-height: 360px; } .world-welcome { top: 90px; bottom: auto; width: 250px; padding: 1rem; } .world-welcome h2 { font-size: 1.4rem; } .world-welcome p { margin-block: .5rem; font-size: .8125rem; } .world-stage:has(.world-welcome) :deep(.walk-controls) { visibility: hidden; } .world-key-hint { display: none; } .world-panel { top: 78px; bottom: 65px; } .world-center-actions { bottom: 16px; } }
@media print { .world-stage { display: none; } .world-reading { display: block; } .world-reading summary { display: none; } .world-reading-grid { display: block; } .world-reading-grid > section { margin-bottom: 2rem; } }
</style>
