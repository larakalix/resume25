<script setup lang="ts">
import { worldTargets } from '~/experience/explorer/world-data'
import type { ExplorerController, MoveInput, WorldOptions, WorldTargetId, WorldObjectId, TimeMode, PetId, PetAction } from '~/experience/explorer/types'
import type { HatId } from '~/experience/explorer/seasonal-hats'
const { enabled, blocked, engaged, overviewInsets, mode = 'village', targets = worldTargets } = defineProps<{ enabled: boolean; blocked: boolean; mode?: 'village' | 'street'; targets?: typeof worldTargets; engaged?: WorldTargetId | null; overviewInsets?: WorldOptions['overviewInsets'] }>()
const emit = defineEmits<{ near: [place: WorldTargetId | null]; move: []; interact: []; place: [place: WorldTargetId]; availability: [value: boolean] }>()
const stage = useTemplateRef<HTMLElement>('stage'), canvas = useTemplateRef<HTMLCanvasElement>('canvas'), labels = useTemplateRef<HTMLButtonElement[]>('labels')
const ready = ref(false), failed = ref(false), reduced = ref(false)
let controller: ExplorerController | undefined, observer: IntersectionObserver | undefined, media: MediaQueryList | undefined
let visible = false, loading = false, disposed = false
let entered = false, requestedPlace: WorldTargetId | undefined, requestedTime: TimeMode = mode === 'street' ? 'day' : 'cycle'
let requestedHat: HatId = 'everyday'
const loadController = new AbortController()
const keys = new Set<string>()
function activity() { controller?.setActive(visible && !document.hidden && enabled) }
function clear() { keys.clear(); controller?.setInput({ x: 0, forward: 0, run: false }) }
function failure() { failed.value = true; ready.value = false; controller?.dispose(); controller = undefined; emit('availability', false) }
async function initialize() {
    if (disposed || loading || controller || failed.value || !visible) return
    loading = true
    try {
        const { createExplorerScene } = await (mode === 'street' ? import('~/experience/street/scene') : import('~/experience/explorer/scene'))
        if (disposed || !visible || !canvas.value) return
        const placeLabels = Object.fromEntries((labels.value ?? []).map(label => [label.dataset.place, label]))
        const created = await createExplorerScene(canvas.value, { labels: placeLabels, reduced: reduced.value, overviewInsets, onNear: place => emit('near', place), onMove: () => emit('move'), onFailure: failure }, loadController.signal)
        if (disposed) { created.dispose(); return }
        controller = created
        controller.setReduced(reduced.value)
        controller.setTimeMode(requestedTime)
        controller.setHat(requestedHat)
        controller.setConversation(engaged ?? null)
        if (requestedPlace) controller.visit(requestedPlace)
        else if (entered) controller.explore()
        ready.value = true; emit('availability', true); activity()
    } catch { if (!disposed) failure() }
    finally { loading = false }
}
function preference() { reduced.value = media?.matches ?? false; controller?.setReduced(reduced.value) }
function move(input: MoveInput) { if (!blocked && enabled) controller?.setInput(input) }
function updateKeys() { move({ x: Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')), forward: Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown')), run: keys.has('ShiftLeft') || keys.has('ShiftRight') }) }
function down(event: KeyboardEvent) {
    if (blocked || !enabled || event.altKey || event.ctrlKey || event.metaKey) return
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(event.code)) { event.preventDefault(); keys.add(event.code); updateKeys() }
    if (event.code === 'Space') event.preventDefault()
    if (event.repeat) return
    if (event.code === 'Space') { event.preventDefault(); controller?.jump() }
    if (event.code === 'KeyE' || event.code === 'Enter') { event.preventDefault(); emit('interact') }
    if (event.code === 'KeyF') { event.preventDefault(); controller?.wave() }
}
function up(event: KeyboardEvent) { if (keys.delete(event.code)) updateKeys() }
function focus() { canvas.value?.focus({ preventScroll: true }) }
function resumeKey(code: string) { if (!blocked && enabled) { focus(); keys.add(code); updateKeys() } }
function jump() { focus(); controller?.jump() }
function wave() { focus(); controller?.wave() }
function explore() { entered = true; controller?.explore() }
function visit(id: WorldTargetId) { requestedPlace = id; controller?.visit(id) }
function setTimeMode(mode: TimeMode) { requestedTime=mode;controller?.setTimeMode(mode) }
function setHat(hat: HatId) { requestedHat=hat;controller?.setHat(hat) }
function interactObject(id: WorldObjectId) { return controller?.interactObject(id) }
function interactPet(id:PetId,action:PetAction) { return controller?.interactPet(id,action) }
defineExpose({ interactPet, move, focus, resumeKey, explore, visit, jump, wave, setTimeMode, setHat, interactObject, reset: () => { requestedPlace = undefined; entered = false; controller?.reset() } })
watch(() => enabled, () => { clear(); activity() })
watch(() => blocked, clear)
watch(() => engaged, value => controller?.setConversation(value ?? null))
onMounted(() => {
    media = window.matchMedia('(prefers-reduced-motion: reduce)'); reduced.value = media.matches
    media.addEventListener('change', preference); document.addEventListener('visibilitychange', activity)
    window.addEventListener('keyup', up); window.addEventListener('blur', clear)
    observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; activity(); if (visible) void initialize() }, { rootMargin: '32px' })
    if (stage.value) observer.observe(stage.value)
})
onBeforeUnmount(() => { disposed = true; loadController.abort(); clear(); controller?.dispose(); observer?.disconnect(); media?.removeEventListener('change', preference); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', activity) })
</script>
<template>
    <div ref="stage" class="explorer-scene" :data-world-state="ready ? 'ready' : failed ? 'fallback' : 'loading'" :data-reduced-motion="reduced">
        <canvas ref="canvas" :tabindex="blocked ? -1 : 0" role="application" :aria-label="`${mode === 'street' ? 'Ivan’s workshop neighborhood.' : 'Ivan’s little planet.'} Walk using WASD or arrow keys. Space hops, F waves, and E talks or uses a nearby place. Use Places for direct access to every section.`" aria-describedby="world-keyboard-help" @keydown="down" @blur="clear" @pointerdown="focus" />
        <div v-show="ready" class="world-labels"><button v-for="place in targets" ref="labels" :key="place.id" type="button" :data-place="place.id" :data-kind="place.kind" :disabled="blocked" @click="emit('place', place.id)"><span aria-hidden="true" />{{ place.label }}<UIcon name="i-mdi-arrow-top-right" aria-hidden="true" /></button></div>
        <p v-if="!ready" class="world-load-note" role="status">{{ failed ? 'The 3D world could not start. Every section is available through Places or the text version.' : 'Getting the world ready… You can already explore every section through Places.' }}</p>
        <p id="world-keyboard-help" class="sr-only">Click the world or choose Explore to use keyboard movement. E talks or uses a nearby place; E or Escape returns. WASD resumes walking from a place heading. Arrow keys scroll the reading panel. Tab leaves the game. Places provides direct access to every section.</p>
    </div>
</template>
<style scoped>
.explorer-scene, canvas, .world-labels { position: absolute; inset: 0; width: 100%; height: 100%; }
.explorer-scene { background: #83c3c3; }
canvas { display: block; touch-action: pan-y; outline-offset: -4px; }
canvas:focus-visible { outline: 3px solid var(--world-blue); }
.world-labels { pointer-events: none; overflow: hidden; }
.world-labels button { position: absolute; left: 0; top: 0; pointer-events: auto; min-height: 44px; border-radius: 999px; padding: .5rem .85rem; display: flex; align-items: center; gap: .5rem; font-size: .8125rem; font-weight: 600; background: #fff9ed; color: #233b4a; box-shadow: 0 3px 12px #1b3d4a20; white-space: nowrap; }
.world-labels button > span { width: 6px; height: 6px; border-radius: 50%; background: #2453d8; }
.world-labels button[data-kind="resident"] > span { background: #a44831; }
.world-labels button[data-kind="object"] > span { background: #816120; }
.world-labels button[data-near="true"] { outline: 2px solid #234bc4; outline-offset: 3px; }
.world-labels button:disabled { opacity: .5; pointer-events: none; }
.world-load-note { position: absolute; top: 38%; left: 50%; transform: translateX(-50%); width: min(80%, 400px); background: var(--world-paper); color: var(--world-ink); padding: 1.5rem; border-radius: 16px; font-size: 1rem; text-align: center; }
@media (hover: hover) and (pointer: fine) { .world-labels button:hover { background: #2453d8; color: #fff; } }
</style>
