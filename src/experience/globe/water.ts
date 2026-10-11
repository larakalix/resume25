import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import {RADIUS,WATER,terrainHeight} from './geography.ts'
import type {WeatherState} from './weather.ts'

interface Wave {axis:readonly[number,number,number];warp:readonly[number,number,number];amplitude:number;speed:number;bend:number;drift:number}
const waves:readonly Wave[]=[
 {axis:[.74,.27,.52],warp:[.31,-.22,.57],amplitude:.025,speed:-.48,bend:.62,drift:.16},
 {axis:[-.57,.38,1.16],warp:[.69,.33,-.24],amplitude:.012,speed:.67,bend:.48,drift:-.13},
 {axis:[1.71,-.41,.63],warp:[-.43,.52,.71],amplitude:.006,speed:-.83,bend:.34,drift:.21},
]
export const waterStyle={waveLimit:waves.reduce((sum,wave)=>sum+wave.amplitude,0),shallow:'#7bd3c1',middle:'#248da5',deep:'#155b7b',foam:'#e5f3dc'} as const

/** Analytic height/slope reference keeps bounded swell and lighting derivatives independently testable. */
export function waterWaveAt(point:{x:number;y:number;z:number},time:number){
 let height=0,x=0,y=0,z=0
 for(const wave of waves){
  const warp=point.x*wave.warp[0]+point.y*wave.warp[1]+point.z*wave.warp[2]+time*wave.drift,phase=point.x*wave.axis[0]+point.y*wave.axis[1]+point.z*wave.axis[2]+Math.sin(warp)*wave.bend+time*wave.speed,factor=Math.cos(phase)*wave.amplitude,bend=Math.cos(warp)*wave.bend
  height+=Math.sin(phase)*wave.amplitude;x+=factor*(wave.axis[0]+wave.warp[0]*bend);y+=factor*(wave.axis[1]+wave.warp[1]*bend);z+=factor*(wave.axis[2]+wave.warp[2]*bend)
 }
 return{height,gradient:{x,y,z}}
}
const glsl=(value:number)=>Number.isInteger(value)?`${value}.0`:String(value)
// Warped, intersecting wave trains avoid a globe wrapped in parallel latitude-like ribbons.
const waveField=`vec4 meadowWaterField(vec3 p,float t){vec4 field=vec4(0.0);
${waves.map((wave,i)=>{
 const axis=`vec3(${wave.axis.map(glsl).join(',')})`,warp=`vec3(${wave.warp.map(glsl).join(',')})`
 return`float w${i}=dot(p,${warp})+t*${glsl(wave.drift)};float q${i}=dot(p,${axis})+sin(w${i})*${glsl(wave.bend)}+t*${glsl(wave.speed)};field+=vec4(cos(q${i})*${glsl(wave.amplitude)}*(${axis}+cos(w${i})*${glsl(wave.bend)}*${warp}),sin(q${i})*${glsl(wave.amplitude)});`
}).join('\n')}
return field;}`
const waterNoise=`float waterHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float waterNoise(vec3 p){vec3 cell=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
return mix(mix(mix(waterHash(cell),waterHash(cell+vec3(1,0,0)),f.x),mix(waterHash(cell+vec3(0,1,0)),waterHash(cell+vec3(1,1,0)),f.x),f.y),mix(mix(waterHash(cell+vec3(0,0,1)),waterHash(cell+vec3(1,0,1)),f.x),mix(waterHash(cell+vec3(0,1,1)),waterHash(cell+vec3(1,1,1)),f.x),f.y),f.z);}`

export function createWaterGeometry(ground=terrainHeight){
 const geometry=new THREE.SphereGeometry(RADIUS+WATER,192,128),position=geometry.attributes.position!,depth=new Float32Array(position.count),normal=new THREE.Vector3()
 for(let i=0;i<position.count;i++){normal.fromBufferAttribute(position,i).normalize();depth[i]=WATER-ground(normal)}
 geometry.setAttribute('waterDepth',new THREE.BufferAttribute(depth,1));geometry.computeBoundingSphere();geometry.boundingSphere!.radius+=waterStyle.waveLimit*1.3;return geometry
}

