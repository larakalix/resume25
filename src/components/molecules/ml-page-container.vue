<script setup lang="ts">
import type { Page } from '~/types/page'
const { page, compactSidebar = false, fullWidth = false } = defineProps<Page & { compactSidebar?: boolean; fullWidth?: boolean }>()
</script>
<template>
    <div class="page-layout page-layout-studio" :class="{ 'page-layout-split': !fullWidth, 'page-layout-compact': compactSidebar && !fullWidth }">
        <div class="page-heading-grid" :class="{ 'page-heading-overview': $slots.overview }">
            <div class="portfolio-card page-intro-tile"><MlPageHeader v-bind="page" :description="[page.description]" /></div>
            <aside v-if="$slots.overview" class="portfolio-card page-overview-tile" aria-label="Page overview"><slot name="overview" /></aside>
            <aside v-if="$slots.sidebar" aria-label="Explore the portfolio"><slot name="sidebar" /></aside>
        </div>
        <div class="page-content"><slot /></div>
    </div>
</template>
