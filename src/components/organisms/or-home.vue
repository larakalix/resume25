<script setup lang="ts">
import profile from '~/data/generated/profile.json'
import recentExperience from '~/data/generated/recent-experience.json'
import { formatResumeDate } from '~/utils/resume-date'
import { formatPostDate } from '~/utils/post-date'
import type { Project } from '~/types/schemas'

const { recentProjects } = useProjects()
const { posts } = usePosts()
const posthog = usePostHog()
const introduction = profile.summary.match(/^.*?[.!?](?:\s|$)/)?.[0].trim() ?? profile.summary
function trackProject(project: Project) {
    posthog?.capture('project_link_clicked', { project_name: project.name, project_url: project.url, variant: 'studio' })
}
</script>

<template>
    <div class="studio-home">
                <div class="studio-topline"><span>{{ profile.name }} <span class="accent-dot" aria-hidden="true">●</span></span><span>Selected work &amp; a little about me</span></div>
                <div class="studio-grid">
                    <section class="studio-tile intro-tile">
                        <p class="studio-label">{{ profile.headline }}</p>
                        <h1>Hi, I'm {{ profile.name.split(' ')[0] }}<span class="accent-dot">.</span></h1>
                        <p class="intro-copy">{{ introduction }}</p>
                        <div class="intro-foot"><p>{{ profile.location }}<br>Open to relocate</p><NuxtLink to="/resume" class="studio-link">View resume <AtMotionArrow /></NuxtLink></div>
                    </section>
                    <article v-for="(project, index) in recentProjects" :key="project.id" class="studio-tile work-tile" :class="{ 'lead-tile': index === 0 }">
                        <a :href="project.url" target="_blank" rel="noopener noreferrer" class="work-link" @click="trackProject(project)">
                            <div class="work-meta"><span class="studio-label">{{ String(index + 1).padStart(2, '0') }} / Selected project</span><span class="round-arrow" aria-hidden="true"><AtMotionArrow /></span></div>
                            <div class="work-stage"><div class="studio-window"><div class="studio-window-bar" aria-hidden="true"><span /><span /><span /><i>{{ project.name }}</i></div><NuxtImg :src="project.image" :alt="`${project.name} project preview`" width="960" height="600" :sizes="index === 0 ? '100vw xs:100vw sm:100vw md:100vw lg:66vw xl:880px' : '100vw xs:100vw sm:100vw md:50vw lg:33vw xl:420px'" :loading="index === 0 ? 'eager' : 'lazy'" decoding="async" /></div></div>
                            <div class="work-caption"><h2>{{ project.name }}</h2><p>{{ project.description }}</p><ul aria-label="Technologies"><li v-for="tag in project.tags.slice(0, 3)" :key="tag"><AtTag :label="tag" /></li></ul></div>
                        </a>
                    </article>
                    <section class="studio-tile approach-tile">
                        <p class="studio-label">Behind the interfaces</p><h2>Good details.<br>Better experiences.</h2>
                        <p>UI, architecture, performance, and the work that connects them.</p>
                        <details><summary>About my approach <span aria-hidden="true">+</span></summary><p>{{ profile.summary }}</p></details>
                    </section>
                    <section class="studio-tile roles-tile">
                        <div class="tile-heading"><h2>Recent experience</h2><NuxtLink to="/resume" class="studio-link">Full resume <AtMotionArrow /></NuxtLink></div>
                        <NuxtLink v-for="role in recentExperience" :key="role.id" :to="`/resume#role-${role.id}`" class="studio-role"><div><h3>{{ role.company }}</h3><p>{{ role.role }}</p></div><div><span>{{ formatResumeDate(role.startDate) }} — {{ role.endDate ? formatResumeDate(role.endDate) : 'Present' }}</span><AtMotionArrow /></div></NuxtLink>
                    </section>
                    <section class="studio-tile writing-tile"><div class="tile-heading"><h2>From the notebook</h2><NuxtLink to="/blog" class="studio-link">All writing <AtMotionArrow /></NuxtLink></div><NuxtLink v-for="post in posts.slice(0, 2)" :key="post.id" :to="`/post/${post.slug}`" class="studio-post"><time :datetime="post.date" class="studio-label">{{ formatPostDate(post.date) }}</time><h3>{{ post.title }} <AtMotionArrow /></h3><p>{{ post.excerpt }}</p></NuxtLink></section>
                    <section class="studio-tile contact-tile"><p class="studio-label">Have something in mind?</p><h2>Let's build<br>something good<span aria-hidden="true">↗</span></h2><a :href="`mailto:${profile.email}`" class="studio-link">{{ profile.email }} <AtMotionArrow /></a><NuxtLink to="/contact" class="studio-link">Find me elsewhere <AtMotionArrow /></NuxtLink></section>
                </div>
    </div>
