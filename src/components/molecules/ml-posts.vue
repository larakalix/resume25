<script setup lang="ts">
import type { PostSummary } from '~/types/schemas'
const { posts, isLoading = false, isError = false, error = null, title = 'Blog' } = defineProps<{
    posts: PostSummary[]
    isLoading?: boolean
    isError?: boolean
    error?: Error | null
    title?: string
}>()
</script>

<template>
    <section class="space-y-6">
        <h2 class="section-title">{{ title }}</h2>
        <div class="article-grid">
            <MlCollectionState :is-loading="isLoading" :is-error="isError" :error="error" :count="posts.length" label="posts">
                <MlPostCard v-for="post in posts" :key="post.id" :post="post" />
            </MlCollectionState>
        </div>
    </section>
</template>
