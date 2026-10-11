<script setup lang="ts">
import { resume } from '~/data/resume'
import { formatResumeDate } from '~/utils/resume-date'

const { profile } = resume
const roles = resume.experience.map(role => ({
    ...role,
    featured: role.highlights.filter(item => item.featured),
    additional: role.highlights.filter(item => !item.featured),
}))
const roleOpen = ref<Record<string, boolean>>(Object.fromEntries(roles.map(role => [role.id, false])))
const expandableRoles = roles.filter(role => role.additional.length)
const allExpanded = computed(() => expandableRoles.length > 0 && expandableRoles.every(role => roleOpen.value[role.id]))
function toggleAllRoles() {
    const next = !allExpanded.value
    roleOpen.value = Object.fromEntries(roles.map(role => [role.id, next]))
}

useSeoMeta({
    title: `${profile.name} - Resume`,
    description: profile.summary,
    ogTitle: `${profile.name} - Resume`,
    ogDescription: profile.summary,
})
function printResume() {
    window.print()
}
</script>

<template>
    <article class="resume mx-auto w-full space-y-6">
        <header class="portfolio-card resume-intro space-y-6">
            <div class="flex flex-wrap items-start justify-between gap-6">
                <div class="space-y-3">
                    <p class="eyebrow">Resume</p>
                    <h1 class="page-title">{{ profile.name }}</h1>
                    <p class="text-xl text-title/80">{{ profile.headline }}</p>
                    <p class="text-sm text-title/70">{{ profile.location }}<span v-if="profile.openToRelocate"> · Open to relocate</span></p>
                </div>
                <div class="resume-actions flex flex-wrap gap-2">
                    <UButton :to="resume.downloads.pdf" external download="ivan-lara-resume.pdf" color="neutral">Download PDF</UButton>
                    <UButton :to="resume.downloads.text" external download="ivan-lara-resume.txt" color="neutral" variant="outline">Download text resume</UButton>
                    <UButton color="neutral" variant="ghost" @click="printResume">Print</UButton>
                </div>
            </div>
            <ul class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-title/80 underline underline-offset-4">
                <li><a :href="`mailto:${profile.email}`">{{ profile.email }}</a></li>
                <li><a :href="profile.phoneHref">{{ profile.phone }}</a></li>
                <li v-for="link in profile.links" :key="link.url"><a :href="link.url">{{ link.label }}</a></li>
            </ul>
            <p class="max-w-3xl leading-relaxed text-title/80">{{ profile.summary }}</p>
        </header>
        <div class="resume-experience-header space-y-4">
                <div class="section-heading">
                    <h2 id="experience-title" class="section-title">Experience</h2>
                    <UButton v-if="expandableRoles.length" color="neutral" variant="outline" class="resume-actions" :aria-expanded="allExpanded" @click="toggleAllRoles">{{ allExpanded ? 'Collapse all' : 'Expand all' }}</UButton>
                </div>
        <nav class="resume-section-nav" aria-label="Resume sections">
            <a href="#experience-title">Experience</a><a href="#skills-title">Skills</a><a href="#education-title">Education</a><a href="#certification-title">Certification</a><a href="#languages-title">Languages</a>
        </nav>
        </div>
        <div class="resume-columns grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section aria-labelledby="experience-title" class="min-w-0 space-y-7">
                <div class="space-y-4">
                    <section v-for="role in roles" :key="role.id" :aria-labelledby="`role-${role.id}`" class="portfolio-card resume-role space-y-4">
                        <div class="space-y-2">
                            <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <h3 :id="`role-${role.id}`" class="text-xl font-medium text-title">{{ role.company }}</h3>
                                <p class="text-sm text-title/65"><time :datetime="role.startDate">{{ formatResumeDate(role.startDate) }}</time> – <time v-if="role.endDate" :datetime="role.endDate">{{ formatResumeDate(role.endDate) }}</time><span v-else>Present</span></p>
                            </div>
                            <p class="font-medium text-title/85">{{ role.role }}</p>
                            <p class="text-sm text-title/65">{{ role.location }}<span v-if="role.remote"> · Remote</span></p>
                        </div>
                        <ul class="list-disc space-y-3 pl-5 leading-relaxed text-title/80">
                            <li v-for="item in role.featured" :key="item.id">{{ item.text }}</li>
                        </ul>
                        <UCollapsible v-if="role.additional.length" v-model:open="roleOpen[role.id]" class="resume-details space-y-3">
                            <template #default="{ open }">
                                <UButton color="neutral" variant="link" class="px-0" :aria-label="`${open ? 'Hide' : 'Show'} more about ${role.company}`">{{ open ? 'Show less' : `Show ${role.additional.length} more details` }} <span aria-hidden="true">{{ open ? '−' : '+' }}</span></UButton>
                            </template>
                            <template #content>
                                <ul class="list-disc space-y-3 pl-5 leading-relaxed text-title/80">
                                    <li v-for="item in role.additional" :key="item.id">{{ item.text }}</li>
                                </ul>
                            </template>
                        </UCollapsible>
                        <ul class="resume-print-details list-disc space-y-3 pl-5">
                            <li v-for="item in role.additional" :key="item.id">{{ item.text }}</li>
                        </ul>
                        <p class="text-sm leading-relaxed text-title/65"><span class="font-medium">Technologies:</span> {{ role.technologies.join(' · ') }}</p>
                    </section>
                </div>
            </section>
            <aside aria-label="Skills and qualifications" class="resume-qualifications space-y-4">
                <section class="portfolio-card qualification-tile space-y-5">
                    <h2 id="skills-title" class="text-xl font-medium text-title">Skills</h2>
                    <div v-for="group in resume.skillGroups" :key="group.id" class="space-y-2">
                        <h3 class="text-sm font-medium text-title">{{ group.label }}</h3>
                        <p class="text-sm leading-relaxed text-title/75">{{ group.items.join(' · ') }}</p>
                    </div>
                </section>
                <section class="portfolio-card qualification-tile space-y-4">
                    <h2 id="education-title" class="text-xl font-medium text-title">Education</h2>
                    <div v-for="item in resume.education" :key="item.id" class="space-y-2 text-sm">
                        <h3 class="font-medium text-title">{{ item.institution }}</h3>
                        <p class="text-title/80">{{ item.qualification }}</p>
                        <p class="text-title/65">{{ formatResumeDate(item.date) }} · {{ item.status }}</p>
                    </div>
                </section>
                <section class="portfolio-card qualification-tile space-y-4">
                    <h2 id="certification-title" class="text-xl font-medium text-title">Certification</h2>
                    <div v-for="item in resume.certifications" :key="item.id" class="space-y-2 text-sm">
                        <h3 class="font-medium text-title">{{ item.issuer }}</h3>
                        <p class="text-title/80">{{ item.name }}</p>
                        <p class="text-title/65">{{ formatResumeDate(item.date) }}</p>
                    </div>
                </section>
                <section class="portfolio-card qualification-tile space-y-4">
                    <h2 id="languages-title" class="text-xl font-medium text-title">Languages</h2>
                    <ul class="space-y-2 text-sm text-title/80">
                        <li v-for="language in resume.languages" :key="language.name"><span class="font-medium">{{ language.name }}</span> · {{ language.proficiency }}</li>
                    </ul>
                </section>
            </aside>
        </div>
    </article>
</template>

<style scoped>
.resume-print-details { display: none; }
.resume-intro, .qualification-tile, .resume-role { padding: var(--card-padding); }
.resume-role { border-left: 0; }
.resume-role::before { display: none; }
.resume-section-nav { margin-bottom: 0; }
@media (min-width: 640px) and (max-width: 1023px) { .resume-qualifications { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; } .resume-qualifications > section { margin-top: 0; } }
@media print {
    .resume-actions, .resume-details { display: none; }
    .resume-print-details { display: block; }
    .resume-columns, .resume-qualifications { display: block; }
    .resume-intro, .qualification-tile, .resume-role { padding: 0; background: transparent; border: 0; border-radius: 0; overflow: visible; }
    .resume-role + .resume-role, .qualification-tile + .qualification-tile { margin-top: 2rem; }
    .resume-columns aside { margin-top: 2rem; }
    .resume-role h3 { break-after: avoid; }
    .resume-role li, .resume-columns aside section { break-inside: avoid; }
}
</style>
