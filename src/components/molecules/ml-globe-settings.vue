<script setup lang="ts">
import type {RuntimeState} from '~/experience/globe/types'
import type {TimeMode} from '~/experience/explorer/types'
import type {QualityChoice} from '~/experience/globe/quality'
import {qualityChoices} from '~/experience/globe/quality'
import {hatChoices} from '~/experience/explorer/seasonal-hats'
import type {HatChoice} from '~/experience/explorer/seasonal-hats'
import {weatherChoices,type WeatherChoice} from '~/experience/globe/weather'
const {runtime,ready,paused,time,soundBusy,v2=false,world='legacy'}=defineProps<{runtime:RuntimeState;ready:boolean;paused:boolean;time:TimeMode;soundBusy:boolean;v2?:boolean;world?:'legacy'|'archipelago'}>()
const hat=defineModel<HatChoice>('hat',{required:true}),calm=defineModel<boolean>('calm',{required:true})
const weather=defineModel<WeatherChoice>('weather',{default:'auto'})
const emit=defineEmits<{sound:[];pause:[];lighting:[];overview:[];reset:[];quality:[choice:QualityChoice];measure:[];photo:[]}>()
const graphics=computed<QualityChoice>({get:()=>runtime.quality.choice,set:value=>emit('quality',value)})
const wardrobe=computed(()=>hatChoices.map(item=>({...item,label:item.value==='everyday'?(world==='archipelago'?'Everyday · explorer cap':'Everyday · no hat'):item.label})))
const weatherItems=[...weatherChoices]
function saveReport(){if(!runtime.quality.report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(runtime.quality.report,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='ivan-world-performance.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
</script>
<template>
 <div class="settings-panel">
  <div class="settings-quick"><UButton color="neutral" variant="outline" :aria-pressed="paused" :disabled="!ready" @click="emit('pause')">{{ paused?'Resume world':'Pause world' }}</UButton><UButton color="neutral" variant="outline" :disabled="!ready" @click="emit('overview')">World view</UButton></div>
  <div class="settings-columns"><section aria-label="Your world"><h3>Your world</h3>
  <div class="settings-row"><span>Appearance</span><AtThemeToggle /></div>
  <button type="button" class="settings-row settings-control" data-world-light :disabled="!ready" :aria-label="`World light: ${time==='cycle'?'Auto':time}. Change lighting.`" @click="emit('lighting')"><span>Time of day</span><span>{{ time==='cycle'?'Auto':time==='night'?'Night':'Day' }} <UIcon name="i-mdi-chevron-down" aria-hidden="true" /></span></button>
  <template v-if="v2"><label class="settings-field">Weather<USelect v-model="weather" :items="weatherItems" aria-label="Weather" :disabled="!ready" trailing-icon="i-mdi-chevron-down" selected-icon="i-mdi-check" :ui="{base:'rounded-full min-h-11 w-full',content:'world-surface',item:'min-h-11'}" /></label><p class="settings-help">Automatic brings a gentle change every three minutes. Calm holds the weather still.</p></template>
  <button type="button" class="settings-row settings-control" :disabled="!ready||soundBusy" :aria-pressed="runtime.sound==='on'||runtime.sound==='paused'" @click="emit('sound')"><span>Soundscape</span><span>{{ soundBusy?'Starting…':runtime.sound==='on'||runtime.sound==='paused'?'Mute sound':'Enable sound' }} <UIcon :name="runtime.sound==='on'?'i-mdi-volume-high':'i-mdi-volume-off'" aria-hidden="true" /></span></button><p class="settings-help">Quiet birds, water and little footsteps. Sound starts only when you enable it.</p>
  <UButton v-if="v2" color="neutral" variant="outline" :disabled="!ready" class="settings-photo" @click="emit('photo')">Take a postcard <span aria-hidden="true">P</span></UButton>
  </section><section aria-label="Your explorer"><h3>Your explorer</h3>
  <label class="settings-field">Graphics<USelect v-model="graphics" :items="qualityChoices" aria-label="Graphics quality" :disabled="!ready" trailing-icon="i-mdi-chevron-down" selected-icon="i-mdi-check" :ui="{base:'rounded-full min-h-11 w-full',content:'world-surface',item:'min-h-11'}" /></label><p class="settings-help">Automatic adjusts detail as you explore. Battery saver keeps things light.</p>
  <UCheckbox v-model="calm" variant="card" icon="i-mdi-check" label="Calm world" :ui="{root:'min-h-11 items-center ring-0 p-2 gap-2',label:'text-sm',base:'min-h-0 size-5'}" /><p class="settings-help">Hold ambient motion. Walking and interactions stay available. Your device’s motion preference is always respected.</p>
  <label class="settings-field">Explorer hat<USelect v-model="hat" :items="wardrobe" aria-label="Explorer hat" :disabled="!ready" trailing-icon="i-mdi-chevron-down" selected-icon="i-mdi-check" :ui="{base:'rounded-full min-h-11 w-full',content:'world-surface',item:'min-h-11'}" /></label><p class="settings-help">Automatic follows Ivan’s Eastern Time calendar, including June 1.</p>
  </section></div>
  <details class="settings-performance"><summary>Performance check</summary><p class="settings-help">Run a 10-second sample, then walk around. Results stay on this device.</p><UButton color="neutral" variant="outline" :disabled="!ready||paused||runtime.quality.measurement==='running'" @click="emit('measure')">{{ runtime.quality.measurement==='running'?'Sampling…':'Start performance sample' }}</UButton><p v-if="runtime.quality.measurement==='interrupted'" class="settings-help" role="status">The sample was interrupted. Start again when you’re ready.</p><template v-if="runtime.quality.report"><dl><div><dt>Delivered frames</dt><dd>{{ runtime.quality.report.fps }} fps</dd></div><div><dt>95th percentile frame</dt><dd>{{ runtime.quality.report.p95FrameMs }} ms</dd></div><div><dt>Graphics during sample</dt><dd>{{ runtime.quality.report.level }}</dd></div></dl><UButton color="neutral" variant="outline" @click="saveReport">Save performance report</UButton><p class="settings-help">Browser measurements describe this device and scene. They don’t predict another phone’s performance.</p></template></details>
  <details class="settings-help-controls"><summary>How to explore</summary><p class="settings-help">WASD / arrows walk · Shift runs · Space jumps · C crouches · F waves · E interacts · Escape leaves an interior.</p><p v-if="v2" class="settings-help">Drag to look. Wheel or pinch to zoom. R recenters, brackets turn the camera, Page Up/Down tilt and plus/minus zoom. P opens photo mode. Arrows turn the globe in World view.</p><p class="settings-help">On touch screens, drag the stick and use the action buttons. Places takes you directly to each stop.</p></details>
  <details class="settings-help-controls"><summary>World credits</summary><template v-if="world==='archipelago'"><p class="settings-help"><a href="https://poly.pizza/bundle/CUTES-Part-One-WD91WrT0gx" target="_blank" rel="noopener noreferrer">CUTES Part One by J-Toastie</a>, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a>, via Poly Pizza. Modified gradient atlas by Kay Lousberg. Adapted with Ivan’s portrait, outfit, wave, crouch and seasonal hats.</p><p class="settings-help">Harbor buildings and street furniture: <a href="https://kaylousberg.itch.io/city-builder-bits" target="_blank" rel="noopener noreferrer">KayKit City Builder Bits by Kay Lousberg</a>, CC0. Original geometry and gradient atlas retained.</p></template><p class="settings-help">City house geometry: <a href="https://simplepolygon.itch.io/simple-houses-lowpoly-pack" target="_blank" rel="noopener noreferrer">3D Assets made by SimplePolygon</a>. House models are scaled and recoloured for the village and city streets.</p><p class="settings-help">Japanese building geometry: <a href="https://reodesuxz.itch.io/low-poly-japanese-town-pack" target="_blank" rel="noopener noreferrer">Low Poly Japanese Town Pack by reodesuxz</a>. Selected house, shop, shrine, castle and pagoda models keep their original colours.</p><p class="settings-help">Layered cliff geometry: <a href="https://simplepolygon.itch.io/layered-cliffs" target="_blank" rel="noopener noreferrer">3D Assets by SimplePolygon</a>. Selected pieces are recoloured and adapted to this little globe.</p><p class="settings-help">Lighthouse: <a href="https://poly.pizza/m/c1-hm3Zs-8U" target="_blank" rel="noopener noreferrer">Lighthouse by CG ART Creation via Poly Pizza</a>, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a>. Uniformly scaled; glass and night beacon lighting adapted.</p><p class="settings-help">{{ world==='archipelago'?'The interiors, interactive props and complementary scenery are original work made for this portfolio.':'The characters, interiors and surrounding scenery are original work made for this portfolio.' }}</p></details>
  <UButton color="neutral" variant="ghost" class="settings-reset" :disabled="!ready" @click="emit('reset')">Start the world again <UIcon name="i-mdi-refresh" aria-hidden="true" /></UButton>
 </div>
</template>
<style scoped>
h3 { font-size:1rem; font-weight:650; letter-spacing:-.02em; margin-bottom:.6rem; }
.settings-quick { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; margin-bottom:1.5rem; }
.settings-quick :deep(button) { justify-content:center; }
.settings-columns { display:grid; grid-template-columns:1fr 1fr; gap:2rem; }
.settings-photo { width:100%; justify-content:space-between; margin-top:1rem; }
.settings-panel :deep(button) { border-radius:999px; min-height:44px; cursor:pointer; }
.settings-panel :deep([role="checkbox"]) { min-height:20px; height:20px; width:20px; border-radius:6px; }
.settings-row { display:flex; justify-content:space-between; align-items:center; gap:1rem; min-height:48px; width:100%; font-size:.9375rem; }
.settings-row>span:last-child { display:flex; align-items:center; gap:.4rem; }
.settings-control { text-align:left; border-top:1px solid var(--world-line); border-radius:14px; }
.settings-field { display:grid; gap:.5rem; font-size:.9375rem; margin-top:1rem; }
.settings-panel .settings-help { font-size:.875rem; line-height:1.65; color:var(--world-muted); margin-block:.5rem 1rem; }
.settings-help a { text-decoration:underline; text-underline-offset:3px; }
.settings-performance,.settings-help-controls { border-top:1px solid var(--world-line); margin-top:1rem; padding-top:.4rem; }
summary { font-size:.9375rem; min-height:48px; display:flex; align-items:center; cursor:pointer; }
dl { display:grid; gap:.5rem; margin-block:1rem; font-size:.75rem; }
dl>div { display:flex; justify-content:space-between; gap:1rem; } dd { font-weight:600; }
.settings-reset { display:flex; justify-content:space-between; width:100%; margin-top:1rem; }
.settings-panel :deep(.theme-toggle) { width:44px; height:44px; background:var(--world-soft); color:var(--world-ink); border:1px solid var(--world-line); box-shadow:none; }
@media (max-width:639px) { .settings-columns { grid-template-columns:1fr; gap:1.5rem; } }
</style>
