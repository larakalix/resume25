import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import {secretDefinitions} from './secrets.ts'
import type {RoomId} from './types.ts'

/** Original miniature props, owned and batched by the same art owner as their surrounding room. */
export function buildSecretArt(a:GlobeArtist,room:RoomId|null=null,locations?:readonly{id:string;x:number;z:number}[]){
 const groups:THREE.Group[]=[]
 for(const secret of secretDefinitions){
  if(('room' in secret?secret.room:null)!==room)continue
  const location=locations?.find(item=>item.id===secret.id)??secret
  const group=room?new THREE.Group():a.root(location.x,location.z)
  if(room){group.position.set(secret.x,0,secret.z);a.scene.add(group)}
  group.name=secret.id;groups.push(group)
  const {kit,mesh,block}=a
  const sphere=new THREE.SphereGeometry(1,8,6);kit.geometries.push(sphere)
  if(secret.variant==='trophy'){
   block('navy',[0,.28,0],[.48,.56,.42],group)
   block('gold',[0,.59,0],[.30,.08,.28],group)
   mesh(kit.cylinder,'gold',[0,.70,0],[.065,.20,.065],group)
   const cup=mesh(sphere,'gold',[0,.86,0],[.20,.18,.15],group);cup.rotation.z=.1
   for(const side of [-1,1])mesh(kit.torus,'gold',[side*.16,.86,0],[.10,.10,.045],group)
   block('cream',[0,.35,.215],[.26,.15,.015],group)
  }else if(secret.variant==='shell'){
   mesh(kit.leaf,'sand',[0,.12,0],[.48,.14,.36],group)
   for(let i=0;i<7;i++){
    const rib=mesh(sphere,i%2?'pale':'cream',[Math.sin((i-3)*.25)*.19,.27,Math.abs(i-3)*.02],[.075,.14-(Math.abs(i-3)*.013),.22],group)
    rib.rotation.z=-(i-3)*.16
   }
   mesh(sphere,'gold',[0,.23,.17],[.065,.065,.065],group)
  }else{
   block('wood',[0,.28,0],[.54,.10,.40],group)
   mesh(kit.cylinder,'wood',[0,.13,0],[.09,.26,.09],group)
   const geometry=new THREE.BufferGeometry()
   geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,.58,-.42,-.39,.39,.31,0,.46,.14,0,.58,-.42,0,.46,.14,.39,.39,.31,0,.58,-.42,0,.34,.30,0,.46,.14],3))
   geometry.computeVertexNormals();geometry.computeBoundingSphere();kit.geometries.push(geometry)
   const material=kit.materials.cream.clone();material.side=THREE.DoubleSide;kit.extras.push(material)
   const plane=mesh(geometry,'cream',[0,0,0],[1,1,1],group);plane.material=material
  }
 }
 return groups
}
