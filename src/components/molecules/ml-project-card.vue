<script setup lang="ts">
import type { Project } from '~/types/schemas';

const { project } = defineProps<{ project: Project; index: number }>()
const hoveredIndex = useProjectHover()
</script>

<template>
    <figure class="p-2 bg-white-100/50 dark:bg-gray-400/10 rounded group">
        <div class="flex gap-4 items-start transition-opacity duration-300" :class="{
            'opacity-40': hoveredIndex !== null && hoveredIndex !== index,
            'opacity-100': hoveredIndex === null || hoveredIndex === index
        }" @mouseenter="hoveredIndex = index" @mouseleave="hoveredIndex = null">
            <img :src="project.image" class="min-w-32 h-20 object-cover rounded" />
            <div class="flex flex-col justify-between gap-1">
                <h3
                    class="inline-flex items-baseline font-medium leading-tight text-title group-hover:text-black dark:group-hover:text-orange focus-visible:text-orange  group/link text-base">
                    {{ project.name }}
                </h3>
                <p class="mt-2 text-sm text-title/60 leading-normal">
                    {{ project.description }}
                </p>
                <ul class="mt-2 flex flex-wrap gap-2">
                    <li v-for="tag in project.tags" :key="tag">
                        <AtTag>{{ tag }}</AtTag>
                    </li>
                </ul>
            </div>
        </div>
    </figure>
</template>