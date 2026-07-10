<template>
    <button class="text-xl" @click="toggleTheme" aria-label="Toggle theme">
        <span v-if="colorMode.value === 'dark'">☀️</span>
        <span v-else>🌙</span>
    </button>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
const posthog = usePostHog()

const toggleTheme = () => {
    const newTheme = colorMode.value === 'dark' ? 'light' : 'dark'
    colorMode.preference = newTheme
    posthog?.capture('theme_toggled', { theme: newTheme })
}
</script>