<script setup lang="ts">
const { href } = defineProps<{ href: string }>()
</script>

<template>
    <a 
        :href="href" target="_blank" rel="noopener noreferrer" class="py-1 px-1 md:py-0.5 md:px-2.5 rounded-full md:border-2 text-xs text-dark dark:text-white font-semibold border-black dark:border-white hover:bg-orange hover:text-black hover:border-orange transition-all">
        <slot />
    </a>
</template>