<script setup lang="ts">
import type { MLPageHeader } from '~/types/molecules'
const props = defineProps<MLPageHeader>()
const posthog = usePostHog()
function trackCtaClick() {
    posthog?.capture('contact_cta_clicked', { cta_text: props.action?.text, cta_href: props.action?.href })
}
</script>
<template>
    <header class="max-w-3xl space-y-6">
        <div class="space-y-2"><h1 class="page-title">{{ props.title }}</h1>
        <p v-if="props.subtitle" class="page-subtitle">{{ props.subtitle }}</p></div>
        <div v-if="props.description.some(Boolean)" class="max-w-2xl space-y-4 text-paragraph">
            <p v-for="(text, index) in props.description.filter(Boolean)" :key="index" class="leading-relaxed">{{ text }}</p>
        </div>
        <AtLinkButton v-if="props.action" :label="props.action.text" :to="props.action.href" @click="trackCtaClick" />
    </header>
</template>
