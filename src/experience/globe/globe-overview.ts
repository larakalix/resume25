import * as THREE from 'three'
import {worldRadius} from './world-expansion.ts'
import type {MapPoint} from './types.ts'

const polarAxis=new THREE.Vector3(0,0,1)
/** Return to a globe view above the current explorer, avoiding a camera flight through the planet. */
export function alignGlobeOverview(point:MapPoint,orbit:{x:number;y:number}){
 orbit.x=Math.atan2(.40,1.5)-point.x/worldRadius
 orbit.y=Math.sin(point.z/worldRadius)-.58/Math.hypot(.40,1.5,.58)
}
/** Orbit around the globe's latitude axis, so dragging can reveal its actual back hemisphere. */
export function globeOverview(longitude:number,tilt:number,distance:number,position:THREE.Vector3,up:THREE.Vector3){
 position.set(.40,1.5,.58).normalize().applyAxisAngle(polarAxis,longitude).addScaledVector(polarAxis,tilt).normalize().multiplyScalar(distance)
 up.set(0,1,0).applyAxisAngle(polarAxis,longitude)
}
