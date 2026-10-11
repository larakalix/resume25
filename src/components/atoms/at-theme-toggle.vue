<template>
    <button class="theme-toggle frosted-control text-xl min-h-11 min-w-11 focus-visible:outline-2 focus-visible:outline-offset-2" aria-label="Toggle theme" @click="toggleTheme">
        <ColorScheme tag="span"><Icon v-if="colorMode.value === 'dark'" name="mdi:weather-sunny" aria-hidden="true" />
        <Icon v-else name="mdi:weather-night" aria-hidden="true" /></ColorScheme>
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

<style scoped>
.theme-toggle { display: grid; place-items: center; flex-shrink: 0; width: 56px; height: 56px; color: var(--color-title); }
.theme-toggle:hover { background: var(--color-surface); }
.theme-toggle span { display: flex; align-items: center; justify-content: center; }
@media (max-width: 639px) { .theme-toggle { width: 44px; height: 44px; } }
</style>
