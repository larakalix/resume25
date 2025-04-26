<template>
    <div class="pointer-events-none fixed z-50" :style="{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)'
    }">
        <div :style="{
            width: glowState === 'hovered' ? '20px' : '200px',
            height: glowState === 'hovered' ? '20px' : '200px',
            background: glowState === 'hovered' ? colorMode.value === 'dark' ? 'orange' : 'black'
                : colorMode.value === 'dark'
                    ? 'radial-gradient(circle, white, transparent 70%)'
                    : 'radial-gradient(circle, black, transparent 70%)',
        }" :class="[
            'rounded-full transition-all duration-300',
            glowState === 'hovered' ? 'opacity-90 blur' : 'opacity-30 blur-3xl',
            glowState === 'idle' || glowState !== 'hovered' ? 'animate-pulse-glow' : '',
        ]" />
    </div>
</template>

<script setup lang="ts">
import type { GlowState } from '~/types/state'

const x = ref(-100)
const y = ref(-100)
const glowState = ref<GlowState>('idle')
const colorMode = useColorMode()

const TIMER = 1000
let idleTimeout: ReturnType<typeof setTimeout> | null = null

const updateGlow = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const isHovering = !!target.closest('a, button, [role="button"]')

    if (isHovering) {
        glowState.value = 'hovered'
    } else {
        if (glowState.value === 'hovered') {
            glowState.value = 'moving'
            if (idleTimeout) clearTimeout(idleTimeout)

            idleTimeout = setTimeout(() => {
                glowState.value = 'idle'
            }, TIMER)
        }
    }

    // No need to offset anymore, just set exact pointer coordinates
    x.value = e.clientX
    y.value = e.clientY
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

    0%,
    100% {
        transform: scale(1);
        opacity: 0.2;
    }

    50% {
        transform: scale(1.1);
        opacity: 0.35;
    }
}

.animate-pulse-glow {
    animation: pulse-glow 5s ease-in-out infinite;
    will-change: transform, opacity;
}
</style>