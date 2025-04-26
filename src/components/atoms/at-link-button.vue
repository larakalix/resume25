<script setup lang="ts">
const { to, label } = defineProps<{
    label: string
    to: string
}>()

const route = useRoute()
const isActive = computed(() => route.path === to)
</script>

<template>
    <ULink
        :to="to"
        class="group inline-flex justify-between items-center w-full lg:max-w-xs text-sm md:text-lg font-medium border-b-2 border-black/80 dark:border-white/80 text-dark dark:text-white hover:border-orange transition-all"
        active-class="!border-orange/80"
        inactive-class="border-black/80 dark:border-white/80 text-dark dark:text-white">

        <span class="py-2 group-hover:text-black dark:group-hover:text-white">{{ label }}</span>
        <span
            class="ml-2 transition-transform group-hover:rotate-45 group-hover:text-orange/80"
            :class="[isActive && 'rotate-45 text-orange/80']" >
            ↗
        </span>
    </ULink>
</template>