export function buildWater(a:GlobeArtist,ground=terrainHeight){
 const time={value:0},swell={value:1},rain={value:0},cloud={value:0},ducks={value:[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()]},pulse={value:new THREE.Vector4(0,0,0,-100)}
 const flow={value:[new THREE.Vector4(0,0,1,0),new THREE.Vector4(0,0,1,0),new THREE.Vector4(0,0,1,0)]},pecks={value:new Float32Array(3)},direction=new THREE.Vector3()
 const geometry=createWaterGeometry(ground),material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.38,metalness:.02,transparent:true,opacity:1,depthWrite:false})
 a.kit.geometries.push(geometry);a.kit.extras.push(material)
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{waterTime:time,waterSwell:swell,weatherRain:rain,weatherCloud:cloud,duckCenters:ducks,duckFlow:flow,duckPecks:pecks,pondPulse:pulse,waterShallow:{value:new THREE.Color(waterStyle.shallow)},waterMiddle:{value:new THREE.Color(waterStyle.middle)},waterDeep:{value:new THREE.Color(waterStyle.deep)},waterFoam:{value:new THREE.Color(waterStyle.foam)}})
  shader.vertexShader=`attribute float waterDepth; uniform float waterTime; uniform float waterSwell; varying float vWaterDepth; varying vec3 vWaterPoint;\n${waveField}\n`+shader.vertexShader
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
vWaterDepth=waterDepth;
transformed+=normal*meadowWaterField(position,waterTime).w*waterSwell*smoothstep(.02,.4,waterDepth);
vWaterPoint=transformed;`)
  shader.fragmentShader=`uniform float waterTime; uniform float waterSwell; uniform float weatherRain; uniform float weatherCloud; uniform vec3 duckCenters[3]; uniform vec4 duckFlow[3]; uniform float duckPecks[3]; uniform vec4 pondPulse;
