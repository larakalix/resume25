<script setup lang="ts">
import type {PhotoOptions} from '~/experience/globe/photo'
const options=defineModel<PhotoOptions>('options',{required:true})
const {busy,error,status}=defineProps<{busy:boolean;error:string;status:string}>()
const emit=defineEmits<{capture:[];close:[]}>()
const poses=[{label:'Just me',value:'idle'},{label:'Say hello',value:'wave'},{label:'A little crouch',value:'crouch'}]
const lights=[{label:'Current light',value:'current'},{label:'Daylight',value:'day'},{label:'After dark',value:'night'}]
</script>
<template>
 <section class="photo-studio" aria-label="Postcard photo mode" @keydown.esc="!$event.defaultPrevented&&emit('close')">
  <div class="photo-heading"><div><h2>A postcard from your little world.</h2><p>Drag to frame · Wheel or pinch to zoom · R to recenter</p></div><button type="button" class="photo-close" aria-label="Close photo mode" @click="emit('close')"><UIcon name="i-mdi-close" /></button></div>
  <div class="photo-toolbar world-surface"><div class="photo-fields"><label>Pose<USelect v-model="options.pose" :items="poses" aria-label="Photo pose" trailing-icon="i-mdi-chevron-down" selected-icon="i-mdi-check" :disabled="busy" :ui="{base:'rounded-full min-h-11 w-full',content:'world-surface',item:'min-h-11'}" /></label><label>Lighting<USelect v-model="options.light" :items="lights" aria-label="Photo lighting" trailing-icon="i-mdi-chevron-down" selected-icon="i-mdi-check" :disabled="busy" :ui="{base:'rounded-full min-h-11 w-full',content:'world-surface',item:'min-h-11'}" /></label></div><div class="photo-actions"><UCheckbox v-model="options.branding" label="Postcard caption" icon="i-mdi-check" :disabled="busy" :ui="{root:'min-h-11 items-center',base:'min-h-0 size-5'}" /><UButton color="neutral" class="photo-save" loading-icon="i-mdi-loading" :loading="busy" :disabled="busy" @click="emit('capture')">{{ busy?'Saving your postcard…':'Save postcard' }}</UButton></div><p v-if="error||status" class="photo-status" role="status">{{ error||status }}</p><p v-else class="photo-status">The world is holding still. Your picture stays on this device.</p></div>
 </section>
</template>
<style scoped>
.photo-studio { position:absolute; inset:0; z-index:9; pointer-events:none; color:var(--world-ink); }
.photo-heading { position:absolute; top:var(--world-edge); left:var(--world-edge); right:var(--world-edge); display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; }
.photo-heading>div { background:var(--world-paper); border:1px solid var(--world-line); border-radius:22px; padding:.85rem 1.1rem; }
h2 { font-size:1.05rem; font-weight:650; letter-spacing:-.025em; } p { font-size:.75rem; line-height:1.6; color:var(--world-muted); margin-top:.25rem; }
.photo-close { display:grid; place-items:center; width:46px; height:46px; flex:none; pointer-events:auto; border-radius:50%; background:var(--world-paper); border:1px solid var(--world-line); }
.photo-toolbar { position:absolute; bottom:var(--world-bottom); left:50%; transform:translateX(-50%); width:min(640px,calc(100% - 2 * var(--world-edge))); background:var(--world-paper); border:1px solid var(--world-line); border-radius:26px; padding:1rem 1.2rem; pointer-events:auto; box-shadow:0 5px 30px #263f3820; }
.photo-fields { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }.photo-fields label { display:grid; gap:.3rem; font-size:.875rem; }
.photo-actions { display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-top:1rem; }.photo-save { border-radius:999px; min-height:44px; padding-inline:1.25rem; }
.photo-status { min-height:1.4em; margin-top:.6rem; }
@media (max-width:639px) { .photo-heading>div { max-width:calc(100% - 54px); padding:.75rem; }.photo-heading h2 { font-size:.9375rem; }.photo-heading p { font-size:.6875rem; }.photo-toolbar { padding:.85rem; }.photo-fields { gap:.6rem; }.photo-actions { gap:.6rem; }.photo-save { padding-inline:.9rem; } }
@media (max-height:560px) { .photo-heading>div { padding:.5rem .8rem; }.photo-heading p { display:none; }.photo-toolbar { left:auto; right:var(--world-edge); transform:none; width:320px; bottom:var(--world-bottom); }.photo-status { font-size:.6875rem; line-height:1.4; } }
</style>
