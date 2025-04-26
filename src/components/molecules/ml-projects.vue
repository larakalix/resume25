<script setup lang="ts">
import type { Project } from '~/types/schemas';

const { projects } = defineProps<{ projects: Project[] }>()
</script>

<template>
    <div class="flex flex-col gap-y-4 mt-8">
        <AtTitle size="medium">Projects</AtTitle>

        <MlEmptyRows v-if="!projects.length" />

        <MlProjectCard v-for="(project, i) in projects" :key="project.id" :project="project" :index="i" />

        <AtNavLink to="projects/" class="group">
            View all projects <span class="ml-2 transition-transform group-hover:rotate-45 group-hover:text-orange/80">↗ </span>
        </AtNavLink>
    </div>
</template>