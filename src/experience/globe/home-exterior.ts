import type {GlobeArtist} from './art-kit.ts'
import type {Building} from './layout.ts'
import type * as THREE from 'three'

/** Complementary details around the actual three-level Cube010 source house. */
export function buildIvanHomeExterior(a:GlobeArtist,house:Building,root:THREE.Object3D){
 const w=house.width,front=.4053*w,balconyY=.765*w,balconyWidth=.73*w,depth=.72
 const balcony=a.block('cream',[0,balconyY,front+depth/2-.05],[balconyWidth,.16,depth],root);balcony.name='ivan-home-balcony'
 a.block('blue',[0,balconyY-.08,front+depth/2-.05],[balconyWidth+.08,.065,depth+.06],root)
 for(const x of [-balconyWidth/2+.08,balconyWidth/2-.08]){
  a.block('navy',[x,balconyY+.48,front+depth-.08],[.07,.94,.07],root)
  a.block('navy',[x,balconyY+.48,front+.06],[.07,.94,.07],root)
  a.block('navy',[x,balconyY+.94,front+depth/2-.01],[.055,.055,depth],root)
 }
 a.block('navy',[0,balconyY+.94,front+depth-.08],[balconyWidth,.06,.06],root)
 for(let i=0;i<12;i++)a.block('navy',[-balconyWidth/2+.14+i*(balconyWidth-.28)/11,balconyY+.48,front+depth-.08],[.035,.87,.035],root)
 for(const x of [-balconyWidth/2+.28,balconyWidth/2-.28]){
  a.block('wood',[x,balconyY+.25,front+depth-.16],[.42,.28,.25],root)
  for(let i=0;i<3;i++)a.mesh(a.kit.sphere,i===1?'coral':'mint',[x+(i-1)*.12,balconyY+.48,front+depth-.16],[.13,.15,.13],root)
 }
 // Three horizontal window levels are already part of the imported mesh; the terrace never stretches them.
 const doorX=.176095*w
 const steps=[]
 for(let i=0;i<3;i++){
  const step=a.block('cream',[doorX,.028+i*.022,house.depth/2+.16-i*.09],[1.48-i*.08,.05+i*.018,.40-i*.07],root);step.name=`ivan-home-entry-step-${i+1}`;steps.push(step)
 }
 for(const x of [-w*.34,w*.34]){
  a.mesh(a.kit.cylinder,'wood',[x,.28,house.depth/2+.16],[.22,.56,.22],root)
  a.mesh(a.kit.cone,'green',[x,.90,house.depth/2+.16],[.30,.95,.30],root)
 }
 const canopy=a.block('blue',[doorX,2.24,front+.23],[1.8,.14,.55],root);canopy.name='ivan-home-door-canopy'
 return{balcony,steps,canopy}
}
