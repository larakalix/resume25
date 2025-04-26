<template>
    <div class="pointer-events-none fixed top-0 left-0 z-0 w-0 h-0" :style="{ transform: `translate(${x}px, ${y}px)` }">
        <div 
            class="w-[200px] h-[200px] rounded-full opacity-20 blur-3xl"
            :class="[
                glowState === 'idle' ? 'animate-pulse-glow' : '',
                colorMode.value === 'dark' ? 'bg-[radial-gradient(circle,_white,_transparent_70%)]' : 'bg-[radial-gradient(circle,_black,_transparent_70%)]']"
         />
    </div>
</template>

<script setup lang="ts">
import type { GlowState } from '~/types/state'

const x = ref(-100)
const y = ref(-100)
const TIMER = 1000 // 1 second
const glowState = ref<GlowState>('idle')
const colorMode = useColorMode()

let idleTimeout: ReturnType<typeof setTimeout> | null = null

const updateGlow = (e: MouseEvent) => {
    x.value = e.clientX - 100
    y.value = e.clientY - 100

    glowState.value = 'moving'

    if (idleTimeout) clearTimeout(idleTimeout)

    glowState.value = 'stopped'

    idleTimeout = setTimeout(() => { glowState.value = 'idle' }, TIMER)
}

onMounted(() => {
    window.addEventListener('mousemove', updateGlow)
})
onUnmounted(() => {
    window.removeEventListener('mousemove', updateGlow)
    if (idleTimeout) clearTimeout(idleTimeout)
})
</script>

<style scoped>
@keyframes pulse-glow {
    0%,100% { transform: scale(1); opacity: 0.2; }
    50% { transform: scale(1.1); opacity: 0.35; }
}

.animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
    will-change: transform, opacity;
}
</style>