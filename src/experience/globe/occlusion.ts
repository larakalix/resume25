import * as THREE from 'three'
import {MeshBVH} from 'three-mesh-bvh'

export interface OcclusionGroup {id:string;meshes:THREE.Mesh[];visuals:THREE.Mesh[]}
export interface Occluder {id:string;opacity:number;intersects(ray:THREE.Ray,far:number):boolean;fade(value:number):void;dispose():void}

/** Dedicated materials prevent a faded house from changing another house, sign or night window. */
export function meshOccluder(group:OcclusionGroup):Occluder{
 const copies=new Map<THREE.Material,THREE.Material>(),originals=group.visuals.map(mesh=>({mesh,material:mesh.material,shadow:mesh.castShadow}))
 const copy=(material:THREE.Material)=>{let value=copies.get(material);if(!value){value=material.clone();value.onBeforeCompile=material.onBeforeCompile;value.customProgramCacheKey=material.customProgramCacheKey;copies.set(material,value)}return value}
 originals.forEach(({mesh,material})=>{mesh.material=Array.isArray(material)?material.map(copy):copy(material)})
 const localRay=new THREE.Ray(),directionEnd=new THREE.Vector3(),surfaces=group.meshes.map(mesh=>{mesh.updateWorldMatrix(true,false);return{tree:new MeshBVH(mesh.geometry),inverse:mesh.matrixWorld.clone().invert()}})
 return{id:group.id,opacity:1,
  intersects(ray,far){for(const {tree,inverse} of surfaces){localRay.copy(ray).applyMatrix4(inverse);directionEnd.copy(ray.direction).multiplyScalar(far).add(ray.origin).applyMatrix4(inverse);if(tree.raycastFirst(localRay,THREE.DoubleSide,.01,localRay.origin.distanceTo(directionEnd)))return true}return false},
  fade(value){this.opacity=value;for(const [original,material] of copies){const transparent=original.transparent||value<1;if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true}material.opacity=original.opacity*value;material.depthWrite=original.depthWrite&&value===1}originals.forEach(({mesh,shadow})=>{mesh.castShadow=shadow&&value===1})},
  dispose(){originals.forEach(({mesh,material,shadow})=>{mesh.material=material;mesh.castShadow=shadow});copies.forEach(material=>material.dispose());copies.clear()},
 }
}

/** Only obstructing crowns leave the opaque instance batch; other trees retain the shared draw call. */
export function instancedOccluder(id:string,source:THREE.InstancedMesh,indices:number[]):Occluder{
 const material=(source.material as THREE.Material).clone();material.onBeforeCompile=(source.material as THREE.Material).onBeforeCompile;material.customProgramCacheKey=(source.material as THREE.Material).customProgramCacheKey;material.transparent=true;material.depthWrite=false
 const overlay=new THREE.InstancedMesh(source.geometry,material,indices.length),color=new THREE.Color(),originals:THREE.Matrix4[]=[],hidden:THREE.Matrix4[]=[],spheres:THREE.Sphere[]=[],point=new THREE.Vector3(),tiny=new THREE.Vector3(1e-6,1e-6,1e-6)
 source.geometry.computeBoundingSphere();source.updateWorldMatrix(true,false)
 indices.forEach((index,i)=>{const matrix=new THREE.Matrix4();source.getMatrixAt(index,matrix);originals.push(matrix);hidden.push(matrix.clone().scale(tiny));overlay.setMatrixAt(i,matrix);source.getColorAt(index,color);overlay.setColorAt(i,color);spheres.push(source.geometry.boundingSphere!.clone().applyMatrix4(matrix).applyMatrix4(source.matrixWorld))})
 overlay.matrixAutoUpdate=false;overlay.matrix.copy(source.matrix);overlay.visible=false;overlay.receiveShadow=source.receiveShadow;overlay.frustumCulled=false;source.parent!.add(overlay)
 let extracted=false
 function extract(value:boolean){if(value===extracted)return;extracted=value;indices.forEach((index,i)=>source.setMatrixAt(index,(value?hidden:originals)[i]!));source.instanceMatrix.needsUpdate=true;overlay.visible=value}
 return{id,opacity:1,
  intersects(ray,far){return spheres.some(sphere=>ray.intersectSphere(sphere,point)!==null&&point.distanceToSquared(ray.origin)<far*far)},
  fade(value){this.opacity=value;extract(value<1);material.opacity=value},
  dispose(){extract(false);overlay.removeFromParent();overlay.dispose();material.dispose()},
 }
}

export function createOcclusionFade(occluders:Occluder[]){
 const ray=new THREE.Ray(),anchor=new THREE.Vector3(),direction=new THREE.Vector3(),side=new THREE.Vector3(),heights=[.35,1.1,1.95,1.1,1.1],holds=new Float32Array(occluders.length),hidden:string[]=[]
 return{
  update(camera:THREE.Camera,feet:THREE.Vector3,up:THREE.Vector3,dt:number,enabled:boolean,instant:boolean){
   hidden.length=0;camera.updateMatrixWorld();side.setFromMatrixColumn(camera.matrixWorld,0)
   occluders.forEach((occluder,index)=>{
    let blocked=false
    if(enabled)for(let i=0;i<5&&!blocked;i++){
     anchor.copy(feet).addScaledVector(up,heights[i]!);if(i>=3)anchor.addScaledVector(side,i===3?-.25:.25)
     direction.copy(anchor).sub(camera.position);const far=direction.length()-.15;ray.set(camera.position,direction.normalize());blocked=far>0&&occluder.intersects(ray,far)
    }
    holds[index]=!enabled?0:blocked?.12:Math.max(0,holds[index]!-dt)
    const target=enabled&&holds[index]!>0?.14:1,rate=target<occluder.opacity?25:9
    let value=instant||!enabled?target:occluder.opacity+(target-occluder.opacity)*(1-Math.exp(-dt*rate));if(Math.abs(value-target)<.003)value=target
    if(value!==occluder.opacity)occluder.fade(value)
    if(value<.995)hidden.push(occluder.id)
   });return hidden
  },
  dispose(){occluders.forEach(occluder=>occluder.dispose())},
 }
}
