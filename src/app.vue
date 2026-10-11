<script setup lang="ts">
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const siteUrl = computed(() => String(runtimeConfig.public.siteUrl).replace(/\/$/, ''))
const canonical = computed(() => siteUrl.value ? new URL(route.path, siteUrl.value).href : undefined)

useSeoMeta({
  ogSiteName: 'Ivan Lara',
  ogType: 'website',
  ogUrl: () => canonical.value,
  ogImage: () => siteUrl.value ? `${siteUrl.value}/social-preview.png` : '/social-preview.png',
  twitterCard: 'summary_large_image',
  twitterImage: () => siteUrl.value ? `${siteUrl.value}/social-preview.png` : '/social-preview.png',
})
useHead(() => ({ link: canonical.value ? [{ rel: 'canonical', href: canonical.value }] : [] }))
</script>

<template>
  <NuxtLoadingIndicator />
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage :page-key="route => route.path" />
  </NuxtLayout>
</template>
