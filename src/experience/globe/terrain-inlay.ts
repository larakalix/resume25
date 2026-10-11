import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import {heightAt,normalAt,RADIUS} from './geography.ts'

/** Shallow coloured paving follows the same globe surface as walking and collisions. */
export function createTerrainInlay(a:GlobeArtist,name:string){
 const vertices:number[]=[],colors:number[]=[]
 return{
  quad(x0:number,z0:number,x1:number,z1:number,lift:number,color:THREE.Color){
   for(const [x,z] of [[x0,z0],[x0,z1],[x1,z0],[x1,z0],[x0,z1],[x1,z1]]){
    const point={x:x!,z:z!},n=normalAt(point.x,point.z),radius=RADIUS+heightAt(point)+lift
    vertices.push(n.x*radius,n.y*radius,n.z*radius);colors.push(color.r,color.g,color.b)
   }
  },
  finish(){
   const geometry=new THREE.BufferGeometry();geometry.name=name;geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();a.kit.geometries.push(geometry)
   const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.receiveShadow=true;a.kit.extras.push(material);a.scene.add(mesh);return mesh
  },
 }
}
