import * as THREE from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import data from './assets/layered-cliffs.json' with {type:'json'}
import type {GlobeArtist} from './art-kit.ts'
import {frameAt} from './art-kit.ts'
import {terrainHeight,RADIUS,WATER} from './terrain.ts'

export const cliffCredit={text:data.credit,creator:data.creator,source:data.source,reference:data.reference,licenseUrl:data.licenseUrl}
export interface CityCliffPlacement {x:number;z:number;model:number;yaw:number;width:number;height:number;depth:number}
export const cityCliffSites:readonly CityCliffPlacement[]=[
 ...[-1,1].flatMap(side=>[33,38,43,48].map((z,index)=>({x:side*59.3,z,model:index%3,yaw:side*Math.PI*.5,width:1.55,height:2.15,depth:2.1}))),
 ...[-36,-18,0,18,36].map((x,index)=>({x,z:56.5,model:(index+1)%3,yaw:Math.PI,width:2.1,height:2.15,depth:1.6})),
]

/** Dry coastal surfaces are visual foundations, recessed beneath the existing walking surface. */
function recessDrySurface(geometry:THREE.BufferGeometry){
 const positions=geometry.getAttribute('position'),indices=geometry.index!,drops=new Float32Array(positions.count),resolution=10,margin=.13
 for(let iteration=0;iteration<6;iteration++){
  drops.fill(0);let changed=false
  for(let triangle=0;triangle<indices.count;triangle+=3){
   const ia=indices.getX(triangle),ib=indices.getX(triangle+1),ic=indices.getX(triangle+2)
   let drop=0
   for(let row=0;row<=resolution;row++)for(let col=0;col<=resolution-row;col++){
    const b=row/resolution,c=col/resolution,a=1-b-c,x=positions.getX(ia)*a+positions.getX(ib)*b+positions.getX(ic)*c,y=positions.getY(ia)*a+positions.getY(ib)*b+positions.getY(ic)*c,z=positions.getZ(ia)*a+positions.getZ(ib)*b+positions.getZ(ic)*c,radius=Math.hypot(x,y,z)
    const ground=terrainHeight({x:x/radius,y:y/radius,z:z/radius})
    if(ground>WATER+.07)drop=Math.max(drop,radius-RADIUS-ground+margin)
   }
   if(drop>.00001){changed=true;for(const vertex of [ia,ib,ic])drops[vertex]=Math.max(drops[vertex]!,drop)}
  }
  if(!changed)break
  for(let vertex=0;vertex<positions.count;vertex++)if(drops[vertex]!>0){const x=positions.getX(vertex),y=positions.getY(vertex),z=positions.getZ(vertex),radius=Math.hypot(x,y,z),scale=(radius-drops[vertex]!)/radius;positions.setXYZ(vertex,x*scale,y*scale,z*scale)}
 }
}

/** Small prepared subset of SimplePolygon's licensed cliffs; no runtime model/texture fetch. */
export function cityCliffGeometry(site:CityCliffPlacement){
 const model=data.models[site.model]!,geometry=new THREE.BufferGeometry(),positions=new THREE.Float32BufferAttribute(model.positions,3),colors=new Float32Array(positions.count*3),base=new THREE.Color(0xbda483),tint=new THREE.Color(),matrix=frameAt(site.x,site.z,WATER-1.3)
 matrix.multiply(new THREE.Matrix4().makeRotationY(site.yaw)).multiply(new THREE.Matrix4().makeScale(site.width,site.height,site.depth))
 for(let vertex=0;vertex<positions.count;vertex++){
  const y=positions.getY(vertex),band=Math.floor(y*6),shade=.82+band*.026+(vertex%5)*.008
  tint.copy(base).multiplyScalar(shade);colors.set([tint.r,tint.g,tint.b],vertex*3)
 }
 geometry.setAttribute('position',positions);geometry.setIndex(model.indices);geometry.applyMatrix4(matrix);recessDrySurface(geometry);geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere()
 return geometry
}

/** One static vertex-coloured draw, with geometry/material owned by the existing art kit. */
export function buildCityCliffs(a:GlobeArtist){
 const pieces=cityCliffSites.map(cityCliffGeometry),geometry=mergeGeometries(pieces)!
 pieces.forEach(piece=>piece.dispose());a.kit.geometries.push(geometry)
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true});a.kit.extras.push(material)
 const mesh=new THREE.Mesh(geometry,material);mesh.name='city-coastal-cliffs';mesh.castShadow=mesh.receiveShadow=true;a.scene.add(mesh)
 return{mesh,geometry,sites:cityCliffSites,credit:cliffCredit,triangles:geometry.index!.count/3}
}