</template>

<style scoped>
.studio-home { --studio-bg: var(--color-background); --studio-surface: var(--color-surface); --studio-text: var(--color-title); --studio-muted: var(--color-paragraph); --studio-border: var(--color-border); --studio-accent: var(--color-accent); --studio-stage: var(--color-surface-muted); }

.studio-topline { display: flex; justify-content: space-between; gap: 1rem; margin: 0 0 1rem; font-size: .875rem; color: var(--studio-muted); }
.studio-topline > span:first-child { font-weight: 600; color: var(--studio-text); }
.accent-dot { color: var(--studio-accent); }
.studio-topline .accent-dot { margin-left: .35rem; font-size: .5rem; }
.studio-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 1rem; }
.studio-tile { min-width: 0; border-radius: var(--radius-card); background: var(--studio-surface); overflow: hidden; }
.studio-label { font-size: .75rem; letter-spacing: .04em; color: var(--studio-muted); }
.intro-tile { grid-column: span 4; padding: clamp(1.5rem, 3vw, 2.75rem); display: flex; flex-direction: column; }
.intro-tile h1 { margin: 1.5rem 0; font-size: clamp(2.5rem, 4vw, 4.5rem); letter-spacing: -.065em; line-height: 1.05; font-weight: 600; }
.intro-copy { font-size: clamp(1rem, 1.6vw, 1.25rem); line-height: 1.7; color: var(--studio-muted); }
.intro-foot { margin-top: auto; padding-top: 1.5rem; }
.intro-foot p { font-size: .875rem; line-height: 1.7; color: var(--studio-muted); margin-bottom: 1rem; }
.studio-link { display: inline-flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 44px; font-size: .875rem; }

.work-tile { grid-column: span 4; }
.lead-tile { grid-column: span 8; }
.work-link { display: flex; flex-direction: column; height: 100%; }
.work-meta { display: flex; align-items: center; justify-content: space-between; padding: .75rem 1.5rem 0; }
.round-arrow { flex-shrink: 0; display: grid; place-items: center; border: 1px solid var(--studio-border); border-radius: 50%; height: 44px; width: 44px; font-size: 1.25rem; transition: background 160ms, transform 160ms; }
.work-link:is(:hover, :focus-visible) .round-arrow { background: var(--studio-bg); transform: translate(2px, -2px); }
.work-stage { padding: 1.5rem 1.75rem 0; overflow: hidden; }
.studio-window { overflow: hidden; border-radius: 10px; box-shadow: 0 12px 25px #00000015; transform: translateY(8px); transition: transform 280ms var(--ease-spring); transform-origin: center bottom; border: 1px solid var(--studio-border); }
.work-link:focus-visible .studio-window { transform: perspective(800px) translateY(-4px) rotateX(2deg) rotateY(-2deg) scale(1.015); }
.studio-window-bar { display: flex; align-items: center; gap: 4px; padding: 8px; background: var(--studio-bg); }
.studio-window-bar > span { width: 5px; height: 5px; background: var(--studio-border); border-radius: 50%; }
.studio-window-bar i { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: .625rem; font-style: normal; margin-left: .5rem; color: var(--studio-muted); }
.studio-window img { width: 100%; aspect-ratio: 1.6; object-fit: cover; }
.lead-tile .work-stage { background: radial-gradient(ellipse at bottom, var(--studio-stage), transparent 75%); padding: 1rem 8% 0; }
.lead-tile .studio-window img { aspect-ratio: 2.9; object-position: top; }
.work-caption { flex: 1; position: relative; background: var(--studio-surface); padding: var(--card-content-padding); }
.work-caption h2 { font-size: 1.125rem; font-weight: 600; letter-spacing: -.025em; }
.work-caption p { margin-top: .5rem; font-size: .875rem; color: var(--studio-muted); line-height: 1.6; }
.work-caption ul { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: 1rem; }
.approach-tile { grid-column: span 4; padding: var(--card-padding); }
.approach-tile h2 { font-size: 2rem; letter-spacing: -.045em; line-height: 1.2; margin: 1rem 0; }
.approach-tile p:not(.studio-label) { line-height: 1.7; color: var(--studio-muted); }
.approach-tile summary { display: flex; justify-content: space-between; align-items: center; min-height: 44px; margin-top: 1.5rem; border-top: 1px solid var(--studio-border); font-size: .875rem; list-style: none; }
.approach-tile summary::-webkit-details-marker { display: none; }
.approach-tile details[open] summary span { transform: rotate(45deg); }
.roles-tile { grid-column: 1 / -1; padding: var(--card-padding); }
.tile-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem 1rem; }
.tile-heading h2 { font-size: 1.375rem; font-weight: 600; letter-spacing: -.035em; }
.studio-role { display: flex; justify-content: space-between; gap: 1rem; padding: 1.5rem 0; border-top: 1px solid var(--studio-border); }
.studio-role:first-of-type { margin-top: 1rem; }
.studio-role h3 { font-size: 1.125rem; font-weight: 600; }
.studio-role p, .studio-role > div:last-child { color: var(--studio-muted); font-size: .8125rem; line-height: 1.7; }
.studio-role > div:last-child { text-align: right; display: flex; flex-direction: column; justify-content: space-between; flex-shrink: 0; }
.writing-tile { grid-column: span 7; padding: var(--card-padding); }
.studio-post { display: block; padding: 1.5rem 0; border-top: 1px solid var(--studio-border); }
.studio-post:first-of-type { margin-top: 1rem; }
.studio-post h3 { display: flex; justify-content: space-between; gap: 1rem; margin: .6rem 0; font-size: 1.125rem; font-weight: 600; }
.studio-post p { color: var(--studio-muted); font-size: .875rem; line-height: 1.6; }
.contact-tile { grid-column: span 5; padding: var(--card-padding); display: flex; flex-direction: column; background: var(--studio-stage); }
.contact-tile h2 { font-size: clamp(2rem, 3.6vw, 3.5rem); line-height: 1.1; letter-spacing: -.055em; margin: 2rem 0 auto; }
.contact-tile h2 > span { display: block; margin: 1rem 0; font-weight: 400; }
.contact-tile > a { border-bottom: 1px solid var(--studio-border); }

