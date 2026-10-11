<script setup lang="ts">
const { config } = useContent()
const route = useRoute()
const activeIndex = computed(() => Math.max(0, config.navItems.findIndex(item => isActive(item.path))))
function isActive(path: string) {
    return route.path === path || (path === '/blog' && route.path.startsWith('/post/'))
}
</script>

<template>
    <header class="floating-header">
        <nav class="floating-nav frosted-control" aria-label="Main navigation" :style="{ '--active-tab': activeIndex, '--tab-count': config.navItems.length }">
            <span class="nav-indicator" aria-hidden="true" />
            <NuxtLink v-for="item in config.navItems" :key="item.path" :to="item.path" :aria-current="isActive(item.path) ? (route.path === item.path ? 'page' : 'true') : undefined">{{ item.name }}</NuxtLink>
        </nav>
        <AtThemeToggle />
    </header>
</template>

<style scoped>
.floating-header { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1.5rem 0; background: transparent; }
.floating-nav { position: relative; display: grid; grid-template-columns: repeat(var(--tab-count), minmax(0, 1fr)); padding: 5px; }
.nav-indicator { position: absolute; inset: 5px auto 5px 5px; width: calc((100% - 10px) / var(--tab-count)); border-radius: 99px; background: var(--color-surface); transform: translateX(calc(var(--active-tab) * 100%)); transition: transform 280ms var(--ease-spring); pointer-events: none; }
.floating-nav a { position: relative; z-index: 1; display: grid; place-items: center; min-width: 44px; min-height: 44px; padding: 0 1.5rem; border-radius: 99px; font-size: .875rem; font-weight: 500; color: var(--color-paragraph); }
.floating-nav a:hover { background: color-mix(in srgb, var(--color-surface) 65%, transparent); }
.floating-nav a[aria-current] { color: var(--color-title); }
@media (max-width: 639px) { .floating-header { gap: .25rem; padding: 1rem 0; } .floating-nav { flex: 1; } .floating-nav a { flex: 1; padding: 0 .375rem; font-size: .75rem; } }
@media (max-width: 359px) { .floating-header { flex-wrap: wrap; justify-content: flex-end; padding-top: .5rem; } .floating-nav { order: 2; flex-basis: 100%; } }
@media (prefers-reduced-motion: reduce) { .nav-indicator { transition: none; } }
</style>
