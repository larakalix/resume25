<script setup lang="ts">
import {useElementSize} from '@vueuse/core'
import type {ResidentGreeting} from '~/experience/globe/types'
import type {TalkView} from '~/experience/globe/talk-view'

const {greeting,view,calm=false}=defineProps<{greeting:ResidentGreeting;view:TalkView|null;calm?:boolean}>()
const surface=useTemplateRef<HTMLElement>('surface'),bubble=useTemplateRef<HTMLElement>('bubble')
const {width,height}=useElementSize(surface),{height:bubbleHeight}=useElementSize(bubble)
const placement=computed(()=>{
 const w=width.value||375,h=height.value||812,bw=Math.min(300,w-32),anchor=view?.speaker??{x:65,y:50}
 const left=Math.max(16,Math.min(w-bw-16,anchor.x/100*w-bw/2))
 const top=Math.max(116,Math.min(h-220-(bubbleHeight.value||114),anchor.y/100*h-(bubbleHeight.value||114)-18))
 return{width:`${bw}px`,transform:`translate3d(${left}px,${top}px,0)`, '--tail':`${Math.max(24,Math.min(bw-24,anchor.x/100*w-left))}px`}
})
</script>

<template>
 <div ref="surface" class="resident-greeting" :data-calm="calm">
  <div v-show="view?.speaker.visible" ref="bubble" class="resident-bubble" :style="placement">
   <span class="resident-name">Ivan <span aria-hidden="true">·</span> A little dev hello</span>
   <p role="status" aria-live="polite" aria-atomic="true">{{ greeting.text }}</p>
   <span class="resident-tail" aria-hidden="true" />
  </div>
 </div>
</template>

<style scoped>
.resident-greeting { position:absolute; z-index:4; inset:0; pointer-events:none; }
.resident-bubble { position:absolute; top:0; left:0; border:1px solid var(--world-line); border-radius:22px; background:var(--world-paper); color:var(--world-ink); padding:.85rem 1rem; box-shadow:0 5px 20px #153b2d18; transition:transform 100ms linear; }
.resident-name { display:block; margin-bottom:.35rem; font-size:.6875rem; font-weight:600; color:var(--world-muted); }
.resident-name>span { margin-inline:.3rem; }
.resident-bubble p { font-size:.875rem; line-height:1.6; overflow-wrap:anywhere; }
.resident-tail { position:absolute; left:var(--tail); bottom:-7px; width:13px; height:13px; transform:translateX(-50%) rotate(45deg); background:var(--world-paper); border-right:1px solid var(--world-line); border-bottom:1px solid var(--world-line); }
.resident-greeting[data-calm=true] .resident-bubble { transition:none; }
@media (prefers-reduced-motion:reduce) { .resident-bubble { transition:none; } }
</style>
