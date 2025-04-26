<script setup lang="ts">
import type { MLPageHeaderProps } from './types.ts'

const props = defineProps<MLPageHeaderProps>()
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
            <AtLinkButton :label="props?.action.text" :to="props?.action.href" />
        </template>
    </header>
</template>
