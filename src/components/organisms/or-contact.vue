<script setup lang="ts">
import profile from '~/data/generated/profile.json'
import type { Page } from '~/types/page'
const { page } = defineProps<Page>()
</script>
<template>
    <MlPageContainer :page="{ ...page, description: 'For projects and engineering opportunities, send me a note.', action: undefined }" full-width>
        <template #overview><p class="eyebrow">A little closer</p><h2 class="overview-title">{{ profile.location }}</h2><p v-if="profile.openToRelocate" class="text-paragraph">Open to relocate.</p><NuxtLink to="/resume" class="overview-link">Get to know my work <AtMotionArrow /></NuxtLink></template>
        <MlContactInfo />
    </MlPageContainer>
</template>
