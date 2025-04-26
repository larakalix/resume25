<template>
    <button class="text-xl" @click="toggleTheme" aria-label="Toggle theme">
        <span v-if="colorMode.value === 'dark'">☀️</span>
        <span v-else>🌙</span>
    </button>
</template>

<script setup lang="ts">
const colorMode = useColorMode()

const toggleTheme = () => {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>