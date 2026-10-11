<script setup lang="ts">
import type { ArticleSummary } from '~/domain/content/models'
import { formatPostDate } from '~/utils/post-date'
const { post } = defineProps<{ post: ArticleSummary }>()
const posthog = usePostHog()
</script>
<template>
    <NuxtLink :to="`/post/${post.slug}`" :aria-label="`Read ${post.title}`" class="article-card" @click="posthog?.capture('post_card_clicked', { post_slug: post.slug, post_title: post.title, post_tags: post.tags })"><article><time :datetime="post.date">{{ formatPostDate(post.date) }}</time><h3 class="card-title">{{ post.title }}<AtMotionArrow /></h3><p>{{ post.excerpt }}</p><ul class="tag-list"><li v-for="tag in post.tags" :key="tag"><AtTag :label="tag" /></li></ul><span class="article-read">Read article <AtMotionArrow /></span></article></NuxtLink>
</template>
