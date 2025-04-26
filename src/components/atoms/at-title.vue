<script setup lang="ts">
const { size } = defineProps<{
    size?: 'large' | 'medium' | 'small'
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
    <h1 class="font-extrabold text-title tracking-tight" :class="sizeClass">
        <slot />
    </h1>
</template>