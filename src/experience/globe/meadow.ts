import {lighthouse} from './lighthouse.ts'
import {wildObstacles} from './wild-land.ts'
import {coastalFootprint} from './coastal-crossing.ts'
import * as THREE from 'three'
import {bridge,bridgeFootprint} from './bridge.ts'
import type {GlobeArtist} from './art-kit.ts'
import type {CompiledWorld} from '../archipelago/compile.ts'
import {buildings} from './layout.ts'
import {normalAt,terrainHeight as legacyTerrainHeight,WATER,pathDistance as legacyPathDistance,spawn as legacySpawn,RADIUS} from './geography.ts'
import {breezeShader} from './wind.ts'
import {cityPaved} from './city-district.ts'
import {japanPaved} from './japan-district.ts'
import {insideBuildingFootprint,insideRoundFootprint} from './building-footprint.ts'
import {windmill} from './windmill.ts'
import {dockFootprint} from './duck-dock.ts'
import {harborFootprint} from './harbor.ts'
import {grassCapacity,grassSlotCount,grassTiles,grassRandom,grassTilePoint,grassTileDistance,orderedGrassTiles,grassSlotIndex,grassSlotCapacity} from './grass-placement.ts'
import type {GrassTile,GrassDirection} from './grass-placement.ts'
import {expansionObstacles} from './world-expansion-obstacles.ts'
import {wrapLongitude,longitudeLimit,worldCircumference} from './world-expansion.ts'

function noise(x:number,z:number){
 const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz)
 const hash=(a:number,b:number)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n)}
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),u),THREE.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),u),v)
}
export function meadowPatch(x:number,z:number){
 const longitude=wrapLongitude(x),sample=(value:number)=>noise(value*.11,z*.11)*.72+noise(value*.29+12,z*.29-7)*.28
 const blend=THREE.MathUtils.smoothstep(Math.abs(longitude),longitudeLimit-12,longitudeLimit)*.5
 return THREE.MathUtils.lerp(sample(longitude),sample(longitude+(longitude<0?worldCircumference:-worldCircumference)),blend)
}

