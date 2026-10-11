<script setup lang="ts">
import {computed} from 'vue'
import type {WorldLoadState} from '~/experience/globe/loading'
const {state,failed=false,reduced=false}=defineProps<{state:WorldLoadState;failed?:boolean;reduced?:boolean}>()
const progress=computed(()=>`${state.completed/state.total*100}%`)
</script>

<template>
 <section class="world-loader" :data-reduced="reduced" :data-failed="failed" aria-label="Preparing the interactive world">
  <div class="world-loader-card">
   <svg class="loader-map" viewBox="0 0 240 175" fill="none" aria-hidden="true">
    <ellipse cx="120" cy="144" rx="91" ry="12" fill="#254f4220" />
    <path d="M29 97C24 51 69 21 123 23C174 17 217 52 212 99L200 128C176 150 66 150 42 126Z" fill="#49745b" />
    <path d="M29 86C31 48 74 18 124 21C172 18 211 46 212 86C211 124 169 140 119 139C66 140 29 122 29 86Z" fill="#bed18e" stroke="#345a46" stroke-width="2" />
    <path d="M132 24C116 43 151 56 134 72C112 92 137 113 121 139" stroke="#82c9d2" stroke-width="18" />
    <path d="M133 26C119 45 152 56 137 72C118 90 141 113 126 136" stroke="#b5e4dc" stroke-width="3" />
    <path d="M53 107C81 104 84 83 106 88C126 92 134 105 174 105" stroke="#f9e6ba" stroke-width="12" stroke-linecap="round" />
    <path d="M55 107C82 103 85 84 106 89C127 94 140 105 172 105" stroke="#647a50" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round" />
    <path d="M124 91L142 95M123 96L141 100M122 101L140 105" stroke="#8f7052" stroke-width="5" />
    <path d="M60 65V89L82 96L102 85V62L81 50Z" fill="#fff8dc" stroke="#345a46" stroke-width="2" stroke-linejoin="round" />
    <path d="M60 65L81 51L103 63L84 41L62 51L49 66Z" fill="#dc8d71" stroke="#345a46" stroke-width="2" stroke-linejoin="round" />
    <path d="M82 75L92 71V91L82 96Z" fill="#5283a1" />
    <path d="M66 71L75 75V83L66 80Z" fill="#82c9d2" />
    <path d="M159 63V88L176 94L194 83V60L176 49Z" fill="#fff8dc" stroke="#345a46" stroke-width="2" stroke-linejoin="round" />
    <path d="M151 64L177 39L202 59L177 49L159 63Z" fill="#5283a1" stroke="#345a46" stroke-width="2" stroke-linejoin="round" />
    <path d="M174 74L185 68V88L176 94Z" fill="#d0aa61" />
    <path d="M49 85V102M202 82V101" stroke="#8f7052" stroke-width="4" stroke-linecap="round" />
    <path d="M35 79C35 62 65 62 65 78C67 91 34 91 35 79ZM187 74C185 55 216 54 216 74C217 87 187 88 187 74Z" fill="#6d985e" stroke="#345a46" stroke-width="2" />
    <g class="loader-walker"><ellipse cx="94" cy="116" rx="8" ry="3" fill="#345a462d" /><path d="M92 111V116M98 111V116" stroke="#345a46" stroke-width="3" stroke-linecap="round" /><rect x="89" y="100" width="12" height="12" rx="4" fill="#5283a1" /><circle cx="95" cy="97" r="6" fill="#e6bb90" /><path d="M89 97C86 87 102 86 101 97L98 93L89 97Z" fill="#345a46" /></g>
    <path class="loader-cloud" d="M161 22C160 14 173 11 177 18C185 11 197 18 193 25H164Z" fill="#fffdf3" />
   </svg>
   <p class="loader-eyebrow">Ivan’s little corner of the world</p>
   <h2>{{ failed?'A quieter way to explore.':'A little world. A lot to discover.' }}</h2>
   <div class="loader-status" role="status" aria-live="polite" aria-atomic="true">
    <p class="loader-stage">{{ failed?'The 3D world could not open.':state.title }}</p>
    <p class="loader-detail">{{ failed?'The complete portfolio is ready below, with all the projects, experience and ways to get in touch.':state.detail }}</p>
   </div>
   <div v-if="!failed" class="loader-progress" role="progressbar" aria-label="World preparation stages" aria-valuemin="0" :aria-valuemax="state.total" :aria-valuenow="state.completed" :aria-valuetext="state.title"><span :style="{width:progress}" /></div>
   <div class="loader-footer"><span v-if="!failed" class="loader-count" aria-hidden="true">{{ state.completed }} / {{ state.total }}</span><a href="#globe-reading">Read the portfolio <span aria-hidden="true">↗</span></a></div>
  </div>
 </section>
