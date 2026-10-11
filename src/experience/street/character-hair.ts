import * as THREE from 'three'
import type {ArtKit,ArtColor} from '../explorer/art-kit.ts'

export type CharacterHairstyle='swept'|'crop'|'bob'|'curls'|'bun'|'quiff'
type Part=(geometry:THREE.BufferGeometry,color:ArtColor,position:[number,number,number],scale:[number,number,number],parent:THREE.Object3D)=>THREE.Mesh

/** Compact, closed hair silhouettes with an open forehead; no repeated dangling fringe tubes. */
export function buildCharacterHair(kit:ArtKit,part:Part,head:THREE.Object3D,style:CharacterHairstyle){
 head.userData.hairstyle=style
 const shape={swept:[1.12,2.02],crop:[1.01,1.92],bob:[1.22,2.45],curls:[1.08,2.05],bun:[1.04,2.06],quiff:[1.04,1.92]}[style]!,cap=new THREE.SphereGeometry(1,24,14),positions=cap.getAttribute('position')
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),phi=Math.atan2(z,x),theta=Math.acos(THREE.MathUtils.clamp(y,-1,1)),front=Math.max(0,Math.sin(phi)),end=THREE.MathUtils.lerp(shape[1]!,shape[0]!,front),angle=theta/Math.PI*end
  positions.setXYZ(i,Math.sin(angle)*Math.cos(phi)*.362,Math.cos(angle)*.375+.25,Math.sin(angle)*Math.sin(phi)*.315-.025)
 }
 cap.computeVertexNormals();cap.name=`character-hair-${style}`;kit.geometries.push(cap);part(cap,'hair',[0,0,0],[1,1,1],head)
 const lobe=new THREE.SphereGeometry(1,12,8);kit.geometries.push(lobe)
 const puff=(position:[number,number,number],scale:[number,number,number],tilt=0)=>{const value=part(lobe,'hair',position,scale,head);value.rotation.z=tilt;return value}
 if(style==='swept'){
  puff([-.135,.47,.226],[.175,.085,.076],-.28);puff([.115,.515,.185],[.125,.065,.073],.28)
 }else if(style==='crop'){
  puff([-.10,.605,.02],[.17,.045,.17],-.1);puff([.115,.595,.025],[.13,.04,.16],.08)
 }else if(style==='bob'){
  puff([-.31,.12,-.045],[.105,.235,.23],-.10);puff([.31,.12,-.045],[.105,.235,.23],.10);puff([0,.41,.258],[.265,.055,.045])
 }else if(style==='curls'){
  for(let i=0;i<7;i++){const angle=i/7*Math.PI*2;puff([Math.cos(angle)*.245,.48+Math.sin(angle)*.075,Math.sin(angle)*.205-.025],[.14,.135,.135],angle*.12)}
  puff([-.075,.645,-.03],[.15,.09,.16]);puff([.14,.612,.04],[.13,.095,.14])
 }else if(style==='bun'){
  puff([0,.43,-.325],[.185,.17,.19]);puff([-.14,.485,.215],[.145,.055,.055],-.18)
  const tie=new THREE.TorusGeometry(.14,.018,5,18);kit.geometries.push(tie);part(tie,'gold',[0,.43,-.32],[1,1,1],head)
 }else{
  puff([-.075,.615,.145],[.18,.115,.15],-.24);puff([.12,.63,.14],[.12,.085,.13],.2)
 }
}
