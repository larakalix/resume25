<script setup lang="ts">
const route = useRoute()
</script>
<template>
    <UApp>
        <a href="#main-content" class="skip-link">Skip to content</a>
        <MlNavbar v-if="route.path !== '/'" />
        <div :class="{ 'site-shell': route.path !== '/' }">
            <main id="main-content" tabindex="-1" class="site-main"><slot /></main>
        </div>
        <div class="site-shell"><MlFooter /></div>
    </UApp>
</template>
