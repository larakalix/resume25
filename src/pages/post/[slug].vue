<script setup lang="ts">
import { formatPostDate } from '~/utils/post-date'

const route = useRoute()
const slug = computed(() => typeof route.params.slug === 'string' ? route.params.slug : '')
const { post } = usePost(slug)
const { posts } = usePosts()
const postIndex = computed(() => posts.value.findIndex(item => item.slug === slug.value))
const previousPost = computed(() => posts.value[postIndex.value - 1])
const nextPost = computed(() => posts.value[postIndex.value + 1])

if (!post.value) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
}

watch(post, (value) => {
    if (!value) showError({ statusCode: 404, statusMessage: 'Article not found' })
})

const formattedDate = computed(() => {
    if (!post.value?.date) return ''
    return formatPostDate(post.value.date)
})

const posthog = usePostHog()

onMounted(() => {
    posthog?.capture('blog_post_viewed', {
        post_slug: post.value?.slug,
        post_title: post.value?.title,
        post_tags: post.value?.tags,
    })
})

useSeoMeta({
    title: () => `${post.value?.title ?? 'Article'} - Ivan Lara`,
    description: () => post.value?.excerpt ?? '',
    ogTitle: () => `${post.value?.title ?? 'Article'} - Ivan Lara`,
    ogDescription: () => post.value?.excerpt ?? '',
    ogType: 'article',
})

</script>

<template>
    <div class="article-page flex flex-col gap-y-8">
        <MlReadingProgress target-id="article-body" />
        <AtNavLink to="/blog" class="group self-start">
            ← Back to blog
        </AtNavLink>

        <article v-if="post" id="article-body" class="flex flex-col gap-y-8">
            <header class="portfolio-card article-intro flex flex-col gap-y-4">
                <time :datetime="post.date" class="eyebrow">{{ formattedDate }}</time>
                <h1 class="page-title">{{ post.title }}</h1>
                <ul class="flex flex-wrap gap-1">
                    <li v-for="tag in post.tags" :key="tag">
                        <AtTag :label="tag" />
                    </li>
                </ul>
            </header>

            <!-- Authored locally in src/data/posts.ts; never render untrusted HTML here. -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="portfolio-card article-reading prose dark:prose-invert max-w-none text-title/80 leading-relaxed" v-html="post.content" />
            <nav aria-label="More articles" class="mt-6 flex flex-wrap justify-between gap-4 border-t border-title/20 pt-4">
                <NuxtLink v-if="previousPost" :to="`/post/${previousPost.slug}`" class="portfolio-card adjacent-article text-sm underline underline-offset-4">← {{ previousPost.title }}</NuxtLink>
                <NuxtLink v-if="nextPost" :to="`/post/${nextPost.slug}`" class="portfolio-card adjacent-article text-sm underline underline-offset-4">{{ nextPost.title }} →</NuxtLink>
            </nav>
        </article>
    </div>
</template>
