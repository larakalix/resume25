<script setup lang="ts">
import type { MoveInput } from '~/experience/explorer/types'
import {createStickInput} from '~/experience/explorer/stick-input'
import type {StickSample} from '~/experience/explorer/stick-input'
const { disabled = false, advanced = false, crouched = false, sprinting = false } = defineProps<{ disabled?: boolean; advanced?: boolean; crouched?: boolean; sprinting?: boolean }>()
const emit = defineEmits<{ move: [input: MoveInput]; jump: []; wave: []; crouch: []; sprint: [] }>()
const stick = useTemplateRef<HTMLButtonElement>('stick'), knob = useTemplateRef<HTMLElement>('knob')
const input=createStickInput()
function apply(sample:StickSample) {
    if (knob.value) knob.value.style.transform = `translate(${sample.knobX}px,${sample.knobY}px)`
    emit('move', sample.input)
}
function point(event:PointerEvent){const bounds=stick.value?.getBoundingClientRect();return bounds?{x:event.clientX-bounds.left-bounds.width/2,y:event.clientY-bounds.top-bounds.height/2}:null}
function down(event: PointerEvent) { if(disabled)return;const p=point(event);if(!p)return;const sample=input.down({id:event.pointerId,...p,pointerType:event.pointerType,button:event.button,isPrimary:event.isPrimary});if(!sample)return;stick.value?.setPointerCapture(event.pointerId);apply(sample) }
function move(event: PointerEvent) {if(input.pointerId!==event.pointerId)return;const p=point(event);if(!p)return;const sample=input.move(event.pointerId,p.x,p.y);if(sample)apply(sample)}
function end(event:PointerEvent){const sample=input.end(event.pointerId);if(!sample)return;if(stick.value?.hasPointerCapture(event.pointerId))stick.value.releasePointerCapture(event.pointerId);apply(sample)}
function stop() {
    const pointer=input.pointerId,sample=input.clear()
    if (pointer !== undefined && stick.value?.hasPointerCapture(pointer)) stick.value.releasePointerCapture(pointer)
    apply(sample)
}
watch(() => disabled, stop)
function visibility() { if (document.hidden) stop() }
onMounted(() => { window.addEventListener('blur', stop); document.addEventListener('visibilitychange', visibility) })
onBeforeUnmount(() => { stop(); window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', visibility) })
</script>
<template>
    <div class="walk-controls" aria-label="Character controls">
        <button ref="stick" class="walk-stick" type="button" aria-label="Movement stick. Drag to walk. Keyboard users can focus the world and use arrow keys." :disabled @pointerdown="down" @pointermove="move" @pointerup="end" @pointercancel="end" @lostpointercapture="end"><span class="stick-cross" aria-hidden="true" /><span ref="knob" class="stick-knob" aria-hidden="true"><UIcon name="i-mdi-arrow-all" /></span></button>
        <div class="walk-actions" :class="{'walk-actions-advanced':advanced}"><button v-if="advanced" type="button" :disabled :aria-pressed="sprinting" @click="emit('sprint')"><kbd aria-hidden="true">Shift</kbd>Run</button><button type="button" :disabled @click="emit('wave')"><kbd aria-hidden="true">F</kbd>Wave</button><button v-if="advanced" type="button" :disabled :aria-pressed="crouched" @click="emit('crouch')"><kbd aria-hidden="true">C</kbd>Crouch</button><button type="button" :disabled @click="emit('jump')"><kbd aria-hidden="true">Space</kbd>{{ advanced?'Jump':'Hop' }}</button></div>
    </div>
</template>
<style scoped>
.walk-controls { display: flex; align-items: center; justify-content: space-between; gap: 1rem; pointer-events: none; }
.walk-controls button { pointer-events: auto; }
.walk-stick { width: 104px; height: 104px; border-radius: 50%; position: relative; background: #fff9edc9; box-shadow: 0 4px 18px #22384b20; touch-action: none; }
.stick-knob { position: absolute; inset: 28px; display: grid; place-items: center; border-radius: 50%; color: #fff; background: #2453d8; box-shadow: 0 4px 8px #17337e25; font-size: 1.25rem; pointer-events: none; }
.stick-cross { position: absolute; inset: 18px; border: 1px solid #677b8538; border-radius: 50%; pointer-events: none; }
.walk-actions { display: flex; gap: .5rem; align-items: center; }
.walk-actions-advanced { display:grid; grid-template-columns:repeat(2,1fr); }
.walk-actions button[aria-pressed="true"] { background:var(--world-blue); color:var(--world-paper); }
.walk-actions button { min-height: 48px; min-width: 62px; padding: .6rem .8rem; display: flex; gap: .35rem; align-items: center; justify-content: center; border-radius: 999px; background: var(--world-paper); color: var(--world-ink); box-shadow: 0 4px 16px #22384b15; font-size: .8125rem; }
.walk-actions kbd { display:inline-flex; align-items:center; justify-content:center; flex:none; min-width:20px; min-height:20px; padding:0 .3rem; border:1px solid var(--world-line); border-bottom-width:2px; border-radius:5px; background:var(--world-soft); color:var(--world-ink); font:500 .625rem/1 ui-monospace,monospace; white-space:nowrap; }
button:disabled { opacity: .5; }
@media (max-width: 374px) { .walk-stick { width: 88px; height: 88px; } .stick-knob { inset: 20px; } .walk-actions button { min-width: 54px; padding-inline: .6rem; } }
</style>
