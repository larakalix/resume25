<script setup lang="ts">
import type { Project } from '~/types/schemas'

const { projects, isLoading = false, isError = false, error = null, showViewAll = true, title = 'Projects', variant = 'compact', featured = false } = defineProps<{
    projects: Project[]
    isLoading?: boolean
    isError?: boolean
    error?: Error | null
    showViewAll?: boolean
    title?: string
    variant?: 'compact' | 'large'
    featured?: boolean
}>()
const posthog = usePostHog()
function trackViewAllProjects() {
    posthog?.capture('view_all_projects_clicked')
}
</script>

<template>
    <section class="space-y-6">
        <div class="section-heading">
            <h2 class="section-title">{{ title }}</h2>
            <AtNavLink v-if="showViewAll && !isLoading && !isError" to="/projects" @click="trackViewAllProjects">View all projects <span aria-hidden="true">↗</span></AtNavLink>
        </div>
        <div>
            <MlCollectionState :is-loading="isLoading" :is-error="isError" :error="error" :count="projects.length" label="projects">
                <TransitionGroup name="project-shuffle" tag="div" class="project-grid" :class="{ 'project-grid-featured': featured, 'project-grid-compact': variant === 'compact' && !featured }">
                <MlProjectCard v-for="(project, index) in projects" :key="project.id" :project="project" :index="index" :hovered-index="null" :variant="variant" :featured="featured && index === 0" />
                </TransitionGroup>
            </MlCollectionState>
        </div>
    </section>
</template>
