<template>
    <div ref="pointer" class="pointer-glow" :class="{ 'pointer-glow-hovered': hovered, 'pointer-glow-paused': paused }" aria-hidden="true"><div class="pointer-glow-surface" /></div>
</template>

<script setup lang="ts">
const pointer = useTemplateRef<HTMLElement>('pointer')
const hovered = ref(false)
const paused = ref(true)
let preference: MediaQueryList | undefined
let frame = 0
let latestEvent: PointerEvent | undefined

function update() {
    frame = 0
    if (!latestEvent || !pointer.value) return
    // Pointer travel stays outside Vue rendering and does not change layout geometry.
    pointer.value.style.transform = `translate3d(${latestEvent.clientX}px, ${latestEvent.clientY}px, 0)`
    const target = latestEvent.target
    hovered.value = target instanceof Element && !!target.closest('a, button, [role="button"]')
}
function schedule(event: PointerEvent) {
    latestEvent = event
    if (!frame) frame = requestAnimationFrame(update)
}
function sync() {
    window.removeEventListener('pointermove', schedule)
    cancelAnimationFrame(frame)
    frame = 0
    latestEvent = undefined
    paused.value = document.hidden || !!preference?.matches
    if (!paused.value) window.addEventListener('pointermove', schedule, { passive: true })
}
onMounted(() => {
    preference = window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)')
    preference.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    sync()
})
onUnmounted(() => {
    window.removeEventListener('pointermove', schedule)
    document.removeEventListener('visibilitychange', sync)
    preference?.removeEventListener('change', sync)
    cancelAnimationFrame(frame)
})
</script>

<style scoped>
.pointer-glow { position: fixed; inset: 0 auto auto 0; z-index: 50; width: 0; height: 0; pointer-events: none; transform: translate3d(-300px, -300px, 0); }
.pointer-glow-surface { width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, #24242455, #24242418 30%, transparent 70%); transform: translate(-50%, -50%) scale(1); opacity: .65; transition: transform 240ms var(--ease-spring), opacity 160ms; }
.pointer-glow-hovered .pointer-glow-surface { transform: translate(-50%, -50%) scale(.1); opacity: .9; }
:global(.dark .pointer-glow-surface) { background: radial-gradient(circle, #ffffff70, #ffffff20 30%, transparent 70%); }
:global(.dark .pointer-glow-hovered .pointer-glow-surface) { background: radial-gradient(circle, #ffac7e, #ffac7e55 40%, transparent 70%); }
.pointer-glow-paused .pointer-glow-surface { opacity: 0; }
@media (prefers-reduced-motion: reduce), (pointer: coarse) { .pointer-glow { display: none; } }
</style>
