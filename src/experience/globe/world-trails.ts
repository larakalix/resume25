import {coastalFootprint} from './coastal-crossing.ts'
import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import type {MapPoint} from './types.ts'
import {heightAt,normalAt,mapAt,RADIUS,WATER,terrainHeight} from './geography.ts'
import {bridgeFootprint} from './bridge.ts'
import {cityPaved} from './city-district.ts'
import {japanPaved} from './japan-district.ts'
import {worldPaths,worldRadius,longitudeDelta,longitudeLimit,wrapLongitude} from './world-expansion.ts'

export const worldTrailStyle={halfWidth:1.1,step:.35,lift:.035,color:0xdfcba4} as const
export function worldTrailAllowed(point:MapPoint){return !coastalFootprint(point)&&!bridgeFootprint(point,-.0001)&&!cityPaved(point)&&!japanPaved(point)&&terrainHeight(normalAt(point.x,point.z))>WATER+.07}

/** A real shallow ribbon avoids the coarse terrain's blocky diagonal path colouring. */
export function buildWorldTrails(a:GlobeArtist){
 const vertices:number[]=[],vertex=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3(),face=new THREE.Vector3()
 function offset(point:MapPoint,x:number,z:number):MapPoint{
  const u=point.x/worldRadius,v=point.z/worldRadius,n=normalAt(point.x,point.z),r=RADIUS+heightAt(point),east={x:Math.cos(u),y:-Math.sin(u)},south={x:-Math.sin(u)*Math.sin(v),y:-Math.cos(u)*Math.sin(v),z:Math.cos(v)}
  vertex.set(n.x*r+east.x*x+south.x*z,n.y*r+east.y*x+south.y*z,n.z*r+south.z*z).normalize();return mapAt(vertex)
 }
 function position(point:MapPoint){const n=normalAt(point.x,point.z),r=RADIUS+heightAt(point)+worldTrailStyle.lift;return new THREE.Vector3(n.x*r,n.y*r,n.z*r)}
 function triangle(p:MapPoint,q:MapPoint,r:MapPoint){
  if(!worldTrailAllowed(p)||!worldTrailAllowed(q)||!worldTrailAllowed(r))return
  const a=position(p),b=position(q),c=position(r),mid=a.clone().add(b).add(c).normalize()
  if(!worldTrailAllowed(mapAt(mid)))return
  ab.subVectors(b,a);ac.subVectors(c,a);face.crossVectors(ab,ac);if(face.lengthSq()<1e-12)return
  for(const point of face.dot(mid)<0?[a,c,b]:[a,b,c])vertices.push(point.x,point.y,point.z)
 }
 function direction(from:MapPoint,to:MapPoint,at:MapPoint){const x=longitudeDelta(from.x,to.x)*Math.cos(at.z/worldRadius),z=to.z-from.z,length=Math.hypot(x,z)||1;return{x:x/length,z:z/length}}
 for(const line of worldPaths){
  const points:MapPoint[]=[]
  for(let i=1;i<line.length;i++){
   const from=line[i-1]!,to=line[i]!,dx=longitudeDelta(from.x,to.x),dz=to.z-from.z,minLatitude=from.z*to.z<=0?0:Math.min(Math.abs(from.z),Math.abs(to.z)),upperLength=Math.hypot(dx*Math.cos(minLatitude/worldRadius),dz),steps=Math.max(1,Math.ceil(upperLength/worldTrailStyle.step))
   for(let step=i===1?0:1;step<=steps;step++)points.push({x:wrapLongitude(from.x+dx*step/steps),z:from.z+dz*step/steps})
  }
  const sections=points.map((point,i)=>{
   const incoming=direction(points[Math.max(0,i-1)]!,point,i?point:points[1]!),outgoing=direction(point,points[Math.min(points.length-1,i+1)]!,point)
   const x=i===0?outgoing.x:i===points.length-1?incoming.x:incoming.x+outgoing.x,z=i===0?outgoing.z:i===points.length-1?incoming.z:incoming.z+outgoing.z,length=Math.hypot(x,z)||1,forward={x:x/length,z:z/length}
   const miter=i===0||i===points.length-1?1:1/Math.max(.5,forward.x*outgoing.x+forward.z*outgoing.z),width=worldTrailStyle.halfWidth*miter
   return{point,forward,left:offset(point,-forward.z*width,forward.x*width),right:offset(point,forward.z*width,-forward.x*width)}
  })
  for(let i=1;i<sections.length;i++){const from=sections[i-1]!,to=sections[i]!;triangle(from.left,to.left,from.right);triangle(from.right,to.left,to.right)}
  // Round only the exposed ends; the date-line endpoints meet their counterpart exactly.
  for(const end of [0,sections.length-1]){
   const section=sections[end];if(!section||Math.abs(Math.abs(section.point.x)-longitudeLimit)<1e-5)continue
   const sign=end===0?-1:1,{x,z}=section.forward,side={x:-z,z:x};let previous=section.left
   for(let step=1;step<=10;step++){
    const angle=step*Math.PI/10,next=offset(section.point,(side.x*Math.cos(angle)+x*Math.sin(angle)*sign)*worldTrailStyle.halfWidth,(side.z*Math.cos(angle)+z*Math.sin(angle)*sign)*worldTrailStyle.halfWidth)
    triangle(section.point,previous,next);previous=next
   }
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.name='whole-globe-trail-ribbons';geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();a.kit.geometries.push(geometry)
 const material=new THREE.MeshStandardMaterial({color:worldTrailStyle.color,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),mesh=new THREE.Mesh(geometry,material)
 mesh.name='whole-globe-trails';mesh.receiveShadow=true;mesh.userData.worldPaths=worldPaths.length;a.kit.extras.push(material);a.scene.add(mesh);return mesh
}
