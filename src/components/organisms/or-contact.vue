<script setup lang="ts">
import type { Page } from '~/types/page'

const { page } = defineProps<Page>()
const { config } = useContentStore()

const { description, ...rest } = page

const paragraphs = description
    .split('|')
    .map((text: string) => text.trim())
    .filter((text: string) => text.length > 0)
</script>

<template>
    <MlPageContainer :page="{ ...rest, description: '' }">
        <template #sidebar>
            <MlSidebar :items="config.navItems" />
        </template>

        <template #default>
            <AtParagraph v-for="(text, index) in paragraphs" :key="index" :text="text" />

            <MlContactInfo />
            <!-- <MlContactForm /> -->
        </template>
    </MlPageContainer>
</template>