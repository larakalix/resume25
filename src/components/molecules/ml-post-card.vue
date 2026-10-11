<script setup lang="ts">
import type { PostSummary } from '~/types/schemas'
import { formatPostDate } from '~/utils/post-date'
const { post } = defineProps<{ post: PostSummary }>()
const posthog = usePostHog()
const formattedDate = computed(() => formatPostDate(post.date))
function trackPostCardClick() {
    posthog?.capture('post_card_clicked', { post_slug: post.slug, post_title: post.title, post_tags: post.tags })
}
</script>

<template>
    <NuxtLink :to="`/post/${post.slug}`" :aria-label="`Read ${post.title}`" class="portfolio-card article-card" @click="trackPostCardClick">
        <article class="flex h-full flex-col gap-4">
            <time :datetime="post.date" class="eyebrow">{{ formattedDate }}</time>
            <h3 class="card-title">{{ post.title }}</h3>
            <p class="text-paragraph leading-relaxed">{{ post.excerpt }}</p>
            <ul class="mt-auto flex flex-wrap gap-2"><li v-for="tag in post.tags" :key="tag"><AtTag :label="tag" /></li></ul>
            <span class="article-read">Read article <AtMotionArrow /></span>
        </article>
    </NuxtLink>
</template>