@media (min-width: 1024px) {
    .roles-tile { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 2rem; }
    .roles-tile .tile-heading { grid-column: 1 / -1; }
    .studio-role { margin-top: 1rem; }
}
@media (max-width: 1199px) {
    .studio-role { flex-direction: column; }
    .studio-role > div:last-child { flex-direction: row; text-align: left; gap: 1rem; }
    .intro-tile { padding: 1.75rem; }
    .intro-tile h1 { font-size: 2.75rem; }
    .intro-copy { font-size: 1.0625rem; }
}
@media (min-width: 640px) and (max-width: 1023px) {
    .intro-tile { grid-column: 1 / -1; grid-row: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem 2rem; padding: var(--card-padding); }
    .intro-tile .studio-label { grid-column: 1; }
    .intro-tile h1 { grid-column: 1; margin: 0; align-self: start; }
    .intro-copy { grid-column: 2; grid-row: 1 / span 3; align-self: center; }
    .intro-foot { grid-column: 1; margin: 0; padding-top: 1rem; }
    .lead-tile { grid-column: 1 / -1; }
    .lead-tile .studio-window img { aspect-ratio: 2.2; }
    .work-tile:not(.lead-tile), .approach-tile, .roles-tile, .writing-tile, .contact-tile { grid-column: span 6; }
    .work-stage { padding: 1rem 1.25rem 0; }
    .approach-tile, .roles-tile, .writing-tile, .contact-tile { padding: 1.5rem; }
    .contact-tile h2 { font-size: 2.25rem; }
}
@media (max-width: 639px) {
    .studio-topline { font-size: .75rem; align-items: baseline; }
    .studio-topline > span:last-child { max-width: 145px; text-align: right; }
    .studio-grid { grid-template-columns: minmax(0, 1fr); gap: .75rem; }
    .studio-grid > .studio-tile { grid-column: 1; grid-row: auto; border-radius: var(--radius-card); }
    .intro-tile { padding: 1.5rem; }
    .intro-tile h1 { font-size: clamp(2.25rem, 9vw, 3rem); margin: 1rem 0; }
    .intro-copy { font-size: 1rem; line-height: 1.65; }
    .intro-foot { padding-top: 1.25rem; }
    .intro-foot p { margin-bottom: .5rem; }
    .work-stage { padding: 1rem 1.25rem 0; }
    .lead-tile .work-stage { padding: 1rem 1.25rem 0; }
    .lead-tile .studio-window img { aspect-ratio: 1.6; }
    .work-meta { padding: .75rem 1.25rem 0; }
    .work-caption { padding: var(--card-content-padding); }
    .approach-tile, .roles-tile, .writing-tile, .contact-tile { padding: var(--card-padding); }
    .tile-heading { align-items: flex-start; }
    .tile-heading h2 { font-size: 1.25rem; }
    .contact-tile h2 { margin-top: 1.5rem; }
}
@media (hover: hover) and (pointer: fine) { .work-link:hover .studio-window { transform: perspective(800px) translateY(-4px) rotateX(2deg) rotateY(-2deg) scale(1.015); } }
@media (prefers-reduced-motion: reduce) { .studio-tile { animation: none; } .studio-home * { transition: none !important; } .studio-window, .work-link:hover .studio-window, .work-link:focus-visible .studio-window, .round-arrow { transform: none !important; } }

</style>
