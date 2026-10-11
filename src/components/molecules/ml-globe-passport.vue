<script setup lang="ts">
import type {Profile,Resume,RoleSummary} from '~/domain/content/models'
import type {Target} from '~/experience/globe/types'
import {activityDefinitions,passportEntries,trailDefinitions} from '~/experience/globe/passport'
import type {PassportEntry,PassportSnapshot,TrailId} from '~/experience/globe/passport'
const {snapshot,targets,profile,roles,skillGroups}=defineProps<{snapshot:PassportSnapshot;targets:readonly Target[];profile:Profile;roles:readonly RoleSummary[];skillGroups:Resume['skillGroups']}>()
const emit=defineEmits<{track:[id:TrailId|null];travel:[id:string];close:[]}>()
const filter=ref('all')
const filters=[{id:'all',label:'All stamps'},{id:'place',label:'Places'},{id:'person',label:'People'},{id:'activity',label:'Little moments'},{id:'secret',label:'Surprises'}]
const earned=computed(()=>new Set([...snapshot.discovered,...snapshot.activities,...snapshot.secrets]))
const entries=computed(()=>passportEntries(targets,profile,roles,skillGroups,{worldId:snapshot.worldId}).filter(entry=>filter.value==='all'||entry.kind===filter.value).sort((a,b)=>Number(earned.value.has(b.id))-Number(earned.value.has(a.id))||a.title.localeCompare(b.title)))
function progress(requirements:readonly string[]){return requirements.filter(id=>snapshot.activities.includes(id as typeof snapshot.activities[number])).length}
function travelTo(entry:PassportEntry){
 const hints:Record<string,string>={'secret-arcade':'arcade-door','secret-tideglass':'tide-cave-door','secret-cloudtop':snapshot.worldId==='archipelago'?'star-garden':'south-garden'}
 emit('travel',entry.kind==='secret'&&!earned.value.has(entry.id)?hints[entry.id]??entry.targetId:entry.targetId)
}
</script>
<template>
 <div class="world-passport">
  <div class="passport-intro"><div class="passport-seal" aria-hidden="true"><span /></div><div><p class="passport-eyebrow">A little record of your visit</p><h3>{{ snapshot.earned }} <span>/ {{ snapshot.total }} stamps</span></h3><p>{{ snapshot.storage==='local'?'Your stamps stay on this device.':'Your stamps are available for this visit.' }} Explore in any order.</p></div></div>
  <section aria-labelledby="passport-trails"><div class="passport-section-heading"><h3 id="passport-trails">Take the scenic route.</h3><span>Two optional little adventures</span></div>
   <div class="passport-trails"><article v-for="trail in trailDefinitions" :key="trail.id" :class="{tracked:snapshot.trackedTrail===trail.id,finished:snapshot.completedTrails.includes(trail.id)}"><div class="trail-heading"><h4>{{ trail.title }}</h4><span>{{ progress(trail.requirements) }} / {{ trail.requirements.length }}</span></div><p>{{ trail.description }}</p><ul><li v-for="requirement in trail.requirements" :key="requirement"><UIcon v-if="snapshot.activities.includes(requirement)" name="i-mdi-check" aria-hidden="true" /><span v-else class="trail-dot" aria-hidden="true" /><span>{{ activityDefinitions.find(activity=>activity.id===requirement)?.title }}</span><span v-if="snapshot.activities.includes(requirement)" class="sr-only">completed</span></li></ul><UButton color="neutral" :variant="snapshot.trackedTrail===trail.id?'solid':'outline'" :disabled="snapshot.completedTrails.includes(trail.id)" @click="emit('track',snapshot.trackedTrail===trail.id?null:trail.id)">{{ snapshot.completedTrails.includes(trail.id)?'Trail complete':snapshot.trackedTrail===trail.id?'Stop guiding':'Follow this trail' }}</UButton></article></div>
   <p class="passport-note">Checkpoints count in any order. Follow the firefly, ask someone a question, or simply wander. Every portfolio page is available without collecting stamps.</p>
  </section>
  <section aria-labelledby="passport-stamps"><div class="passport-section-heading"><h3 id="passport-stamps">Your little collection.</h3><span role="status" aria-live="polite">{{ entries.length }} {{ entries.length===1?'entry':'entries' }}</span></div><div class="passport-filters" aria-label="Filter passport entries"><button v-for="item in filters" :key="item.id" type="button" :aria-pressed="filter===item.id" @click="filter=item.id">{{ item.label }}</button></div>
   <div class="passport-stamps"><article v-for="entry in entries" :key="`${entry.kind}-${entry.id}`" :data-earned="earned.has(entry.id)"><div class="stamp-symbol" aria-hidden="true"><UIcon v-if="earned.has(entry.id)" name="i-mdi-check" /><span v-else /></div><p class="stamp-kind">{{ entry.kind==='secret'?'Hidden surprise':entry.kind==='activity'?'Little moment':entry.kind==='person'?'An encounter':'A place to remember' }}</p><h4>{{ entry.title }}</h4><span class="stamp-state">{{ earned.has(entry.id)?'Collected':'Waiting to be found' }}</span><details v-if="earned.has(entry.id)&&entry.detail.length>160"><summary>Read your note</summary><p>{{ entry.detail }}</p></details><p v-else class="stamp-detail">{{ entry.kind==='secret'||earned.has(entry.id)?entry.detail:entry.kind==='person'?'Stop by for a conversation.':entry.kind==='activity'?entry.detail:'A little corner of the world, ready to explore.' }}</p><button type="button" class="stamp-travel" @click="travelTo(entry)">{{ entry.kind==='secret'&&!earned.has(entry.id)?'Explore nearby':'Take me there' }}<AtMotionArrow /></button></article></div>
  </section>
  <nav class="passport-links" aria-label="Explore Ivan’s work"><NuxtLink to="/resume" @click="emit('close')">The full experience<AtMotionArrow /></NuxtLink><NuxtLink to="/projects" @click="emit('close')">Explore projects<AtMotionArrow /></NuxtLink><NuxtLink to="/contact" @click="emit('close')">Say hello<AtMotionArrow /></NuxtLink></nav>
 </div>
