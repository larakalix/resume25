<script setup lang="ts">
const { config } = useContent()
const route = useRoute()
const isActive = (path: string) => route.path === path || (path === '/blog' && route.path.startsWith('/post/'))
</script>
<template>
    <header class="site-header">
        <div class="header-inner">
            <NuxtLink to="/" class="wordmark" aria-label="Ivan Lara home">Ivan Lara<span aria-hidden="true">.</span></NuxtLink>
            <nav class="primary-nav" aria-label="Main navigation">
                <NuxtLink v-for="item in config.navItems" :key="item.path" :to="item.path" :aria-current="isActive(item.path) ? (route.path === item.path ? 'page' : 'true') : undefined">{{ item.name }}</NuxtLink>
            </nav>
            <AtThemeToggle />
        </div>
    </header>
</template>
