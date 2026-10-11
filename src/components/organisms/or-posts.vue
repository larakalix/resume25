<script setup lang="ts">
import type { Page } from '~/types/page'
const { page } = defineProps<Page>()
const { posts } = usePosts()
</script>
<template>
    <MlPageContainer :page="{ ...page, description: 'Thoughts on frontend development, architecture, and building for the web.' }" full-width>
        <template #overview>
            <p class="eyebrow">From the notebook</p>
            <h2 class="overview-title">Ideas worth<br>writing down.</h2>
            <p class="text-paragraph">{{ posts.length }} articles on the tools, decisions, and details behind building for the web.</p>
            <ul class="flex flex-wrap gap-2" aria-label="Writing topics"><li v-for="tag in [...new Set(posts.flatMap(post => post.tags))].slice(0, 4)" :key="tag"><AtTag :label="tag" /></li></ul>
        </template>
        <MlPosts title="Latest articles" :posts="posts" />
    </MlPageContainer>
</template>
