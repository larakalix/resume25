<script setup lang="ts">
import type { Project } from '~/types/schemas';

const { projects, isLoading = false, isError = false, error = null, showViewAll = true, title = 'Projects', variant = 'compact' } = defineProps<{
    projects: Project[]
    isLoading?: boolean
    isError?: boolean
    error?: Error | null
    showViewAll?: boolean
    title?: string
    variant?: 'compact' | 'large'
}>()

const hoveredIndex = ref<number | null>(null)
</script>

<template>
    <div :class="variant === 'large' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-y-4'">
        <AtTitle size="large" class="col-span-full">{{ title }}</AtTitle>

        <div v-if="isLoading" class="text-sm text-title/60">Loading projects...</div>

        <div v-else-if="isError" class="text-sm text-red-500">
            Failed to load projects. {{ error?.message }}
        </div>

        <MlEmptyRows v-else-if="!projects.length" />

        <MlProjectCard v-for="(project, i) in projects" :key="project.id" :project="project" :index="i"
            :hovered-index="hoveredIndex" :variant="variant" @hover="hoveredIndex = i" @unhover="hoveredIndex = null" />

        <AtNavLink v-if="showViewAll && !isLoading && !isError" to="/projects" class="group col-span-full">
            View all projects <span class="ml-2 transition-transform group-hover:rotate-45 group-hover:text-orange/80">↗
            </span>
        </AtNavLink>
    </div>
</template>
