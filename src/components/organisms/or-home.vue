<script setup lang="ts">
import type { Page } from '~/types/page'

const { page } = defineProps<Page>()
const { config } = useContentStore()
const { projects } = useProjectStore()

const { description, ...rest } = page

const paragraphs = description
    .split('|')
    .map((text: string) => text.trim())
    .filter((text: string) => text.length > 0)

const first = paragraphs.shift() || ''
</script>

<template>
    <MlPageContainer :page="{ ...rest, description: first }">
        <template #sidebar>
            <MlSidebar :items="config.navItems" />
        </template>

        <template #default>
            <AtParagraph v-for="(text, index) in paragraphs" :key="index" :text="text" />

            <MlProjects :projects="projects ?? []" />
        </template>
    </MlPageContainer>
</template>