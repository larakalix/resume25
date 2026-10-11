<script setup lang="ts">
const { href, name } = defineProps<{ href: string; name?: string }>()

const posthog = usePostHog()

function trackSocialClick() {
    posthog?.capture('social_link_clicked', {
        social_name: name ?? href,
    })
}
</script>

<template>
    <a
        :href="href" :aria-label="name" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 min-w-11 items-center justify-center px-1 md:px-2.5 rounded-full md:border-2 text-xs font-semibold border-black dark:border-white text-title hover:bg-orange hover:text-black hover:border-orange"
        @click="trackSocialClick">
        <slot />
    </a>
</template>
