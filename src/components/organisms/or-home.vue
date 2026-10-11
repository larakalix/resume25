<script setup lang="ts">
const { data: home, error, status, refresh } = await usePortfolioQuery('home')
const posthog = usePostHog()
useHead({ link: [{ rel: 'preload', href: '/fonts/bricolage-grotesque-latin.woff2', as: 'font', type: 'font/woff2', crossorigin: '' }] })
</script>
<template>
    <div v-if="home" class="portfolio-home">
        <MlGlobeWorld :profile="home.profile" :roles="home.experience" :skill-groups="home.skillGroups" />
        <div class="site-shell">
        <section class="section-space selected-projects" aria-labelledby="selected-work"><div class="section-heading"><h2 id="selected-work" class="section-title">Ideas, made real.</h2><NuxtLink to="/projects" class="text-action" @click="posthog?.capture('view_all_projects_clicked')">All projects <AtMotionArrow /></NuxtLink></div><div class="project-grid"><MlProjectCard v-for="(project, index) in home.projects" :key="project.id" :project :index tracking-variant="studio" /></div></section>
        <section class="section-space" aria-labelledby="latest-writing"><div class="section-heading"><h2 id="latest-writing" class="section-title">From the notebook.</h2><NuxtLink to="/blog" class="text-action">All writing <AtMotionArrow /></NuxtLink></div><div class="home-article-grid"><MlPostCard v-for="post in home.articles" :key="post.id" :post="post" /></div></section>
        <section class="home-contact section-space"><h2>Let's build<br>something good.</h2><div><p>Have something in mind?</p><NuxtLink to="/contact" class="text-action">Get in touch <AtMotionArrow /></NuxtLink><a :href="`mailto:${home.profile.email}`" class="contact-address" @click="posthog?.capture('contact_link_clicked', { link_name: 'Email', link_type: 'email' })">{{ home.profile.email }}</a></div></section>
        </div>
    </div>
    <div v-else class="page-state" :role="error ? 'alert' : 'status'"><h1>{{ error ? 'Could not load the portfolio' : 'Loading portfolio…' }}</h1><p v-if="error">Please try again.</p><UButton v-if="status === 'error'" @click="refresh()">Try again</UButton></div>
</template>

<style scoped>
@font-face { font-family: 'Bricolage Grotesque'; font-style: normal; font-weight: 600 700; font-display: swap; src: url('/fonts/bricolage-grotesque-latin.woff2') format('woff2'); }
</style>
