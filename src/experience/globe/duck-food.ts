import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import {RADIUS,WATER} from './geography.ts'

export const duckFoodStyle={count:8,lifetime:6,flight:.72,waterLift:.04} as const

/** Eight original crumbs reuse one point draw, with a short toss and a quiet water-level fade. */
export function createDuckFood(a:GlobeArtist,onLand?:(point:THREE.Vector3,time:number)=>void){
 const geometry=new THREE.BufferGeometry(),positions=new THREE.Float32BufferAttribute(new Float32Array(duckFoodStyle.count*3),3),seeds=new Float32Array(duckFoodStyle.count*3)
 for(let i=0;i<duckFoodStyle.count;i++)seeds.set([i*.017,i*2.399,.85+(i%3)*.12],i*3)
 positions.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('position',positions);geometry.setAttribute('crumbSeed',new THREE.BufferAttribute(seeds,3));geometry.setDrawRange(0,0)
 const now={value:0},started={value:-100},calm={value:0},from={value:new THREE.Vector3()},up={value:new THREE.Vector3(0,1,0)},east={value:new THREE.Vector3(1,0,0)},south={value:new THREE.Vector3(0,0,1)}
 const material=new THREE.PointsMaterial({color:0xe9c080,size:.11,sizeAttenuation:true,transparent:true,depthWrite:false,opacity:.95})
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{crumbNow:now,crumbStarted:started,crumbCalm:calm,crumbFrom:from,crumbUp:up,crumbEast:east,crumbSouth:south})
  shader.vertexShader=`attribute vec3 crumbSeed; uniform float crumbNow; uniform float crumbStarted; uniform float crumbCalm;
uniform vec3 crumbFrom; uniform vec3 crumbUp; uniform vec3 crumbEast; uniform vec3 crumbSouth;
varying float vCrumbAlpha;\n`+shader.vertexShader
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
float age=crumbNow-crumbStarted;
float flight=crumbCalm>.5?1.0:clamp((age-crumbSeed.x)/${duckFoodStyle.flight},0.0,1.0);
transformed=mix(crumbFrom,position,flight)+crumbUp*(4.0*flight*(1.0-flight)*.55);
if(flight>=1.0&&crumbCalm<.5){
 float floating=max(0.0,age-${duckFoodStyle.flight}-crumbSeed.x);
 vec3 drift=crumbEast*sin(crumbSeed.y)*floating*.012+crumbSouth*cos(crumbSeed.y)*floating*.012;
 transformed=normalize(position+drift)*(${RADIUS+WATER+duckFoodStyle.waterLift}+sin(floating*1.4+crumbSeed.y)*.007);
}
vCrumbAlpha=(1.0-smoothstep(3.6,${duckFoodStyle.lifetime}.0,age))*step(crumbCalm>.5?0.0:crumbSeed.x,age);`)
  shader.vertexShader=shader.vertexShader.replace('gl_PointSize = size;','gl_PointSize = size * crumbSeed.z;')
  shader.fragmentShader='varying float vCrumbAlpha;\n'+shader.fragmentShader
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_particle_fragment>','#include <map_particle_fragment>\nfloat edge=1.0-smoothstep(.32,.5,length(gl_PointCoord-vec2(.5)));diffuseColor.a*=vCrumbAlpha*edge;if(diffuseColor.a<.005)discard;')
 }
 material.customProgramCacheKey=()=> 'duck-food-toss-v1'
 const mesh=new THREE.Points(geometry,material);mesh.name='Duck food';mesh.frustumCulled=false;mesh.renderOrder=2;a.scene.add(mesh);a.kit.geometries.push(geometry);a.kit.extras.push(material)
 const target=new THREE.Vector3(),point=new THREE.Vector3();let landed=true,lastTime=0,visualAge=0
 function update(time:number,reduced:boolean,hold=false){
  if(!Number.isFinite(time))return
  // Keep the food available during a long approach, then release the existing fade without a jump.
  const delta=Math.max(0,time-lastTime);lastTime=time;visualAge=Math.min(visualAge+delta,hold?Math.max(3.2,visualAge):Infinity)
  now.value=started.value+visualAge;calm.value=reduced?1:0
  if(!landed&&time-started.value>=(reduced?0:duckFoodStyle.flight)){landed=true;onLand?.(target,time)}
  if(visualAge>=duckFoodStyle.lifetime-.000001)geometry.setDrawRange(0,0)
 }
 return{mesh,update,
  feed(origin:THREE.Vector3,destination:THREE.Vector3,time:number,reduced:boolean){
   if(!Number.isFinite(time)||![origin.x,origin.y,origin.z,destination.x,destination.y,destination.z].every(Number.isFinite)||destination.lengthSq()<1)return
   from.value.copy(origin);up.value.copy(destination).normalize();target.copy(up.value).multiplyScalar(RADIUS+WATER+duckFoodStyle.waterLift)
   east.value.set(up.value.y,-up.value.x,0);if(east.value.lengthSq()<.0001)east.value.set(1,0,0);east.value.normalize();south.value.crossVectors(east.value,up.value).normalize()
   for(let i=0;i<duckFoodStyle.count;i++){
    const angle=i*2.399,radius=.13+Math.sqrt(i/duckFoodStyle.count)*.32
    point.copy(target).addScaledVector(east.value,Math.cos(angle)*radius).addScaledVector(south.value,Math.sin(angle)*radius).normalize().multiplyScalar(RADIUS+WATER+duckFoodStyle.waterLift);positions.setXYZ(i,point.x,point.y,point.z)
   }
   positions.needsUpdate=true;started.value=lastTime=time;visualAge=0;landed=false;geometry.setDrawRange(0,duckFoodStyle.count);update(time,reduced)
  },
  clear(){geometry.setDrawRange(0,0);started.value=-100;now.value=0;lastTime=visualAge=0;landed=true},
 }
}
