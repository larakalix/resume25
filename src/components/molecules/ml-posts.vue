<script setup lang="ts">
import type { Post } from '~/types/schemas';

const { posts, title = 'Blog' } = defineProps<{
    posts: Post[]
    title?: string
}>()
</script>

<template>
    <div class="flex flex-col gap-y-4">
        <AtTitle size="large">{{ title }}</AtTitle>

        <MlEmptyRows v-if="!posts.length" />

        <MlPostCard v-for="post in posts" :key="post.id" :post="post" />
    </div>
</template>
