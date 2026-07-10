<script setup lang="ts">
import type { Post } from '~/types/schemas';

const { post } = defineProps<{ post: Post }>()

const posthog = usePostHog()

const formattedDate = computed(() => {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date(post.date))
})

function trackPostCardClick() {
    posthog?.capture('post_card_clicked', {
        post_slug: post.slug,
        post_title: post.title,
        post_tags: post.tags,
    })
}
</script>

<template>
    <NuxtLink
:to="`/post/${post.slug}`" class="block p-4 bg-white-100/50 dark:bg-gray-400/10 rounded group"
        @click="trackPostCardClick">
        <article class="flex flex-col gap-2">
            <time class="text-xs text-title/50">{{ formattedDate }}</time>
            <h3
                class="font-medium leading-tight text-title group-hover:text-black dark:group-hover:text-orange text-lg">
                {{ post.title }}
            </h3>
            <p class="text-sm text-title/60 leading-normal">
                {{ post.excerpt }}
            </p>
            <ul class="mt-1 flex flex-wrap gap-1">
                <li v-for="tag in post.tags" :key="tag">
                    <AtTag>{{ tag }}</AtTag>
                </li>
            </ul>
        </article>
    </NuxtLink>
</template>
