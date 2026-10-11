<script setup lang="ts">
const route = useRoute()
</script>

<template>
    <UApp>
        <ClientOnly><AtPointerGlow /></ClientOnly>
        <div class="site-shell">
            <a href="#main-content" class="skip-link sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-background focus:p-3">Skip to content</a>
            <MlNavbar />
            <main id="main-content" tabindex="-1" class="site-main" :class="{ 'site-main-home': route.path === '/' }"><slot /></main>
            <MlFooter />
        </div>
    </UApp>
</template>
