<script setup lang="ts">
import type { Project } from '~/types/schemas'

const { project, variant = 'compact', featured = false } = defineProps<{
    project: Project
    index: number
    hoveredIndex: number | null
    variant?: 'compact' | 'large'
    featured?: boolean
}>()
const emit = defineEmits<{ hover: []; unhover: [] }>()
const posthog = usePostHog()
function trackProjectClick() {
    posthog?.capture('project_link_clicked', { project_name: project.name, project_url: project.url, variant })
}
</script>

<template>
    <article class="portfolio-card project-card" :class="{ 'project-card-featured': featured, 'project-card-compact': variant === 'compact' }" @mouseenter="emit('hover')" @mouseleave="emit('unhover')">
        <component :is="project.url ? 'a' : 'div'" :href="project.url || undefined" :target="project.url ? '_blank' : undefined" :rel="project.url ? 'noopener noreferrer' : undefined" class="project-image-link" @click="project.url && trackProjectClick()">
            <div class="project-preview-bar" aria-hidden="true"><i /><i /><i /><span>{{ project.name }}</span></div>
            <NuxtImg :src="project.image" :alt="project.name" width="960" height="600" :sizes="featured ? '100vw lg:700px' : '100vw sm:50vw lg:560px'" loading="lazy" decoding="async" class="project-image" />
            <span v-if="project.url" class="project-image-arrow" aria-hidden="true"><AtMotionArrow /></span>
        </component>
        <div class="project-card-body">
            <p v-if="featured" class="eyebrow">Featured project</p>
            <h3 class="card-title"><a v-if="project.url" :href="project.url" target="_blank" rel="noopener noreferrer" @click="trackProjectClick">{{ project.name }}</a><template v-else>{{ project.name }}</template></h3>
            <p class="text-paragraph leading-relaxed">{{ project.description }}</p>
            <ul class="flex flex-wrap gap-2" aria-label="Technologies and topics">
                <li v-for="tag in project.tags" :key="tag"><AtTag :label="tag" /></li>
            </ul>
        </div>
    </article>
</template>
