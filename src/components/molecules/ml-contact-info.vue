<script setup lang="ts">
import profile from '~/data/generated/profile.json'
import { copyEmail } from '~/utils/copy-email'
const { config } = useContent()
const posthog = usePostHog()
const feedback = ref('')
const copying = ref(false)
const copied = computed(() => feedback.value.startsWith('Email copied.'))
const socialLinks = computed(() => config.contactLinks.filter(link => link.name !== 'Email'))
function trackContactLinkClick(name: string) {
    posthog?.capture('contact_link_clicked', { link_name: name, link_type: name === 'Email' ? 'email' : 'external' })
}
async function copyAddress() {
    copying.value = true
    feedback.value = ''
    feedback.value = await copyEmail(profile.email, navigator.clipboard?.writeText.bind(navigator.clipboard))
    copying.value = false
}
</script>
<template>
    <section class="contact-grid" aria-labelledby="contact-options">
        <h2 id="contact-options" class="sr-only">Contact options</h2>
        <div class="portfolio-card contact-card space-y-5">
            <p class="eyebrow">Start a conversation</p>
            <h3 class="section-title">Good work starts<br>with a hello.</h3>
            <p class="text-paragraph">For projects and engineering opportunities, send me a note.</p>
            <a :href="`mailto:${profile.email}`" class="contact-email inline-flex min-h-11 items-center text-accent underline decoration-border underline-offset-8" @click="trackContactLinkClick('Email')">{{ profile.email }}</a>
            <div><UButton color="neutral" variant="outline" :loading="copying" loading-icon="mdi:loading" :class="{ 'copy-confirmed': copied }" @click="copyAddress">{{ copied ? 'Copied ✓' : 'Copy email' }}</UButton><p class="contact-feedback" role="status" aria-live="polite" aria-atomic="true">{{ feedback }}</p></div>
        </div>
        <div class="portfolio-card contact-card">
            <p class="eyebrow mb-4">Elsewhere</p>
            <h3 class="section-title mb-6">Follow the work.</h3>
            <ul><li v-for="link in socialLinks" :key="link.name"><a :href="link.href" target="_blank" rel="noopener noreferrer" class="contact-link" @click="trackContactLinkClick(link.name)">{{ link.name }}<AtMotionArrow /></a></li></ul>
            <p class="mt-8 text-sm text-paragraph">{{ profile.location }}<span v-if="profile.openToRelocate"> · Open to relocate</span></p>
        </div>
    </section>
</template>
