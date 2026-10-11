import * as THREE from 'three'
import type {ArtKit} from '../explorer/art-kit.ts'
import {mergeCharacterParts} from '../explorer/character-mesh.ts'
export interface WildlifeMotion {speed?:number;peck?:number;bob?:number}

export function createWildlife(kit:ArtKit,species:'fox'|'rabbit'|'duck'){
 const avatar=new THREE.Group(),body=new THREE.Group(),head=new THREE.Group(),tail=new THREE.Group(),feet:THREE.Group[]=[],buckets=new Map<THREE.Object3D,THREE.Mesh[]>()
 avatar.add(body);body.add(head,tail);kit.scene.add(avatar)
 const fox=species==='fox',duck=species==='duck',coat=fox?'coral':'cream'
 function part(g:THREE.BufferGeometry,color:keyof ArtKit['palette'],p:[number,number,number],s:[number,number,number],parent:THREE.Object3D){const m=kit.mesh(g,color,p,s,parent,true,false),pieces=buckets.get(parent)??[];pieces.push(m);buckets.set(parent,pieces);return m}
 part(kit.sphere,coat,[0,.30,0],duck?[.25,.22,.38]:[.22,.25,.36],body);head.position.set(0,duck?.53:.52,.27)
 part(kit.sphere,coat,[0,0,0],duck?[.18,.20,.18]:[.24,.23,.22],head)
 part(kit.sphere,duck?'gold':'cream',[0,-.065,.17],duck?[.15,.052,.17]:[.15,.10,.12],head)
 if(!duck)part(kit.sphere,'navy',[0,-.035,.27],[.045,.035,.035],head)
 for(const side of [-1,1]){part(kit.sphere,'navy',[side*.09,.035,.175],[.028,.041,.018],head);part(kit.sphere,'cream',[side*.085,.047,.193],[.009,.012,.008],head)
  if(!duck){const ear=part(fox?kit.cone:kit.sphere,coat,[side*.15,fox?.23:.34,0],fox?[.10,.23,.10]:[.075,.28,.07],head);ear.rotation.z=side*(fox?-.12:-.18);part(kit.sphere,fox?'navy':'coral',[side*.15,fox?.245:.36,.065],fox?[.052,.07,.012]:[.034,.18,.012],head)}
  const wing=part(kit.sphere,fox?'coral':'cream',[side*.20,.32,0],duck?[.055,.15,.24]:[.04,.08,.2],body);wing.rotation.y=side*.12
 }
 for(const x of [-.13,.13])for(const z of duck?[.04]:[-.23,.20]){const leg=new THREE.Group();leg.position.set(x,duck?.13:.22,z);body.add(leg);feet.push(leg);part(kit.sphere,duck?'gold':fox?'navy':'cream',[0,-.12,.035],duck?[.10,.028,.16]:[.07,.14,.09],leg)}
 tail.position.set(0,.40,-.30);if(fox){const t=part(kit.sphere,'coral',[0,.12,-.18],[.16,.18,.34],tail);t.rotation.x=-.35;part(kit.sphere,'cream',[0,.22,-.41],[.12,.12,.14],tail)}else part(kit.sphere,'cream',[0,0,duck?-.07:0],duck?[.12,.08,.16]:[.12,.12,.12],tail)
 buckets.forEach((parts,parent)=>mergeCharacterParts(kit,parts,parent));let stride=0
 let neck=head
 if(duck){neck=new THREE.Group();neck.position.set(0,.29,.15);body.add(neck);neck.add(head);head.position.set(0,.24,.12);body.position.y=-.24}
 body.name=`${species}-body`;head.name=`${species}-head`;neck.name=duck?'duck-neck':head.name;tail.name=`${species}-tail`;feet.forEach((foot,i)=>{foot.name=`${species}-foot-${i}`})
 return{avatar,update(dt:number,time:number,reduced:boolean,state?:WildlifeMotion,excited=false){
  if(duck){
   const speed=THREE.MathUtils.clamp(state?.speed??0,0,.8),swim=Math.min(speed/.55,1),peck=THREE.MathUtils.clamp(state?.peck??0,0,1)
   if(!reduced)stride+=Math.max(0,dt)*speed*7
   feet.forEach((foot,i)=>{foot.rotation.x=reduced?0:Math.sin(stride+i*Math.PI)*swim*.22;foot.rotation.y=reduced?0:Math.cos(stride+i*Math.PI)*swim*.05})
   body.position.y=-.24+(reduced?0:THREE.MathUtils.clamp(state?.bob??0,-.035,.035));body.rotation.x=reduced?0:swim*.035;body.rotation.z=reduced?0:Math.sin(stride)*swim*.009
   neck.rotation.x=peck*1.15;neck.position.y=.29-peck*.025;head.rotation.z=0;tail.rotation.y=0;return
  }
  const speed=state?.speed??.3;stride+=dt*speed*7;feet.forEach((f,i)=>{f.rotation.x=reduced?0:Math.sin(stride+i*Math.PI)*Math.min(speed,1)*.5});body.position.y=reduced?0:Math.abs(Math.sin(stride))*(species==='rabbit'?.12:.025);head.rotation.z=reduced?0:excited?Math.sin(time*6)*.12:.04;tail.rotation.y=reduced?0:Math.sin(time*(excited?11:5))*.20
 }}
}