uniform vec3 waterShallow; uniform vec3 waterMiddle; uniform vec3 waterDeep; uniform vec3 waterFoam;
varying float vWaterDepth; varying vec3 vWaterPoint;\n${waveField}\n${waterNoise}\n`+shader.fragmentShader
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
vec3 radial=normalize(vWaterPoint),slope=meadowWaterField(vWaterPoint,waterTime).xyz*waterSwell*smoothstep(.02,.4,vWaterDepth);
vec3 waterNormal=normalize(radial-slope+radial*dot(slope,radial));
normal=normalize(mat3(viewMatrix)*waterNormal);`)
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float depth=max(vWaterDepth,0.0);
vec3 p=vWaterPoint;
float fresnel=pow(1.0-max(dot(normalize(p),normalize(cameraPosition-p)),0.0),3.0);
float broad=waterNoise(p*.26+vec3(waterTime*.025,0.0,-waterTime*.018));
float detail=waterNoise(p*1.12+vec3(-waterTime*.045,waterTime*.017,waterTime*.03));
vec3 tint=mix(waterShallow,waterMiddle,smoothstep(.025,.38,depth));
tint=mix(tint,waterDeep,smoothstep(.3,1.0,depth));
tint*=(.93+broad*.14)*(1.0-weatherCloud*.12);
tint=mix(tint,waterShallow,fresnel*.24);
// Broken, shallow caustics and a breathing shore edge replace long, evenly spaced lines.
float caustic=sin(dot(p,vec3(2.7,.7,-1.3))+detail*4.0+waterTime*.3)*sin(dot(p,vec3(-1.1,.8,3.2))+broad*3.0-waterTime*.24);
tint=mix(tint,waterFoam,smoothstep(.74,.98,caustic)*(1.0-smoothstep(.16,.65,depth))*.15);
float shoreWidth=.065+.025*sin(waterTime*.58+detail*4.0);
float edge=(1.0-smoothstep(.003,shoreWidth,depth))*(.35+detail*.38);
float washPhase=depth*24.0-waterTime*.8+detail*3.2;
float wash=(1.0-smoothstep(.035,.30,depth))*smoothstep(.58,.96,sin(washPhase))*smoothstep(.22,.72,detail)*.30;
float wakes=0.0;
for(int i=0;i<3;i++){
 if(length(duckCenters[i])<1.0)continue;
 vec3 duckUp=normalize(duckCenters[i]),delta=p-duckCenters[i];
 delta-=duckUp*dot(delta,duckUp);
 vec3 heading=normalize(duckFlow[i].xyz);
 float along=dot(delta,heading),behind=-along,lateral=length(delta-heading*along);
 float swimming=clamp(duckFlow[i].w/.6,0.0,1.0);
 float wake=(1.0-smoothstep(.025,.085,abs(lateral-behind*.32)))*smoothstep(.02,.14,behind)*(1.0-smoothstep(.35,1.05,behind));
 float d=length(delta),bodyRing=1.0-smoothstep(.018,.065,abs(d-(.27+.035*sin(waterTime*1.5+float(i)))));
 float billRing=1.0-smoothstep(.018,.06,abs(length(delta-heading*.38)-(.06+duckPecks[i]*.12)));
 wakes+=(wake*swimming*.19+bodyRing*.025+billRing*duckPecks[i]*.11)*step(0.0,dot(normalize(p),duckUp));
}
float age=waterTime-pondPulse.w;
float impact=(1.0-smoothstep(.025,.09,abs(length(p-pondPulse.xyz)-age*.9)))*max(0.0,1.0-age/3.0)*step(0.0,age);
float crestPhase=dot(p,vec3(2.2,.47,-1.6))+detail*4.5+sin(dot(p,vec3(.57,.3,1.4))+waterTime*.12)*1.2-waterTime*.62;
float crestWidth=max(fwidth(crestPhase)*1.2,.035);
float crest=(1.0-smoothstep(.035,.035+crestWidth,abs(sin(crestPhase))))*smoothstep(.54,.76,detail)*smoothstep(.18,.65,depth);
float rainRipples=smoothstep(.96,1.0,sin(detail*42.0+broad*17.0-waterTime*6.0))*weatherRain*.045;
float glints=crest*.10+rainRipples;
diffuseColor.rgb=mix(tint,waterFoam,clamp(edge+wash+wakes+impact*.45+glints,0.0,.8));
diffuseColor.a=mix(.83,.98,smoothstep(.03,.5,depth));`)
 }
 material.customProgramCacheKey=()=> 'meadow-ocean-weather-swell-v7'
 const water=new THREE.Mesh(geometry,material);water.receiveShadow=true;a.scene.add(water)
 return{water,setWeather(state:Pick<WeatherState,'wind'|'rain'|'overcast'>){swell.value=THREE.MathUtils.clamp(.85+state.wind*.18,.85,1.3);rain.value=THREE.MathUtils.clamp(state.rain,0,1);cloud.value=THREE.MathUtils.clamp(state.overcast,0,1);material.roughness=.38+rain.value*.1},setDucks(points:THREE.Object3D[],states?:readonly{speed:number;peck:number}[]){for(let i=0;i<3;i++){const point=points[i];if(!point)continue;ducks.value[i]!.copy(point.position);point.getWorldDirection(direction);flow.value[i]!.set(direction.x,direction.y,direction.z,states?.[i]?.speed??0);pecks.value[i]=states?.[i]?.peck??0}},ripple(position:THREE.Vector3,at:number){pulse.value.set(position.x,position.y,position.z,at)},update(elapsed:number,reduced:boolean){time.value=reduced?0:elapsed}}
}
