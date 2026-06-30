<script setup lang="ts">
import type { Project } from '~/types/schemas';

const { project, index, hoveredIndex, variant = 'compact' } = defineProps<{
    project: Project;
    index: number;
    hoveredIndex: number | null;
    variant?: 'compact' | 'large'
}>()

const emit = defineEmits<{
    hover: []
    unhover: []
}>()
</script>

<template>
    <figure class="p-2 bg-white-100/50 dark:bg-gray-400/10 rounded group">
        <div class="transition-opacity duration-300" :class="[
            variant === 'large' ? 'flex flex-col gap-4' : 'flex gap-4 items-start',
            {
                'opacity-40': hoveredIndex !== null && hoveredIndex !== index,
                'opacity-100': hoveredIndex === null || hoveredIndex === index
            }
        ]" @mouseenter="emit('hover')" @mouseleave="emit('unhover')">
            <a v-if="project.url" :href="project.url" target="_blank" rel="noopener noreferrer"
                class="block overflow-hidden rounded" :class="variant === 'large' ? 'w-full' : 'min-w-32'">
                <img :src="project.image" :alt="project.name"
                    class="object-cover rounded transition-transform duration-300 group-hover:scale-105"
                    :class="variant === 'large' ? 'w-full h-48' : 'min-w-32 h-20'" />
            </a>
            <div v-else class="overflow-hidden rounded" :class="variant === 'large' ? 'w-full' : 'min-w-32'">
                <img :src="project.image" :alt="project.name" class="object-cover rounded"
                    :class="variant === 'large' ? 'w-full h-48' : 'min-w-32 h-20'" />
            </div>

            <div class="flex flex-col justify-between gap-1">
                <a v-if="project.url" :href="project.url" target="_blank" rel="noopener noreferrer"
                    class="inline-flex items-baseline font-medium leading-tight text-title group-hover:text-black dark:group-hover:text-orange focus-visible:text-orange group/link text-base">
                    {{ project.name }}
                    <span v-if="variant === 'large'" class="ml-1 text-xs">↗</span>
                </a>
                <h3 v-else
                    class="inline-flex items-baseline font-medium leading-tight text-title group-hover:text-black dark:group-hover:text-orange focus-visible:text-orange group/link text-base">
                    {{ project.name }}
                </h3>
                <p class="mt-2 text-sm text-title/60 leading-normal">
                    {{ project.description }}
                </p>
                <ul class="mt-2 flex flex-wrap gap-0.5">
                    <li v-for="tag in project.tags" :key="tag">
                        <AtTag>{{ tag }}</AtTag>
                    </li>
                </ul>
            </div>
        </div>
    </figure>
</template>
