import * as THREE from 'three'
import type {WeatherState} from './weather.ts'
import type {QualityLevel} from './quality.ts'

export const rainBudget={desktop:512,mobile:256} as const
/** One compact line batch, reused forever; falling motion stays entirely on the GPU. */
export function createRainGeometry(){
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array(rainBudget.desktop*6),seeds=new Float32Array(rainBudget.desktop*2)
 let seed=71831
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 for(let i=0;i<rainBudget.desktop;i++){
  const x=(random()-.5)*22,z=(random()-.5)*22,phase=random()
  positions.set([x,0,z,x,.18+random()*.16,z],i*6);seeds[i*2]=seeds[i*2+1]=phase
 }
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('rainPhase',new THREE.BufferAttribute(seeds,1));geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,6,0),21)
 return geometry
}

export function createWeatherArt(scene:THREE.Scene){
 const geometry=createRainGeometry(),uniforms={rainTime:{value:0},rainWind:{value:0},rainAmount:{value:0},daylight:{value:1}},material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms,
  vertexShader:`attribute float rainPhase; uniform float rainTime; uniform float rainWind;
  void main(){vec3 p=position;float height=fract(rainPhase-rainTime*.83)*11.0;p.y+=height;p.x+=(11.0-height)*rainWind*.055;p.z+=(11.0-height)*rainWind*.025;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
  fragmentShader:`uniform float rainAmount; uniform float daylight;void main(){gl_FragColor=vec4(mix(vec3(.43,.56,.64),vec3(.73,.84,.86),daylight),rainAmount*.29);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>}`,
 }),rain=new THREE.LineSegments(geometry,material),up=new THREE.Vector3(0,1,0)
 rain.name='gentle-weather-rain';rain.visible=false;rain.renderOrder=2;scene.add(rain);let disposed=false
 return{rain,
  update(state:WeatherState,anchor:THREE.Vector3,normal:THREE.Vector3,small:boolean,quality:QualityLevel,inside:boolean,overview=false,day=1){
   if(disposed)return
   rain.visible=quality!=='low'&&!inside&&!overview&&state.rain>.001
   geometry.setDrawRange(0,rain.visible?(small?rainBudget.mobile:rainBudget.desktop)*2:0)
   uniforms.rainTime.value=state.time;uniforms.rainWind.value=state.wind;uniforms.rainAmount.value=state.rain;uniforms.daylight.value=Math.max(0,Math.min(1,day))
   rain.position.copy(anchor);up.copy(normal);if(up.lengthSq()<.5)up.set(0,1,0);else up.normalize();rain.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP,up)
  },
  dispose(){if(disposed)return;disposed=true;rain.removeFromParent();geometry.dispose();material.dispose()},
 }
}
