<script setup lang="ts">
import type { Project } from '~/types/schemas';

const { projects, showViewAll = true, title = 'Projects', variant = 'compact' } = defineProps<{
    projects: Project[]
    showViewAll?: boolean
    title?: string
    variant?: 'compact' | 'large'
}>()

const hoveredIndex = ref<number | null>(null)
</script>

<template>
    <div :class="variant === 'large' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-y-4'">
        <AtTitle size="large" class="col-span-full">{{ title }}</AtTitle>

        <MlEmptyRows v-if="!projects.length" />

        <MlProjectCard v-for="(project, i) in projects" :key="project.id" :project="project" :index="i"
            :hovered-index="hoveredIndex" :variant="variant" @hover="hoveredIndex = i" @unhover="hoveredIndex = null" />

        <AtNavLink v-if="showViewAll" to="/projects" class="group col-span-full">
            View all projects <span class="ml-2 transition-transform group-hover:rotate-45 group-hover:text-orange/80">↗
            </span>
        </AtNavLink>
    </div>
</template>
