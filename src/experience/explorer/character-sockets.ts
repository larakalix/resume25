import * as THREE from 'three'

/** Author a socket in the neutral world frame; its bone owns all subsequent motion. */
export function characterSocket(bone:THREE.Object3D,position:THREE.Vector3,scale=1){
    const result=new THREE.Group(),quaternion=bone.getWorldQuaternion(new THREE.Quaternion()),worldScale=bone.getWorldScale(new THREE.Vector3())
    result.position.copy(bone.worldToLocal(position));result.quaternion.copy(quaternion).invert();result.scale.set(scale/worldScale.x,scale/worldScale.y,scale/worldScale.z);bone.add(result)
    return result
}
