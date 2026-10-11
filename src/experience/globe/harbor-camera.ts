import * as THREE from 'three'
import {harborBasis} from './harbor.ts'

/** Frame the pier visitor and the moored ship together, including portrait screens. */
export function createHarborCamera(){
 const up=new THREE.Vector3(harborBasis.up.x,harborBasis.up.y,harborBasis.up.z),east=new THREE.Vector3(harborBasis.east.x,harborBasis.east.y,harborBasis.east.z),south=new THREE.Vector3(harborBasis.south.x,harborBasis.south.y,harborBasis.south.z)
 return(player:THREE.Vector3,ship:THREE.Vector3,small:boolean,position:THREE.Vector3,target:THREE.Vector3)=>{
  target.copy(player).addScaledVector(up,1.2).lerp(ship,small?.5:.45)
  position.copy(player).addScaledVector(up,small?17:10.5).addScaledVector(south,small?25:18).addScaledVector(east,small?-12:3.5)
 }
}
