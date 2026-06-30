<script setup lang="ts">
import type { Page } from '~/types/page'

const { page } = defineProps<Page>()
const { config } = useContent()
const { projects } = useProjects()

const { description, ...rest } = page
</script>

<template>
    <MlPageContainer :page="{ ...rest, description: '' }" compact-sidebar>
        <template #sidebar>
            <MlSidebar :items="config.navItems" />
        </template>

        <template #default>
            <MlProjects :projects="projects ?? []" title="All projects" :show-view-all="false" variant="large" />
        </template>
    </MlPageContainer>
</template>
