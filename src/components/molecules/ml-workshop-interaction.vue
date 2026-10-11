<script setup lang="ts">
import type {WorkshopState} from '~/experience/globe/workshop'
import {workshopTasks} from '~/experience/globe/workshop'
const {state}=defineProps<{state:WorkshopState}>()
const emit=defineEmits<{action:[value:string]}>(),title=useTemplateRef<HTMLElement>('title')
const stages=[{title:'A messy little idea.',body:'What if a big goal felt like a few clear, small steps? Let’s make a tiny planner.',action:'shape',label:'Sketch the flow'},{title:'Give it a clear shape.',body:'Start with what someone needs to do. Keep the useful pieces and give them a simple order.',action:'connect',label:'Connect the pieces'},{title:'Make the pieces work together.',body:'The interface, logic and data are connected. Now let’s see how the whole thing feels.',action:'preview',label:'Give it a try'},{title:'An idea, made useful.',body:'Your tiny planner works. Try checking a step and watch the workbench respond.',action:'replay',label:'Make another little thing'}]
const current=computed(()=>stages[state.stage]!),done=computed(()=>state.checked.every(Boolean))
watch(()=>state.stage,async()=>{await nextTick();title.value?.focus({preventScroll:true})})
</script>
<template>
 <div class="workshop-toy"><p class="toy-eyebrow">The idea workshop · {{ state.stage+1 }} / 4</p><h2 ref="title" tabindex="-1">{{ current.title }}</h2><p>{{ current.body }}</p>
  <ol class="toy-progress" aria-label="Idea to product"><li v-for="(label,index) in ['Idea','Shape','Connect','Try']" :key="label" :aria-current="index===state.stage?'step':undefined" :class="{complete:index<state.stage}">{{ label }}</li></ol>
  <div v-if="state.stage===3" class="toy-planner"><div class="toy-planner-heading"><span>One small step</span><span>{{ state.checked.filter(Boolean).length }} / 3</span></div><UCheckbox v-for="(task,index) in workshopTasks" :key="task" variant="card" icon="i-mdi-check" :label="task" :model-value="state.checked[index]" :ui="{root:'min-h-11 items-center ring-0 p-2 gap-2',label:'text-sm'}" @update:model-value="emit('action',`task-${index}`)" /><p v-if="done" class="toy-success" role="status">From a messy idea to something useful. That’s the work I love.</p></div>
  <UButton class="toy-action" color="neutral" :variant="state.stage===3?'outline':'solid'" @click="emit('action',current.action)">{{ current.label }}<AtMotionArrow /></UButton>
  <p class="toy-note">A playful illustration of how I build. Your progress stays in this visit.</p><NuxtLink to="/resume" class="toy-link">The experience behind the work <AtMotionArrow /></NuxtLink><NuxtLink to="/contact" class="toy-link">Have an idea of your own? <AtMotionArrow /></NuxtLink>
 </div>
</template>
<style scoped>
.toy-eyebrow { font-size:.6875rem; letter-spacing:.08em; text-transform:uppercase; color:var(--world-muted); margin-bottom:.6rem; }
h2 { font-family:'Bricolage Grotesque',sans-serif; font-weight:650; font-size:1.9rem; line-height:1.1; letter-spacing:-.035em; padding-right:2rem; }
.workshop-toy>p:not(.toy-eyebrow) { margin-top:1rem; line-height:1.7; font-size:.9375rem; color:var(--world-muted); }
.toy-progress { display:flex; gap:.3rem; margin-block:1.4rem; }
.toy-progress li { flex:1; font-size:.6875rem; border-top:3px solid var(--world-line); padding-top:.5rem; color:var(--world-muted); }
.toy-progress :is([aria-current],.complete) { border-color:var(--world-blue); color:var(--world-blue); }
.workshop-toy :deep(.toy-action) { min-height:46px; border-radius:999px; width:100%; display:flex; justify-content:space-between; margin-block:1rem; }
.toy-planner { border:1px solid var(--world-line); background:var(--world-soft); border-radius:20px; padding:1rem; }
.toy-planner :deep([role="checkbox"]) { min-height:20px; width:20px; height:20px; border-radius:6px; }
.toy-planner-heading { display:flex; justify-content:space-between; gap:1rem; font-size:.8125rem; font-weight:650; margin-bottom:.5rem; }
.toy-success { margin-top:.7rem; font-size:.8125rem; line-height:1.7; color:var(--world-blue); }
.workshop-toy .toy-note { font-size:.6875rem; }
.toy-link { display:flex; align-items:center; justify-content:space-between; min-height:44px; font-size:.8125rem; color:var(--world-blue); gap:1rem; }
</style>
