<script setup lang="ts">
import {buildings as legacyBuildings,targets as legacyTargets} from '~/experience/globe/layout'
import {paths as legacyPaths,normalAt} from '~/experience/globe/geography'
import {coastalCrossing} from '~/experience/globe/coastal-crossing'
import {riverCrossings} from '~/experience/globe/bridge'
import {createMinimapLand,mapBounds,mapHeading} from '~/experience/globe/navigation'
import {buildingMapOutline} from '~/experience/globe/building-footprint'
import {inCity,cityPavingBounds} from '~/experience/globe/city-district'
import {inJapan,japanPavingBounds} from '~/experience/globe/japan-district'
import {dockOutline} from '~/experience/globe/duck-dock'
import {harborOutline,shipOutline,harborFootprint} from '~/experience/globe/harbor'
import {roomLabels} from '~/experience/globe/rooms'
import type {NavigationState} from '~/experience/globe/types'
import type {TrailGuidance} from '~/experience/globe/trail-guidance'
import type {CompiledArchipelagoWorld} from '~/experience/archipelago/compile'
const {position,guidance=null,world=null}=defineProps<{position:NavigationState;guidance?:TrailGuidance|null;world?:CompiledArchipelagoWorld|null}>()
const expanded=ref(true),mapId=useId()
function islandLand(data:CompiledArchipelagoWorld){
 const parts:string[]=[]
 for(let z=mapBounds.z;z<mapBounds.z+mapBounds.height;z++){
  let start:number|null=null
  for(let x=mapBounds.x;x<=mapBounds.x+mapBounds.width;x++){
   const dry=x<mapBounds.x+mapBounds.width&&data.terrainHeight(data.normalAt(x+.5,z+.5))>data.WATER
   if(dry&&start===null)start=x
   if(!dry&&start!==null){const width=x-start;parts.push(`M${start} ${z}h${width}v1h${-width}Z`);start=null}
  }
 }
 return parts.join('')
}
const land=computed(()=>world?islandLand(world):createMinimapLand()),targets=computed(()=>world?.targets??legacyTargets)
const pathLines=computed(()=>(world?.paths??legacyPaths).map(line=>line.map(p=>`${p.x},${p.z}`).join(' ')))
const caves=computed(()=>targets.value.filter(target=>target.kind==='door'&&!target.room&&target.interior?.includes('cave')))
const landmarks=computed(()=>targets.value.filter(target=>target.kind==='place'||['windmill','campfire','postbox'].includes(target.id)))
const footprints=computed(()=>world?world.buildings.map(building=>({...building,outline:world!.buildingOutline(building).map(p=>`${p.x},${p.z}`).join(' ')})):legacyBuildings.map(building=>({...building,outline:buildingMapOutline(building).map(p=>`${p.x},${p.z}`).join(' ')})))
const dockPoints=dockOutline().map(p=>`${p.x},${p.z}`).join(' ')
const harborPoints=harborOutline().map(p=>`${p.x},${p.z}`).join(' '),shipPoints=shipOutline().map(p=>`${p.x},${p.z}`).join(' ')
const location=computed(()=>position.inside?roomLabels[position.inside]:world?`${world.districts.find(district=>district.id===world!.areaAt(position))?.name??'Island'} map`:harborFootprint(position)?'Harbor map':inJapan(position)?'Komorebi map':inCity(position)?'City map':normalAt(position.x,position.z).y<.35?'World map':'Meadow map')
const description=computed(()=>world?`North-up atlas of the island world: ${world.districts.map(district=>district.name).join(', ')}. Pale paths and bridges connect the islands. Blue doors enter buildings. The arrow shows your heading; the blue cone shows your camera direction. Use Places to travel.`:'North-up atlas of the whole globe. Follow trails through the meadow, city, Komorebi Quarter, Sunlit Orchard, Star Garden and both polar gardens. Four white bridges cross the river; Horizon Causeway connects the southern city to the far side. Cave entrances and blue doors can be entered. The left and right map edges join. Blue doors are enterable buildings. The arrow shows your position and heading; the blue cone shows your camera direction. Use Places to travel.')
</script>
<template>
 <aside class="globe-minimap" aria-label="Minimap" :data-expanded="expanded">
  <button type="button" class="minimap-toggle" :aria-expanded="expanded" :aria-controls="mapId" :aria-label="expanded?'Hide minimap':'Show minimap'" @click="expanded=!expanded"><UIcon name="i-mdi-map-outline" aria-hidden="true" /><span>{{ expanded?location:'Map' }}</span><UIcon :name="expanded?'i-mdi-minus':'i-mdi-plus'" aria-hidden="true" /></button>
  <div v-show="expanded" :id="mapId" class="minimap-body">
   <svg :viewBox="`${mapBounds.x} ${mapBounds.z} ${mapBounds.width} ${mapBounds.height}`" :style="{aspectRatio:`${mapBounds.width} / ${mapBounds.height}`}" role="img" :aria-label="description">
    <rect :x="mapBounds.x" :y="mapBounds.z" :width="mapBounds.width" :height="mapBounds.height" fill="#93c9ca" />
    <path :d="land" fill="#b4ce91" />
    <template v-if="!world"><rect :x="cityPavingBounds.minX" :y="cityPavingBounds.minZ" :width="cityPavingBounds.maxX-cityPavingBounds.minX" :height="cityPavingBounds.maxZ-cityPavingBounds.minZ" rx="2" fill="#d1d2c0" /><rect :x="japanPavingBounds.minX" :y="japanPavingBounds.minZ" :width="japanPavingBounds.maxX-japanPavingBounds.minX" :height="japanPavingBounds.maxZ-japanPavingBounds.minZ" rx="2" fill="#d9c4a3" /></template>
    <g fill="none" stroke="#f9edcd" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline v-for="(points,i) in pathLines" :key="i" :points /></g>
    <template v-if="!world"><rect v-for="crossing in riverCrossings" :key="crossing.id" :x="crossing.x-crossing.halfWidth" :y="crossing.startZ" :width="crossing.halfWidth*2" :height="crossing.endZ-crossing.startZ" rx=".4" fill="#f9f8ee" stroke="#c7cec7" stroke-width=".4"><title>{{ crossing.name }}</title></rect>
    <rect :x="coastalCrossing.endX" :y="coastalCrossing.z-coastalCrossing.halfWidth" :width="coastalCrossing.startX-coastalCrossing.endX" :height="coastalCrossing.halfWidth*2" fill="#f9f8ee" stroke="#c7cec7" stroke-width=".4"><title>{{ coastalCrossing.name }}</title></rect>
    <polygon :points="dockPoints" fill="#b48f61" stroke="#fff9e7" stroke-width=".5"><title>Duck pond dock</title></polygon>
    <polygon :points="harborPoints" fill="#b48f61" stroke="#fff9e7" stroke-width=".5"><title>Harbor pier</title></polygon>
    <polygon :points="shipPoints" fill="#325f7d" stroke="#fff9e7" stroke-width=".7"><title>Small World cruise ship</title></polygon></template>
    <g v-for="building in footprints" :key="building.id"><title>{{ building.name }}{{ building.enter?' · enterable':'' }}</title><polygon :points="building.outline" :fill="building.enter?'#317ab1':building.style==='japanese'?'#ac6952':building.style==='city'?'#8c8b9b':'#b27b65'" stroke="#fff9e7" stroke-width=".7" /><path v-if="building.enter" :transform="`translate(${building.x} ${building.z})`" d="M-1 1.8V-.7H1V1.8" fill="none" stroke="#fff9e7" stroke-width=".7" /></g>
    <g v-for="cave in caves" :key="cave.id"><title>{{ cave.name }} · enterable cave</title><circle :cx="cave.x" :cy="cave.z" r="2.4" fill="#317ab1" stroke="#fff9e7" stroke-width=".7" /></g>
    <circle v-for="place in landmarks" :key="place.id" :cx="place.x" :cy="place.z" r="1.5" fill="#ede1b5" stroke="#6f8260" stroke-width=".6"><title>{{ place.name }}</title></circle>
    <g v-if="world" aria-hidden="true"><text v-for="(district,index) in world.districts" :key="district.id" :x="district.arrival.x" :y="district.arrival.z-5" text-anchor="middle" font-size="4" font-weight="600" fill="#304f48" stroke="#f7f5e8" stroke-width="1.3" paint-order="stroke">{{ index+1 }}</text></g>
    <g v-if="guidance&&!guidance.room" fill="none" stroke="#245a50" stroke-width="1.3" stroke-dasharray="2 1.4" stroke-linecap="round"><polyline v-for="(segment,index) in guidance.segments" :key="index" :points="segment.map(point=>`${point.x},${point.z}`).join(' ')" /></g>
    <g class="minimap-player" :transform="`translate(${position.x} ${position.z})`" :data-x="position.x" :data-z="position.z" :data-inside="position.inside??''"><path v-if="position.cameraYaw!==undefined" :transform="`rotate(${mapHeading(position.cameraYaw)})`" d="M0 0L-7-11Q0-14 7-11Z" fill="#347ab1" opacity=".3" /><circle r="4" fill="#fffdf3" /><circle r="3" fill="#275d50" /><path :transform="`rotate(${mapHeading(position.yaw)})`" d="M0-2.5L1.8 1.6L0 .8L-1.8 1.6Z" fill="#fffdf3" /></g>
   </svg>
   <span class="minimap-north" aria-hidden="true">N ↑</span>
   <p><span aria-hidden="true" />You<span class="door-key" aria-hidden="true" />Open doors</p>
  </div>
 </aside>
