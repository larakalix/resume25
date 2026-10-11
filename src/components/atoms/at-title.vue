<script setup lang="ts">
const { size, as = 'h1' } = defineProps<{
    size?: 'large' | 'medium' | 'small'
    as?: 'h1' | 'h2' | 'h3'
}>()

const sizeClass = computed(() => {
    switch (size) {
        case 'small':
            return 'text-2xl sm:text-3xl'
        case 'medium':
            return 'text-3xl sm:text-4xl'
        case 'large':
        default:
            return 'text-4xl sm:text-5xl'
    }
})
</script>

<template>
    <component :is="as" class="font-extrabold text-title tracking-tight" :class="sizeClass">
        <slot />
    </component>
</template>