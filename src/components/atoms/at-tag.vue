<script setup lang="ts">
const { label = '' } = defineProps<{ label?: string }>()
const tone = computed(() => {
    const technology = label.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (technology.startsWith('nuxt')) return 'green'
    if (technology.startsWith('react')) return 'sky'
    if (technology === 'typescript') return 'blue'
    if (technology.startsWith('tailwind')) return 'teal'
    if (technology.startsWith('next')) return 'slate'
    if (technology === 'storybook') return 'rose'
    return 'warm'
})
</script>

<template>
    <span class="technology-pill" :data-tone="tone"><span class="pill-dot" aria-hidden="true" /><slot>{{ label }}</slot></span>
</template>

<style scoped>
.technology-pill { --pill-text: #8a421f; --pill-fill: #fae8dc; --pill-border: #e9cbb7; display: inline-flex; align-items: center; gap: .4rem; padding: .3rem .65rem; border: 1px solid var(--pill-border); border-radius: 99px; background: var(--pill-fill); color: var(--pill-text); font-size: .75rem; font-weight: 500; line-height: 1.5; box-shadow: inset 0 1px 0 #ffffff70; }
.pill-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; background: currentColor; }
[data-tone="green"] { --pill-text: #176443; --pill-fill: #e2f3e9; --pill-border: #b9ddca; }
[data-tone="sky"] { --pill-text: #155d80; --pill-fill: #e1f1fa; --pill-border: #b8d9ed; }
[data-tone="blue"] { --pill-text: #2956a3; --pill-fill: #e7edfc; --pill-border: #c4d2f2; }
[data-tone="teal"] { --pill-text: #116568; --pill-fill: #e0f3f1; --pill-border: #b4deda; }
[data-tone="slate"] { --pill-text: #414854; --pill-fill: #e8eaee; --pill-border: #cbd0d8; }
[data-tone="rose"] { --pill-text: #9c355c; --pill-fill: #fbe6ed; --pill-border: #efc2d2; }
:global(.dark .technology-pill) { --pill-text: #f5ba93; --pill-fill: #463226; --pill-border: #70503a; box-shadow: inset 0 1px 0 #ffffff08; }
:global(.dark .technology-pill[data-tone="green"]) { --pill-text: #9ce6bc; --pill-fill: #203e2f; --pill-border: #37674d; }
:global(.dark .technology-pill[data-tone="sky"]) { --pill-text: #a5ddfa; --pill-fill: #223c4b; --pill-border: #3d6077; }
:global(.dark .technology-pill[data-tone="blue"]) { --pill-text: #b5ceff; --pill-fill: #293751; --pill-border: #485e86; }
:global(.dark .technology-pill[data-tone="teal"]) { --pill-text: #9ce4dc; --pill-fill: #203e3c; --pill-border: #386762; }
:global(.dark .technology-pill[data-tone="slate"]) { --pill-text: #d6dae1; --pill-fill: #363a42; --pill-border: #555d6b; }
:global(.dark .technology-pill[data-tone="rose"]) { --pill-text: #ffc0d7; --pill-fill: #482d38; --pill-border: #79495c; }
</style>
