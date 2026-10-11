import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'

export interface ModelLibrary {get(name:string):THREE.BufferGeometry;dispose():void}
interface ModelManifest {bytes:number;models:readonly{name:string;width:number;height:number;depth:number;triangles:number}[]}

/** Prepared source geometry has one owner until its renderer clones it. */
export async function parseModelLibrary(bytes:ArrayBuffer,data:ModelManifest,signal?:AbortSignal):Promise<ModelLibrary>{
 signal?.throwIfAborted()
 if(bytes.byteLength!==data.bytes)throw new Error('Incomplete building model asset.')
 const asset=await new GLTFLoader().parseAsync(bytes,''),geometries=new Map<string,THREE.BufferGeometry>(),materials=new Set<THREE.Material>();let disposed=false
 const dispose=()=>{if(disposed)return;disposed=true;asset.scene.traverse(part=>{if(part instanceof THREE.Mesh){part.geometry.dispose();for(const material of Array.isArray(part.material)?part.material:[part.material])materials.add(material)}});materials.forEach(material=>material.dispose());asset.scene.clear();geometries.clear()}
 try{
  signal?.throwIfAborted()
  asset.scene.traverse(part=>{if(part instanceof THREE.Mesh)geometries.set(part.name,part.geometry)})
  if(geometries.size!==data.models.length)throw new Error('Incomplete building source mesh collection.')
  for(const source of data.models){
   const geometry=geometries.get(source.name),positions=geometry?.getAttribute('position'),colors=geometry?.getAttribute('color')
   if(!geometry||!positions||!colors||colors.count!==positions.count||(geometry.index?.count??positions.count)!==source.triangles*3)throw new Error(`Invalid building source mesh: ${source.name}`)
   geometry.computeBoundingBox();const box=geometry.boundingBox!,size=box.getSize(new THREE.Vector3())
   if(Math.abs(size.x-source.width)>.00001||Math.abs(size.y-source.height)>.00001||Math.abs(size.z-source.depth)>.00001||Math.abs(box.min.y)>.00001)throw new Error(`Building source bounds differ: ${source.name}`)
  }
  return{get(name){if(disposed)throw new Error('Building model library was already disposed.');const geometry=geometries.get(name);if(!geometry)throw new Error(`Missing building source mesh: ${name}`);return geometry},dispose}
 }catch(error){dispose();throw error}
}
