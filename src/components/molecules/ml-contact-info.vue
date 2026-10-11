<script setup lang="ts">
import type { Profile } from '~/domain/content/models'
import { copyEmail } from '~/utils/copy-email'
const { profile } = defineProps<{ profile: Profile }>()
const { config } = useContent()
const posthog = usePostHog()
const feedback = ref('')
const copying = ref(false)
const copied = computed(() => feedback.value.startsWith('Email copied.'))
const socialLinks = computed(() => config.contactLinks.filter(link => link.name !== 'Email'))
function trackContactLinkClick(name: string) { posthog?.capture('contact_link_clicked', { link_name: name, link_type: name === 'Email' ? 'email' : 'external' }) }
async function copyAddress() { copying.value = true; feedback.value = ''; feedback.value = await copyEmail(profile.email, navigator.clipboard?.writeText.bind(navigator.clipboard)); copying.value = false }
</script>
<template>
    <section class="contact-grid" aria-labelledby="contact-options"><h2 id="contact-options" class="sr-only">Contact options</h2>
        <div class="contact-primary"><h3>Good work starts<br>with a hello.</h3><a :href="`mailto:${profile.email}`" class="contact-email" @click="trackContactLinkClick('Email')">{{ profile.email }} <AtMotionArrow /></a><div class="copy-action"><UButton color="primary" variant="outline" :loading="copying" loading-icon="mdi:loading" :icon="copied ? 'mdi:check' : 'mdi:content-copy'" @click="copyAddress">{{ copied ? 'Copied' : 'Copy email' }}</UButton><p class="contact-feedback" role="status" aria-live="polite" aria-atomic="true">{{ feedback }}</p></div></div>
        <div class="contact-secondary"><h3 class="section-title">Find me elsewhere.</h3><ul><li v-for="link in socialLinks" :key="link.name"><a :href="link.href" target="_blank" rel="noopener noreferrer" class="contact-link" @click="trackContactLinkClick(link.name)">{{ link.name }}<AtMotionArrow /></a></li></ul><p class="location-note">{{ profile.location }}<br><span v-if="profile.openToRelocate">Open to relocate</span></p><NuxtLink to="/resume" class="text-action">View resume <AtMotionArrow /></NuxtLink></div>
    </section>
</template>
