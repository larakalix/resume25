import * as THREE from 'three'
import type {MeshBVH} from 'three-mesh-bvh'

/** Protect the character's view without letting a nearby prop collapse the follow camera. */
export function createCameraClearance(tree:MeshBVH){
 const ray=new THREE.Ray(),anchor=new THREE.Vector3(),direction=new THREE.Vector3(),original=new THREE.Vector3(),candidate=new THREE.Vector3(),heights=[.3,1.1,1.95],lifts=[1.5,3]
 function allowance(position:THREE.Vector3,feet:THREE.Vector3,up:THREE.Vector3){
  let fraction=1
  // The composition target can be offshore or below a deck. Anchor visibility checks to the actual character.
  for(const lift of heights){
   anchor.copy(feet).addScaledVector(up,lift);direction.copy(position).sub(anchor);const length=direction.length()
   if(length<.001)continue
   ray.set(anchor,direction.multiplyScalar(1/length));const hit=tree.raycastFirst(ray,THREE.DoubleSide,.15,length+.4)
   if(hit)fraction=Math.min(fraction,Math.max(0,hit.distance-.4)/length)
  }
  return fraction
 }
 return(target:THREE.Vector3,follow:THREE.Vector3,feet:THREE.Vector3,up:THREE.Vector3)=>{
  const fraction=allowance(follow,feet,up);if(fraction===1)return
  original.copy(follow)
  // A modest pull-in is useful for a distant obstacle, but ankle-height rails must not become a close-up.
  if(fraction>=.65){
   candidate.copy(original).sub(target).multiplyScalar(fraction).add(target)
   if(allowance(candidate,feet,up)===1){follow.copy(candidate);return}
  }
  // Keep the normal distance and take a bounded higher view. A nearby low rail may still cover a foot;
  // chasing that last ray indefinitely would produce a much worse camera angle.
  for(const lift of lifts){candidate.copy(original).addScaledVector(up,lift);if(allowance(candidate,feet,up)===1)break}
  follow.copy(candidate)
 }
}
