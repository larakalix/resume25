<script setup lang="ts">
const open=defineModel<boolean>('open',{required:true})
const {title,description,calm=false}=defineProps<{title:string;description:string;calm?:boolean}>()
const emit=defineEmits<{closed:[]}>(),heading=useTemplateRef<HTMLElement>('heading')
let closedObserver:MutationObserver|undefined
function afterLeave(){
 closedObserver?.disconnect()
 const finish=()=>{closedObserver?.disconnect();closedObserver=undefined;emit('closed')}
 if(!document.querySelector('.world-dialog-overlay')){finish();return}
 // Overlay and content have separate Presence lifetimes. Restore body ownership
 // only after the backdrop has released its own scroll lock.
 closedObserver=new MutationObserver(()=>{if(!document.querySelector('.world-dialog-overlay'))finish()})
 closedObserver.observe(document.body,{childList:true,subtree:true})
}
onBeforeUnmount(()=>closedObserver?.disconnect())
function focusTitle(event:Event){event.preventDefault();void nextTick(()=>heading.value?.focus({preventScroll:true}))}
</script>
<template>
 <UModal v-model:open="open" :title :description :transition="!calm" close-icon="i-mdi-close" :close="{size:'lg',color:'neutral',variant:'ghost'}" :content="{onOpenAutoFocus:focusTitle}" :ui="{overlay:'world-dialog-overlay bg-slate-950/25 backdrop-blur-sm',content:'world-surface world-dialog w-[calc(100%_-_32px)] sm:max-w-[800px] rounded-[28px] max-h-[calc(100dvh_-_32px)] flex flex-col overflow-hidden',header:'shrink-0 p-5 sm:px-7 sm:pt-7 border-b border-[var(--world-line)]',body:'min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7',title:'text-xl sm:text-2xl tracking-tight font-semibold',description:'text-sm mt-1',close:'rounded-full top-4 right-4 min-w-11 min-h-11'}" @after:leave="afterLeave">
  <template #title><span ref="heading" tabindex="-1">{{ title }}</span></template>
  <template #body><slot /></template>
 </UModal>
</template>
<style>
.world-dialog { background:var(--world-paper); color:var(--world-ink); border:1px solid var(--world-line); box-shadow:0 20px 80px #172b3930; }
.world-dialog :focus-visible { outline:3px solid var(--world-blue); outline-offset:3px; }
.world-dialog [tabindex="-1"]:focus { outline:none; }
.world-dialog [data-slot="description"] { color:var(--world-muted); }
@media (prefers-reduced-motion:reduce) { .world-dialog,.world-dialog+* { animation:none!important; transition:none!important; } }
</style>
