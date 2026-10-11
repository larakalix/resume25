import * as THREE from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import source from '../globe/assets/layered-cliffs.json' with {type:'json'}
import type {GlobeArtist} from '../globe/art-kit.ts'
import type {CompiledWorld} from './compile.ts'

/** Actual prepared SimplePolygon cliffs, newly placed along this world's outer coast. */
export function buildArchipelagoCliffs(a:GlobeArtist,world:CompiledWorld){
 const pieces:THREE.BufferGeometry[]=[],sites:{x:number;z:number;sourceMesh:string}[]=[],sample=new THREE.Vector3(),normal=new THREE.Vector3(),color=new THREE.Color()
 for(const island of world.islands.filter(island=>island.theme==='maker'||island.theme==='coast'||island.theme==='orchard'))for(let i=0;i<4;i++){
  const side=i%2?1:-1,local={x:side*island.radiusX*.88,z:(i<2?-.31:.31)*island.radiusZ},point=world.localToMap(island.id,local.x,local.z)
  if(world.pathDistance(point)<4||world.buildings.some(building=>world.distance(point,building)<Math.hypot(building.width,building.depth)/2+1))continue
  const model=source.models[i%source.models.length]!,geometry=new THREE.BufferGeometry(),positions=new THREE.Float32BufferAttribute(model.positions,3),colors=new Float32Array(positions.count*3)
  geometry.setAttribute('position',positions);geometry.setIndex(model.indices)
  const matrix=a.frameAt(point.x,point.z,-1.7).multiply(new THREE.Matrix4().makeRotationY(side*Math.PI/2)).multiply(new THREE.Matrix4().makeScale(2.3,2.3,2.3));geometry.applyMatrix4(matrix)
  for(let vertex=0;vertex<positions.count;vertex++){
   sample.fromBufferAttribute(positions,vertex);const radius=sample.length();normal.copy(sample).normalize();const ground=world.terrainHeight(normal)
   // Recess dry vertices below the authored walking surface; cliffs never invent a ledge/collider.
   if(ground>world.WATER+.07&&radius>world.RADIUS+ground-.09)sample.multiplyScalar((world.RADIUS+ground-.09)/radius)
   positions.setXYZ(vertex,sample.x,sample.y,sample.z)
   color.setHex(island.theme==='coast'?0xc2b99c:0xb5ad93).multiplyScalar(.88+Math.floor(model.positions[vertex*3+1]!*6)*.025);colors.set(color.toArray(),vertex*3)
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();pieces.push(geometry);sites.push({...point,sourceMesh:model.name})
 }
 if(!pieces.length)return{triangles:0,sites,mesh:undefined}
 const geometry=mergeGeometries(pieces)!;pieces.forEach(piece=>piece.dispose());a.kit.geometries.push(geometry)
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true});a.kit.extras.push(material)
 const mesh=new THREE.Mesh(geometry,material);mesh.name='archipelago-native-layered-cliffs';mesh.castShadow=mesh.receiveShadow=true;a.scene.add(mesh)
 return{mesh,sites,triangles:(geometry.index?.count??geometry.attributes.position!.count)/3}
}
