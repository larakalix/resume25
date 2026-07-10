<script setup lang="ts">
import type { MLPageHeader } from '~/types/molecules';

const props = defineProps<MLPageHeader>()
const posthog = usePostHog()

function trackCtaClick() {
    posthog?.capture('contact_cta_clicked', {
        cta_text: props.action?.text,
        cta_href: props.action?.href,
    })
}
</script>

<template>
    <header class="max-w-3xl space-y-6 mb-0 md:mb-4 lg:mb-8">
        <div class="space-y-1">
            <AtTitle>{{ props?.title }}</AtTitle>
            <template v-if="props?.subtitle">
                <AtSubtitle>{{ props?.subtitle }}</AtSubtitle>
            </template>
        </div>

        <div class="space-y-4 w-full lg:max-w-[350px]">
            <AtParagraph v-for="(text, index) in props?.description" :key="index" :text="text" />
        </div>

        <template v-if="props?.action">
            <div @click="trackCtaClick">
                <AtLinkButton :label="props?.action.text" :to="props?.action.href" />
            </div>
        </template>
    </header>
</template>