</template>
<style scoped>
.world-passport { color:var(--world-ink); }
.passport-intro { display:flex; align-items:center; gap:1rem; padding:1.25rem; border:1px solid var(--world-line); border-radius:22px; background:var(--world-soft); }
.passport-seal { flex:none; position:relative; width:68px; height:68px; border:2px solid var(--world-blue); border-radius:50%; transform:rotate(-12deg); display:grid; place-items:center; }
.passport-seal::before,.passport-seal::after { content:''; position:absolute; border:1px solid var(--world-blue); border-radius:50%; inset:6px; opacity:.5; }
.passport-seal::after { inset:17px 6px; }
.passport-seal span { width:22px; height:35px; border:2px solid var(--world-blue); border-radius:50%; }
.passport-eyebrow { text-transform:uppercase; letter-spacing:.08em; font-size:.6875rem; color:var(--world-muted); }
.passport-intro h3 { font-size:2rem; font-weight:650; letter-spacing:-.04em; line-height:1.2; margin-block:.25rem; }
.passport-intro h3 span { font-size:.875rem; font-weight:400; letter-spacing:0; color:var(--world-muted); }
.passport-intro p:last-child,.passport-note { font-size:.8125rem; line-height:1.7; color:var(--world-muted); }
.passport-section-heading { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:baseline; gap:.5rem; margin:1.75rem 0 .85rem; }
.passport-section-heading h3 { font-size:1.1rem; font-weight:650; letter-spacing:-.025em; }
.passport-section-heading>span { font-size:.75rem; color:var(--world-muted); }
.passport-trails { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.8rem; }
.passport-trails article { display:flex; flex-direction:column; gap:.75rem; padding:1rem; border:1px solid var(--world-line); border-radius:20px; background:var(--world-paper); }
.passport-trails article.tracked { border-color:var(--world-blue); box-shadow:inset 0 0 0 1px var(--world-blue); }
.trail-heading { display:flex; gap:.5rem; justify-content:space-between; align-items:baseline; }
.trail-heading h4 { font-size:1rem; font-weight:600; }.trail-heading>span { font-size:.75rem; white-space:nowrap; color:var(--world-muted); }
.passport-trails article>p { color:var(--world-muted); font-size:.8125rem; line-height:1.65; }
.passport-trails ul { display:grid; gap:.5rem; margin-bottom:.25rem; }.passport-trails li { display:flex; align-items:center; gap:.55rem; font-size:.8125rem; }
.passport-trails li .iconify { color:var(--world-blue); width:16px; height:16px; flex:none; }.trail-dot { width:12px; height:12px; border:1px solid var(--world-line); border-radius:50%; margin-inline:2px; flex:none; }
.passport-trails :deep(button) { border-radius:999px; min-height:44px; justify-content:center; margin-top:auto; }
.passport-note { margin-top:.9rem; }
.passport-filters { display:flex; flex-wrap:wrap; gap:.45rem; margin-bottom:1rem; }
.passport-filters button { min-height:44px; padding:.5rem .85rem; border:1px solid var(--world-line); border-radius:999px; font-size:.75rem; cursor:pointer; }
.passport-filters button[aria-pressed=true] { background:var(--world-blue); color:var(--world-paper); border-color:var(--world-blue); }
.passport-stamps { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.75rem; }
.passport-stamps article { display:flex; flex-direction:column; align-items:flex-start; min-width:0; padding:1rem; border:1px dashed var(--world-line); border-radius:20px; }
.passport-stamps article[data-earned=true] { border-style:solid; background:var(--world-soft); }
.stamp-symbol { display:grid; place-items:center; width:35px; height:35px; border:1px solid var(--world-line); border-radius:50%; margin-bottom:.75rem; color:var(--world-blue); }
.stamp-symbol>span { width:10px; height:10px; border:1px solid var(--world-muted); border-radius:50%; }.stamp-kind { color:var(--world-muted); font-size:.625rem; text-transform:uppercase; letter-spacing:.05em; }
.passport-stamps h4 { font-size:.9375rem; font-weight:600; line-height:1.4; margin-top:.35rem; overflow-wrap:anywhere; }
.stamp-state { color:var(--world-muted); font-size:.6875rem; margin-block:.3rem .6rem; }
.stamp-detail,.passport-stamps details { font-size:.8125rem; line-height:1.7; color:var(--world-muted); overflow-wrap:anywhere; }
.passport-stamps summary { display:flex; align-items:center; min-height:44px; cursor:pointer; color:var(--world-blue); }.passport-stamps details p { margin-bottom:.5rem; }
.stamp-travel { display:flex; align-items:center; justify-content:space-between; gap:.5rem; width:100%; min-height:44px; margin-top:auto; padding-top:.7rem; font-size:.75rem; color:var(--world-blue); cursor:pointer; }
.passport-links { display:flex; flex-wrap:wrap; gap:1rem; border-top:1px solid var(--world-line); margin-top:1.5rem; padding-top:.8rem; }
.passport-links a { display:flex; align-items:center; gap:.75rem; min-height:44px; font-size:.8125rem; color:var(--world-blue); }
.world-passport :is(button,a,summary):focus-visible { outline:3px solid var(--world-blue); outline-offset:3px; }
@media (max-width:639px) { .passport-trails { grid-template-columns:1fr; }.passport-stamps { grid-template-columns:repeat(2,minmax(0,1fr)); }.passport-intro { padding:1rem; gap:.75rem; }.passport-seal { width:52px; height:52px; }.passport-seal span { height:27px; width:17px; }.passport-intro h3 { font-size:1.75rem; }.passport-stamps article { padding:.85rem; } }
@media (max-width:359px) { .passport-stamps { grid-template-columns:1fr; } }
</style>
