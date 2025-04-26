<script setup lang="ts">
const { to, class: className } = defineProps<{
    to: string;
    class?: string;
}>()
</script>

<template>
    <ULink :to="to" :class="className"
        class="flex items-center text-sm font-medium text-black/70 dark:text-white/70 p-2 rounded-md hover:text-orange/80 dark:hover:text-orange/60 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
        active-class="!text-black dark:!text-white" inactive-class="text-muted">
        <slot />
    </ULink>
</template>
