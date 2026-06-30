<script setup lang="ts">
import type { Post } from '~/types/schemas';

const { posts, isLoading = false, isError = false, error = null, title = 'Blog' } = defineProps<{
    posts: Post[]
    isLoading?: boolean
    isError?: boolean
    error?: Error | null
    title?: string
}>()
</script>

<template>
    <div class="flex flex-col gap-y-4">
        <AtTitle size="large">{{ title }}</AtTitle>

        <div v-if="isLoading" class="text-sm text-title/60">Loading posts...</div>

        <div v-else-if="isError" class="text-sm text-red-500">
            Failed to load posts. {{ error?.message }}
        </div>

        <MlEmptyRows v-else-if="!posts.length" />

        <MlPostCard v-for="post in posts" :key="post.id" :post="post" />
    </div>
</template>
