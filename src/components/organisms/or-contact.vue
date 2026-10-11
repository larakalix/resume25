<script setup lang="ts">
import type { Page } from '~/types/page'
const { page } = defineProps<Page>()
const { data: profile, error, refresh } = await usePortfolioQuery('profile')
</script>
<template><MlPageContainer :page="{ ...page, subtitle: undefined, description: 'For projects and engineering opportunities, send me a note.', action: undefined }"><MlContactInfo v-if="profile" :profile="profile" /><div v-else class="page-state" role="alert"><p>{{ error ? 'Could not load contact details. Please try again.' : 'Loading contact details…' }}</p><UButton @click="refresh()">Try again</UButton></div></MlPageContainer></template>
