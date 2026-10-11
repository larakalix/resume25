<script setup lang="ts">
import type { Page } from '~/types/page'
const { page } = defineProps<Page>()
const { data: posts, status, error, refresh } = await usePosts()
</script>
<template><MlPageContainer :page="{ ...page, subtitle: undefined, description: 'Thoughts on frontend development, architecture, and building for the web.' }"><MlPosts :posts="posts ?? []" :is-loading="status === 'pending'" :is-error="!!error" :error="error" title="Latest articles" /><UButton v-if="error" variant="outline" @click="refresh()">Try again</UButton></MlPageContainer></template>
