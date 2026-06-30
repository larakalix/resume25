<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string

const { post, isLoading } = usePost(slug)

const formattedDate = computed(() => {
    if (!post.value?.date) return ''
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date(post.value.date))
})

watchEffect(() => {
    if (!isLoading.value && !post.value) {
        navigateTo('/not-found', { replace: true })
    }
})

useHead(() => ({
    title: post.value ? `${post.value.title} - Ivan Lara` : 'Post',
    meta: [
        { name: 'description', content: post.value?.excerpt ?? '' },
    ],
}))
</script>

<template>
    <div class="flex flex-col gap-y-6">
        <AtNavLink to="/blog" class="group self-start">
            ← Back to blog
        </AtNavLink>

        <div v-if="isLoading" class="text-sm text-title/60">Loading post...</div>

        <article v-else-if="post" class="flex flex-col gap-y-4">
            <header class="flex flex-col gap-y-2">
                <time class="text-sm text-title/50">{{ formattedDate }}</time>
                <h1 class="text-3xl font-medium text-title">{{ post.title }}</h1>
                <ul class="flex flex-wrap gap-1">
                    <li v-for="tag in post.tags" :key="tag">
                        <AtTag>{{ tag }}</AtTag>
                    </li>
                </ul>
            </header>

            <div class="prose dark:prose-invert max-w-none text-title/80 leading-relaxed" v-html="post.content" />
        </article>
    </div>
</template>