</template>

<style scoped>
.world-loader { position:absolute; z-index:9; inset:0; display:grid; place-items:center; padding:24px; overflow:auto; overscroll-behavior:contain; background:#d7e6df; color:#263f38; }
.world-loader-card { width:min(100%,420px); padding:24px 26px; border:1px solid #bccbb8; border-radius:30px; background:#fffdf3; box-shadow:0 16px 50px #294e3c12; }
.loader-map { display:block; width:220px; max-width:100%; height:auto; margin:-6px auto 14px; }
.loader-eyebrow { font-size:.625rem; line-height:1.6; letter-spacing:.1em; text-transform:uppercase; color:#51675e; }
h2 { max-width:330px; margin-top:.55rem; font-family:'Bricolage Grotesque',sans-serif; font-size:clamp(1.65rem,3.4vw,2.15rem); font-weight:650; line-height:1.13; letter-spacing:-.045em; text-wrap:balance; }
.loader-status { margin-block:1.25rem; min-height:92px; }
.loader-stage { font-size:.875rem; font-weight:600; line-height:1.6; }
.loader-detail { margin-top:.3rem; font-size:.8125rem; line-height:1.7; color:#51675e; }
.loader-progress { height:6px; overflow:hidden; border-radius:999px; background:#e2e8d8; }
.loader-progress>span { display:block; height:100%; border-radius:inherit; background:#346f58; transition:width 160ms ease-out; }
.loader-footer { display:flex; justify-content:space-between; gap:1rem; align-items:center; margin-top:.65rem; }
.loader-count { color:#51675e; font:500 .6875rem/1.5 ui-monospace,monospace; }
.loader-footer a { display:inline-flex; align-items:center; justify-content:space-between; gap:1rem; min-height:44px; padding:.45rem .7rem; margin-right:-.7rem; border-radius:999px; color:#285a4d; font-size:.8125rem; }
.loader-footer a:focus-visible { outline:3px solid #285a4d; outline-offset:2px; }
.loader-footer a:hover { background:#eef3e6; }
.world-loader[data-failed=true] .loader-footer { justify-content:flex-start; }
.loader-walker { transform-origin:95px 116px; animation:loader-hop 1.8s ease-in-out infinite; }
.loader-cloud { animation:loader-drift 4s ease-in-out infinite alternate; }
@keyframes loader-hop { 0%,55%,100% { transform:translateY(0); } 68% { transform:translateY(-5px) rotate(-4deg); } 80% { transform:translateY(0) rotate(3deg); } }
@keyframes loader-drift { to { transform:translateX(6px); } }
.world-loader[data-reduced=true] :is(.loader-walker,.loader-cloud),.world-loader[data-failed=true] :is(.loader-walker,.loader-cloud) { animation:none; }
.world-loader[data-reduced=true] .loader-progress>span { transition:none; }
@media (max-height:650px) { .world-loader { padding:16px; } .world-loader-card { padding:18px 22px; } .loader-map { width:155px; margin-block:-8px 6px; } .loader-status { min-height:72px; margin-block:1rem; } }
@media (prefers-reduced-motion:reduce) { .loader-walker,.loader-cloud { animation:none; } .loader-progress>span { transition:none; } }
</style>
