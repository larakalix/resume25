<script setup lang="ts">
import type { Profile, Resume } from '~/domain/content/models'
import type { WorldPlace } from '~/experience/explorer/types'
import { copyEmail } from '~/utils/copy-email'
const { place, profile, skillGroups } = defineProps<{ place: WorldPlace; profile: Profile; skillGroups: Resume['skillGroups'] }>()
const { config } = useContent(), posthog = usePostHog()
const feedback = ref(''), copying = ref(false)
const groups = computed(() => place === 'approach' ? skillGroups.filter(group => ['architecture', 'delivery'].includes(group.id)) : skillGroups)
const socialLinks = computed(() => config.contactLinks.filter(link => link.name !== 'Email'))
async function copyAddress() { copying.value = true; feedback.value = await copyEmail(profile.email, navigator.clipboard?.writeText.bind(navigator.clipboard)); copying.value = false }
function track(name: string) { posthog?.capture('contact_link_clicked', { link_name: name, link_type: name === 'Email' ? 'email' : 'external' }) }
</script>
<template>
    <div class="world-content">
        <template v-if="place === 'about'"><h2>I'm {{ profile.name }}.</h2><p class="content-headline">{{ profile.headline }}</p><p>{{ profile.summary }}</p><p class="content-location">{{ profile.location }}<span v-if="profile.openToRelocate"> · Open to relocate</span></p><NuxtLink to="/resume" class="world-content-link">View my resume <AtMotionArrow /></NuxtLink></template>
        <template v-else-if="place === 'toolkit' || place === 'approach'"><h2>{{ place === 'toolkit' ? 'My toolkit.' : 'How I build.' }}</h2><p v-if="place === 'approach'">I turn complex ideas into usable products.</p><section v-for="group in groups" :key="group.id" class="world-skill-group"><h3>{{ group.label }}</h3><ul><li v-for="item in group.items" :key="item">{{ item }}</li></ul></section></template>
        <template v-else><h2>Say hello.</h2><p>Have something in mind?</p><a class="world-content-link contact-world-email" :href="`mailto:${profile.email}`" @click="track('Email')">{{ profile.email }} <AtMotionArrow /></a><UButton class="world-copy" color="neutral" variant="outline" :loading="copying" @click="copyAddress">{{ feedback.startsWith('Email copied.') ? 'Copied' : 'Copy email' }}</UButton><p class="world-copy-feedback" role="status">{{ feedback }}</p><ul class="world-social"><li v-for="link in socialLinks" :key="link.name"><a :href="link.href" target="_blank" rel="noopener noreferrer" class="world-content-link" @click="track(link.name)">{{ link.name }}<AtMotionArrow /></a></li></ul><NuxtLink to="/contact" class="world-content-link">All contact details <AtMotionArrow /></NuxtLink></template>
    </div>
</template>
<style scoped>
.world-content h2 { font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 600; line-height: 1.1; letter-spacing: -.025em; margin-bottom: 1.25rem; }
.world-content p { font-size: .9375rem; line-height: 1.75; color: var(--world-muted); margin-top: 1rem; }
.world-content .content-headline { font-size: 1.125rem; color: var(--world-ink); }
.world-content .content-location { font-size: .8125rem; }
.world-content-link { display: inline-flex; justify-content: space-between; gap: 1rem; align-items: center; min-height: 44px; color: var(--world-blue); font-size: .875rem; margin-top: .75rem; }
.world-skill-group { margin-top: 1.5rem; }
.world-skill-group h3 { font-size: .9375rem; font-weight: 650; margin-bottom: .6rem; }
.world-skill-group ul { display: flex; flex-wrap: wrap; gap: .45rem; }
.world-skill-group li { border-radius: 999px; padding: .3rem .65rem; background: var(--world-soft); color: var(--world-ink); font-size: .8125rem; }
.world-copy { display: flex; border-radius: 999px; min-height: 44px; margin-top: .75rem; color: var(--world-blue); }
.world-content .world-copy-feedback { min-height: 1.5rem; font-size: .8125rem; }
.world-social { margin-top: 1rem; border-top: 1px solid var(--world-line); }
.world-social a { display: flex; }
.contact-world-email { font-size: 1.125rem; overflow-wrap: anywhere; }
</style>
