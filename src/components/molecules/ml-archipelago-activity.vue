<script setup lang="ts">
import type {Target} from '~/experience/globe/types'
import {createDelivery,deliveryStops,ferryStops} from '~/experience/archipelago/activities'
import type {DeliverySnapshot,FerrySnapshot} from '~/experience/archipelago/activities'
const {target,delivery,ferry,paused=false}=defineProps<{target:Target;delivery?:DeliverySnapshot;ferry?:FerrySnapshot;paused?:boolean}>()
const emit=defineEmits<{action:[value:string]}>()
const emptyDelivery=createDelivery().snapshot()
const parcel=computed(()=>delivery??emptyDelivery),stop=computed(()=>deliveryStops.find(item=>item.targetId===target.id)),landing=computed(()=>ferryStops.find(item=>item.targetId===target.id))
const currentStop=computed(()=>deliveryStops[parcel.value.step]),canDeliver=computed(()=>parcel.value.nextTargetId===target.id&&parcel.value.phase!=='complete')
</script>
<template>
 <section class="island-activity" :aria-label="stop?'A special delivery':'Island ferry'">
  <template v-if="stop">
   <p class="activity-eyebrow">One small favor</p><h2>{{ parcel.phase==='complete'?'A special delivery.':stop.title }}</h2>
   <p v-if="parcel.phase==='complete'">The parcel is safely at the harbor. Thanks for taking the scenic route — there is a little stamp in your passport to remember it.</p>
   <p v-else-if="canDeliver&&parcel.step===0">Hey, heading into town? This little parcel needs a stamp at the market, then a handoff at the harbor. Take it along if you like. There is no rush.</p>
   <p v-else-if="canDeliver&&parcel.step===1">Ah, the workshop parcel! Let’s put the market stamp on it. The harbor desk is its next stop.</p>
   <p v-else-if="canDeliver">Right on time. The harbor desk has been expecting that little parcel. Ready to hand it over?</p>
   <p v-else>{{ parcel.phase==='ready'?'There is a little parcel waiting at the workshop. Pick it up whenever you fancy a stroll.':`Still carrying the parcel? ${parcel.step===1?'The market stall has the stamp it needs.':'The harbor desk is ready for the handoff.'}` }}</p>
   <ol class="delivery-stops" aria-label="Parcel route"><li v-for="(item,index) in deliveryStops" :key="item.targetId" :data-complete="index<parcel.step" :aria-current="index===parcel.step?'step':undefined"><span aria-hidden="true">{{ index<parcel.step?'✓':index+1 }}</span>{{ item.title }}</li></ol>
   <UButton v-if="canDeliver" color="neutral" variant="solid" :disabled="paused" @click="emit('action',stop.action)">{{ stop.prompt }}<AtMotionArrow /></UButton>
   <UButton v-else-if="currentStop" color="neutral" variant="outline" :disabled="paused" @click="emit('action',`travel:${currentStop.targetId}`)">{{ parcel.phase==='ready'?'Find the workshop parcel':'Visit the next stop' }}<AtMotionArrow /></UButton>
   <p class="activity-note">An optional little errand. Your work and resume are always one click away.</p>
  </template>
  <template v-else-if="landing">
   <p class="activity-eyebrow">Take the water route</p><h2>{{ landing.id==='harbor'?'Next stop, the orchard.':'Back to the harbor.' }}</h2><p>{{ landing.id==='harbor'?'Quiet lanes, fruit trees, and a little room to wander. The ferry is an easy way over.':'Ready for a little more town life? Hop aboard for the harbor, market, and all the people you have yet to meet.' }}</p>
   <div class="ferry-route"><span>{{ landing.name }}</span><AtMotionArrow /><span>{{ landing.id==='harbor'?'Orchard landing':'Harbor landing' }}</span></div>
   <UButton color="neutral" variant="solid" :disabled="paused||ferry?.phase==='sailing'" @click="emit('action','board')">Hop aboard<AtMotionArrow /></UButton><p class="activity-note">Enjoy a short crossing, or skip the ride whenever you like. Reduced motion takes you straight there.</p>
  </template>
 </section>
</template>
<style scoped>
.island-activity { display:grid; gap:1rem; color:var(--world-ink); }
.activity-eyebrow { color:var(--world-muted); text-transform:uppercase; letter-spacing:.08em; font-size:.625rem; }
.island-activity h2 { font-family:'Bricolage Grotesque',sans-serif; font-size:1.65rem; font-weight:650; letter-spacing:-.035em; line-height:1.2; }
.island-activity>p:not(.activity-eyebrow) { font-size:.875rem; line-height:1.75; }
.island-activity .activity-note { font-size:.6875rem; color:var(--world-muted); }
.island-activity :deep(button) { min-height:44px; display:flex; justify-content:space-between; gap:1rem; border-radius:999px; padding:.7rem 1rem; }
.delivery-stops { display:grid; gap:.65rem; font-size:.8125rem; }
.delivery-stops li { display:flex; gap:.6rem; align-items:center; color:var(--world-muted); }
.delivery-stops li>span { flex:none; display:grid; place-items:center; width:25px; height:25px; border-radius:50%; border:1px solid var(--world-line); font-size:.6875rem; }
.delivery-stops li[aria-current=step] { color:var(--world-ink); font-weight:600; }.delivery-stops li[data-complete=true]>span { color:var(--world-paper); background:var(--world-blue); border-color:var(--world-blue); }
.ferry-route { display:flex; align-items:center; justify-content:space-between; gap:.75rem; padding:1rem 0; border-block:1px solid var(--world-line); font-size:.8125rem; }.ferry-route span { flex:1; }.ferry-route span:last-child { text-align:right; }
</style>
