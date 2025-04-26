<script setup lang="ts">
const { text } = defineProps<{ text: string }>()
</script>

<template>
    <p class="text-sm md:text-base text-title/60 hover:text-title leading-relaxed transition-colors">
        {{ text }}
    </p>
</template>