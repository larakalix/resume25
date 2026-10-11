import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {disposeSceneAsset} from '../explorer/scene-asset.ts'
import data from './assets/lighthouse.json' with {type:'json'}

/** One textured source instance owns its geometry, materials and decoded image until world teardown. */
export async function parseLighthouseAsset(bytes:ArrayBuffer,signal?:AbortSignal){
 signal?.throwIfAborted()
 if(bytes.byteLength!==data.bytes)throw new Error('Incomplete lighthouse model.')
 const asset=await new GLTFLoader().parseAsync(bytes,''),meshes:THREE.Mesh[]=[];let disposed=false
 const dispose=()=>{if(disposed)return;disposed=true;disposeSceneAsset(asset)}
 try{
  signal?.throwIfAborted()
  asset.scene.traverse(part=>{if(part instanceof THREE.Mesh)meshes.push(part)})
  if(meshes.length!==data.models.length)throw new Error('Incomplete lighthouse source meshes.')
  for(const source of data.models){const mesh=meshes.find(part=>part.name===source.name),geometry=mesh?.geometry,position=geometry?.getAttribute('position');if(!geometry||!position||(geometry.index?.count??position.count)!==source.triangles*3)throw new Error(`Invalid lighthouse mesh: ${source.name}`)}
  const bounds=new THREE.Box3().setFromObject(asset.scene),size=bounds.getSize(new THREE.Vector3())
  if(Math.abs(size.x-data.bounds.width)>.00001||Math.abs(size.y-1)>.00001||Math.abs(size.z-data.bounds.depth)>.00001||Math.abs(bounds.min.y)>.00001)throw new Error('Lighthouse source bounds differ.')
  const body=meshes.find(mesh=>mesh.name==='lighthouse_01')!,material=body.material as THREE.MeshStandardMaterial
  if(!material.map?.image)throw new Error('Lighthouse texture was not decoded.')
  return{scene:asset.scene,meshes,dispose}
 }catch(error){dispose();throw error}
}
export type LighthouseAsset=Awaited<ReturnType<typeof parseLighthouseAsset>>
export async function loadLighthouseAsset(signal:AbortSignal):Promise<LighthouseAsset>{
 const response=await fetch(`/models/lighthouse/lighthouse.glb?v=${data.sha256.slice(0,12)}`,{signal})
 if(!response.ok)throw new Error(`Lighthouse model: ${response.status}`)
 return parseLighthouseAsset(await response.arrayBuffer(),signal)
}
