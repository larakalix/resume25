<script setup lang="ts">
import type { Page } from '~/types/page'

const { page, compactSidebar = false } = defineProps<Page & {
    compactSidebar?: boolean
}>()
</script>

<template>
    <section class="flex flex-col md:grid gap-20 md:gap-4 w-full"
        :class="compactSidebar ? 'md:grid-cols-[1fr_2fr]' : 'md:grid-cols-2'">
        <div class="flex flex-col md:justify-between md:flex-1 md:h-full">
            <MlPageHeader v-bind="page" :description="[page.description]" />

            <slot name="sidebar" />
        </div>

        <div class="flex flex-col justify-start gap-y-4">
            <slot />
        </div>
    </section>
</template>