/** Two curved ribbons keep each tuft within ten triangles, close to the previous nine-triangle budget. */
export function createGrassBlade(){
 const geometry=new THREE.BufferGeometry(),vertices:number[]=[],indices:number[]=[],colors:number[]=[]
 for(let blade=0;blade<2;blade++){
  const angle=blade*2.13,co=Math.cos(angle),si=Math.sin(angle),height=blade?.40:.32,lean=blade?-.10:.12
  const outline=[[-.035,0,0],[.035,0,0],[-.027,.36,.018],[.027,.36,.018],[-.013,.75,.065],[.013,.75,.065],[0,1,.12]]
  for(const [i,point] of outline.entries()){
   const t=point[1]!,x=point[0]!+lean*t*t,y=t*height,z=point[2]!
   vertices.push(x*co-z*si+(blade?-.025:.025),y,x*si+z*co)
   const shade=i<2?.82:i<4?.98:i<6?1.06:1.12;colors.push(shade,shade,shade)
  }
  for(const index of [0,1,2,1,3,2,2,3,4,3,5,4,4,5,6])indices.push(blade*7+index)
 }
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

export function buildMeadow(a:GlobeArtist,wind:{value:number},strength={value:1},world?:CompiledWorld){
 const frameAt=a.frameAt,terrainHeight=world?.terrainHeight??legacyTerrainHeight,pathDistance=world?.pathDistance??legacyPathDistance,spawn=world?.spawn??legacySpawn
 const {kit,scene}=a,blade=createGrassBlade(),player={value:new THREE.Vector3(0,1000,0)},far={value:50}
 kit.geometries.push(blade)
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});kit.extras.push(material)
 material.onBeforeCompile=shader=>{
  shader.uniforms.windTime=wind;shader.uniforms.windStrength=strength;shader.uniforms.grassPlayer=player;shader.uniforms.grassFar=far
  shader.vertexShader=breezeShader+`uniform vec3 grassPlayer; uniform float grassFar;
varying vec3 vGrassUp; varying float vBladeHeight;\n`+shader.vertexShader
  shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
vec3 bladeBreeze=foliageWind(instanceMatrix);
float bladeSlope=5.0*clamp(position.y/.40,0.0,1.0);
objectNormal.y-=dot(bladeBreeze,objectNormal)*bladeSlope/(1.0+bladeBreeze.y*bladeSlope);`)
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
vec3 origin=instanceMatrix[3].xyz;
vec3 east=normalize(instanceMatrix[0].xyz), up=normalize(instanceMatrix[1].xyz), south=normalize(instanceMatrix[2].xyz);
vBladeHeight=clamp(position.y/.40,0.0,1.0);
vGrassUp=normalize(mat3(modelViewMatrix)*up);
float bendWeight=vBladeHeight*vBladeHeight;
transformed+=bladeBreeze*bendWeight;
vec3 diff=origin-grassPlayer;
vec2 away=vec2(dot(diff,east),dot(diff,south));
float influence=1.0-smoothstep(.2,1.25,length(diff));
transformed.xz+=normalize(away+vec2(.001))*bendWeight*.22*influence;
transformed.y*=1.0-influence*bendWeight*.2;
float cameraDistance=length((modelViewMatrix*vec4(origin,1.0)).xyz);
transformed*=(1.0-smoothstep(grassFar-18.0,grassFar,cameraDistance))*(1.0-smoothstep(22.0,28.0,length(diff)));`)
  shader.fragmentShader='varying vec3 vGrassUp; varying float vBladeHeight;\n'+shader.fragmentShader
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal=normalize(mix(normal,normalize(vGrassUp),.72));')
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(vec3(1.0),vec3(1.05,1.03,.88),vBladeHeight*.45);')
 }
 material.customProgramCacheKey=()=> 'meadow-streamed-breeze-v3'
 const grass=new THREE.InstancedMesh(blade,material,grassCapacity),matrix=new THREE.Matrix4(),local=new THREE.Matrix4(),color=new THREE.Color(),anchor=new THREE.Vector3(),direction=new THREE.Vector3(),eligible=new Map<string,boolean>()
 const footprints=[...buildings.map(shape=>({shape,clearance:.9})),...[...expansionObstacles,...wildObstacles].map(shape=>({shape,clearance:.3}))].map(({shape,clearance})=>({shape,clearance,normal:normalAt(shape.x,shape.z),chord:Math.pow((Math.hypot(shape.width/2+clearance,shape.depth/2+clearance)+.15)/(RADIUS-2),2)}))
 const lightNormal=normalAt(lighthouse.x,lighthouse.z),lightChord=Math.pow((lighthouse.radius+.60)/(RADIUS-2),2)
 const millNormal=normalAt(windmill.x,windmill.z),millChord=Math.pow((windmill.radius+.45)/(RADIUS-2),2)
 // A conservative spherical broad phase avoids re-sampling terrain for every distant facade.
 function near(a:GrassDirection,b:GrassDirection,chord:number){return 2*(1-a.x*b.x-a.y*b.y-a.z*b.z)<chord}
 const initial=normalAt(spawn.x,spawn.z);anchor.set(initial.x,initial.y,initial.z)
 function sample(tile:GrassTile,index:number){
  const point=grassTilePoint(tile,index),normal=normalAt(point.x,point.z)
  if(world){const ground=terrainHeight(normal);if(world.surfaceAt(point)!=='grass'||world.blocked(point))return null;const path=pathDistance(point),edge=THREE.MathUtils.smoothstep(path,1.5,3.6);if(grassRandom(tile,index,2)>.35+edge*.65)return null;return{point,edge,ground}}
  if(near(normal,lightNormal,lightChord)&&insideRoundFootprint(point,lighthouse,.45)||coastalFootprint(point,.7)||harborFootprint(point,.4)||dockFootprint(point,.35)||bridgeFootprint(point,bridge.vegetationMargin)||cityPaved(point)||japanPaved(point,.4)||near(normal,millNormal,millChord)&&insideRoundFootprint(point,windmill,.3))return null
  const ground=terrainHeight(normal)
  if(ground<WATER+.07||footprints.some(prop=>near(normal,prop.normal,prop.chord)&&insideBuildingFootprint(point,prop.shape,prop.clearance)))return null
  const path=pathDistance(point),edge=THREE.MathUtils.smoothstep(path,1.15,2.6)
  if(path<1.15||grassRandom(tile,index,2)>.32+edge*.68)return null
  return{point,edge,ground}
 }
 function suitable(tile:GrassTile){
  if(eligible.has(tile.id))return eligible.get(tile.id)!
  let accepted=0;for(let i=0;i<64;i++)if(sample(tile,i))accepted++
  const value=accepted>=16;eligible.set(tile.id,value);return value
 }
 function nearby(normal:GrassDirection){const result:GrassTile[]=[];for(const tile of orderedGrassTiles(normal)){if(suitable(tile))result.push(tile);if(result.length===grassSlotCount)break}return result}
 // Small global eligibility probes run during loading, so a first visit never scans a new continent.
 for(const tile of grassTiles)suitable(tile)
 const slots=nearby(anchor)
 function paint(slot:number,tile:GrassTile){
  const capacity=grassSlotCapacity(slot);let count=0
  for(let index=0;index<20000&&count<capacity;index++){
   const accepted=sample(tile,index);if(!accepted)continue
   const {point,edge,ground}=accepted,patch=meadowPatch(point.x,point.z),shore=THREE.MathUtils.smoothstep(ground-WATER,.07,.65),height=(.65+grassRandom(tile,index,3)*.55)*(.5+edge*.5)*(.75+shore*.25)
   matrix.copy(frameAt(point.x,point.z,ground));local.makeRotationY(grassRandom(tile,index,4)*Math.PI*2);matrix.multiply(local);local.makeScale(.75+grassRandom(tile,index,5)*.45,height,.75+grassRandom(tile,index,6)*.45);matrix.multiply(local)
   const instance=grassSlotIndex(slot,count);grass.setMatrixAt(instance,matrix);color.setHSL(.27+patch*.025,.32+patch*.07,.33+patch*.07,THREE.SRGBColorSpace);grass.setColorAt(instance,color);count++
  }
  // Eligibility has a 25% dry-area floor; this protects finite roots if a future layout removes a tile.
  while(count<capacity){const instance=grassSlotIndex(slot,count);matrix.makeScale(0,0,0);grass.setMatrixAt(instance,matrix);grass.setColorAt(instance,color);count++}
 }
 for(const [slot,tile] of slots.entries())paint(slot,tile)
 let pending:{slot:number;tile:GrassTile}[]=[],rapid=false
 function stream(normal:THREE.Vector3){
  const moved=anchor.distanceToSquared(normal)*RADIUS*RADIUS
  if(moved>16){
   const wanted=nearby(normal),ids=new Set(wanted.map(tile=>tile.id)),existing=new Set(slots.map(tile=>tile.id))
   const free=slots.map((tile,slot)=>({tile,slot})).filter(({tile})=>!ids.has(tile.id)&&grassTileDistance(tile,normal)>36).sort((a,b)=>grassTileDistance(b.tile,normal)-grassTileDistance(a.tile,normal))
   pending=wanted.filter(tile=>!existing.has(tile.id)).slice(0,free.length).map((tile,index)=>({tile,slot:free[index]!.slot}));rapid=moved>24*24;anchor.copy(normal)
  }
  let changed=false
  // Normal walking recycles one distant tile per frame; travel catches up during the camera transition.
  for(let i=0;i<(rapid?2:1)&&pending.length;i++){
   const next=pending.shift()!;paint(next.slot,next.tile);slots[next.slot]=next.tile;changed=true
  }
  if(changed){grass.instanceMatrix.needsUpdate=true;if(grass.instanceColor)grass.instanceColor.needsUpdate=true}
 }
 grass.count=grassCapacity;grass.instanceMatrix.setUsage(THREE.DynamicDrawUsage);grass.instanceMatrix.needsUpdate=true;if(grass.instanceColor){grass.instanceColor.setUsage(THREE.DynamicDrawUsage);grass.instanceColor.needsUpdate=true}
 grass.receiveShadow=true;grass.frustumCulled=false;scene.add(grass);kit.instances.push(grass)
 return{grass,update(position:THREE.Vector3,overview:boolean,limit:number,distance:number){player.value.copy(position);grass.visible=!overview;grass.count=Math.min(grassCapacity,limit);far.value=distance;if(!overview&&position.lengthSq()>RADIUS*RADIUS/4)stream(direction.copy(position).normalize())}}
}