</template>
<style scoped>
.globe-minimap { position:absolute; z-index:3; top:102px; right:var(--world-edge); width:190px; border:1px solid var(--world-line); border-radius:22px; background:var(--world-paper); color:var(--world-ink); box-shadow:0 3px 12px #24443712; overflow:hidden; }
.minimap-toggle { display:flex; align-items:center; gap:.5rem; width:100%; min-height:44px; padding:.5rem .8rem; font-size:.6875rem; cursor:pointer; text-align:left; }
.minimap-toggle span { flex:1; } .minimap-toggle .iconify { flex:none; font-size:1rem; }
.minimap-toggle:hover { background:var(--world-soft); }
.globe-minimap .minimap-toggle:focus-visible { outline:2px solid var(--world-blue); outline-offset:-4px; border-radius:16px; }
.minimap-body { position:relative; margin:0 6px 6px; }
svg { display:block; width:100%; aspect-ratio:124/116; border-radius:16px; }
.minimap-north { position:absolute; top:7px; right:8px; font-size:.625rem; font-weight:650; color:#264f4b; }
.minimap-body p { display:flex; align-items:center; justify-content:center; gap:5px; padding-top:6px; font-size:.625rem; color:var(--world-muted); }
.minimap-body p span { width:6px; height:6px; border-radius:50%; background:#275d50; }
.minimap-body .door-key { border-radius:2px; background:#317ab1; margin-left:5px; }
.globe-minimap[data-expanded=false] { width:108px; border-radius:999px; }
@media (max-width:767px) { .globe-minimap { top:78px; width:134px; border-radius:18px; } .minimap-toggle { padding:.45rem .6rem; gap:.3rem; font-size:.625rem; } .minimap-north { top:5px; right:5px; } .minimap-body p { gap:3px; font-size:.5625rem; } }
@media (max-height:560px) { .globe-minimap { top:76px; width:120px; } .minimap-body p { display:none; } }
</style>
