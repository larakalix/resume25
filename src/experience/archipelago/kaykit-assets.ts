import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import manifest from '../../../public/models/kaykit/manifest.json' with {type:'json'}

/** One owner for native source meshes and their shared gradient atlas. */
export async function loadKayKit(signal:AbortSignal){
 const response=await fetch('/models/kaykit/harbor.glb',{signal});if(!response.ok)throw new Error('The harbor models could not be loaded.')
 const bytes=await response.arrayBuffer();signal.throwIfAborted();if(bytes.byteLength!==manifest.bytes)throw new Error('Incomplete harbor asset.')
 const gltf=await new GLTFLoader().parseAsync(bytes,''),geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>()
 gltf.scene.traverse(part=>{if(part instanceof THREE.Mesh){geometries.add(part.geometry);for(const material of Array.isArray(part.material)?part.material:[part.material]){materials.add(material);const map=(material as THREE.MeshStandardMaterial).map;if(map)textures.add(map)}}})
 let disposed=false
 function dispose(){if(disposed)return;disposed=true;geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());textures.forEach(value=>value.dispose());gltf.scene.clear()}
 if(signal.aborted){dispose();signal.throwIfAborted()}
 return{get(name:string){const source=gltf.scene.getObjectByName(name);if(!source||disposed)throw new Error(`Missing harbor model: ${name}`);return source.clone(true)},spec(name:string){return manifest.models.find(model=>model.name===name)},dispose}
}
export type KayKitLibrary=Awaited<ReturnType<typeof loadKayKit>>
