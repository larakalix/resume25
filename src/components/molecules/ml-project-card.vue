<script setup lang="ts">
import type { Project } from '~/domain/content/models'
const { project, variant = 'compact', featured = false, index = 0, trackingVariant } = defineProps<{ project: Project; index?: number; hoveredIndex?: number | null; variant?: 'compact' | 'large'; featured?: boolean; trackingVariant?: string }>()
const emit = defineEmits<{ hover: []; unhover: [] }>()
const posthog = usePostHog()
function trackProjectClick() { posthog?.capture('project_link_clicked', { project_name: project.name, project_url: project.url, variant: trackingVariant ?? variant }) }
</script>
<template>
    <article class="project-card" :class="{ 'project-card-featured': featured }" @mouseenter="emit('hover')" @mouseleave="emit('unhover')">
        <component :is="project.url ? 'a' : 'div'" :href="project.url || undefined" :target="project.url ? '_blank' : undefined" :rel="project.url ? 'noopener noreferrer' : undefined" :aria-label="project.url ? `Visit ${project.name}` : undefined" class="project-image-link" @click="project.url && trackProjectClick()">
            <NuxtImg :src="project.image" :alt="`${project.name} project preview`" width="960" height="600" :sizes="featured ? '100vw xs:100vw sm:100vw md:100vw lg:960px' : '100vw xs:100vw sm:100vw md:50vw lg:33vw'" :loading="featured && index === 0 ? 'eager' : 'lazy'" decoding="async" class="project-image" />
            <span v-if="project.url" class="project-image-arrow" aria-hidden="true"><AtMotionArrow /></span>
        </component>
        <div class="project-card-body"><h3 class="card-title"><a v-if="project.url" :href="project.url" target="_blank" rel="noopener noreferrer" @click="trackProjectClick">{{ project.name }}</a><template v-else>{{ project.name }}</template></h3><p>{{ project.description }}</p><ul class="tag-list" aria-label="Technologies and topics"><li v-for="tag in project.tags" :key="tag"><AtTag :label="tag" /></li></ul></div>
    </article>
</template>
