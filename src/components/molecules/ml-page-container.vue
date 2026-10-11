<script setup lang="ts">
import type { Page } from '~/types/page'
defineProps<Page & { compactSidebar?: boolean; fullWidth?: boolean }>()
</script>
<template><div class="page-layout"><header class="page-intro"><h1 class="page-title">{{ page.title }}</h1><p v-if="page.subtitle" class="page-subtitle">{{ page.subtitle }}</p><p v-if="page.description" class="page-description">{{ page.description }}</p></header><aside v-if="$slots.overview" class="page-tools" aria-label="Page overview"><slot name="overview" /></aside><slot /><aside v-if="$slots.sidebar"><slot name="sidebar" /></aside></div></template>
