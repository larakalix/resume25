<script setup lang="ts">
import type {Profile,Resume,RoleSummary} from '~/domain/content/models'
import type {Target} from '~/experience/globe/types'
import {dialogueFor} from '~/experience/globe/conversation'
import {copyEmail} from '~/utils/copy-email'
const {target,profile,roles,skillGroups}=defineProps<{target:Target;profile:Profile;roles:RoleSummary[];skillGroups:Resume['skillGroups']}>()
const emit=defineEmits<{action:[action:string]}>(),node=ref('start'),feedback=ref(''),copying=ref(false),posthog=usePostHog()
const responseTitle=useTemplateRef<HTMLElement>('responseTitle')
const dialogue=computed(()=>dialogueFor(target,node.value,profile,roles,skillGroups))
watch(()=>target.id,()=>{node.value='start';feedback.value=''})
async function choose(next:string){node.value=next;feedback.value='';await nextTick();responseTitle.value?.focus({preventScroll:true})}
function track(href:string){if(href.startsWith('mailto:'))posthog?.capture('contact_link_clicked',{link_name:'Email',link_type:'email'})}
async function copy(){copying.value=true;feedback.value=await copyEmail(profile.email,navigator.clipboard?.writeText.bind(navigator.clipboard));copying.value=false}
</script>
<template>
 <div class="conversation">
  <p class="conversation-eyebrow">{{ dialogue.fictional?'A meadow conversation':target.topic==='animal'?'A new friend':'A little discovery' }}</p>
  <h2 ref="responseTitle" tabindex="-1">{{ dialogue.speaker }}</h2>
  <div class="conversation-response" aria-live="polite" aria-atomic="true"><p>{{ dialogue.text }}</p><p v-if="dialogue.detail" class="conversation-detail">{{ dialogue.detail }}</p></div>
  <div class="conversation-choices" aria-label="Your reply">
   <template v-for="(reply,index) in dialogue.choices" :key="`${target.id}-${index}`">
    <NuxtLink v-if="reply.href" :to="reply.href" @click="track(reply.href)">{{ reply.label }}<AtMotionArrow /></NuxtLink>
    <button v-else type="button" @click="reply.action?emit('action',reply.action):choose(reply.node!)">{{ reply.label }}<span aria-hidden="true">{{ reply.action?'✦':'↳' }}</span></button>
   </template>
   <button v-if="node==='contact'||target.topic==='contact'" type="button" :disabled="copying" @click="copy">{{ feedback.startsWith('Email copied.')?'Copied':'Copy email' }}<UIcon name="i-mdi-content-copy" aria-hidden="true" /></button>
  </div>
  <p v-if="feedback" class="conversation-feedback" role="status">{{ feedback }}</p>
  <p v-if="dialogue.fictional" class="conversation-note">Fictional villagers. Ivan’s published experience and skills.</p>
 </div>
</template>
<style scoped>
.conversation-eyebrow { font-size:.6875rem; letter-spacing:.1em; text-transform:uppercase; color:var(--world-muted); margin-bottom:.45rem; }
h2 { padding-right:2.6rem; font-family:'Bricolage Grotesque',sans-serif; font-size:2rem; line-height:1.2; letter-spacing:-.035em; font-weight:650; }
.conversation-response { margin-block:1.25rem; }
.conversation-response p { font-size:1rem; line-height:1.75; color:var(--world-ink); }
.conversation-response .conversation-detail { margin-top:1rem; color:var(--world-muted); font-size:.9375rem; white-space:pre-line; overflow-wrap:anywhere; }
.conversation-choices { display:grid; gap:.5rem; }
.conversation-choices :is(button,a) { display:flex; align-items:center; justify-content:space-between; gap:1rem; min-height:46px; width:100%; text-align:left; padding:.65rem .85rem; border:1px solid var(--world-line); border-radius:16px; font-size:.875rem; line-height:1.5; background:var(--world-soft); cursor:pointer; }
.conversation-choices span { font-size:1.1rem; color:var(--world-blue); }
.conversation-note,.conversation-feedback { margin-top:1rem; color:var(--world-muted); font-size:.6875rem; line-height:1.6; }
.conversation-feedback { font-size:.8125rem; }
@media (hover:hover) { .conversation-choices :is(button,a):hover { border-color:var(--world-blue); color:var(--world-blue); } }
</style>
