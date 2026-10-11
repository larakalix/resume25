import {lighthouse} from './lighthouse.ts'
import {coastalFootprint} from './coastal-crossing.ts'
import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import type {MapPoint} from './types.ts'
import {RADIUS,WATER,normalAt,terrainHeight as legacyTerrainHeight,pathDistance} from './geography.ts'
import {bridgeFootprint} from './bridge.ts'
import {cityPaved} from './city-district.ts'
import {japanPaved} from './japan-district.ts'
import {insideBuildingFootprint,insideRoundFootprint} from './building-footprint.ts'
import {windmill} from './windmill.ts'
import {dockFootprint} from './duck-dock.ts'
import {harborFootprint} from './harbor.ts'
import {buildings} from './layout.ts'

export const footprintStyle={capacity:96,lifetime:8,fadeStart:5,opacity:.27,footOffset:.16,lift:.025} as const

/** Match the dry, sandy path and shoreline bands; never stamp stone, grass, water or houses. */
export function isFootprintSand(point:MapPoint){
 if(!Number.isFinite(point.x)||!Number.isFinite(point.z)||coastalFootprint(point,.08)||harborFootprint(point,.08)||dockFootprint(point,.08)||bridgeFootprint(point,.08)||cityPaved(point)||japanPaved(point,.35)||insideRoundFootprint(point,lighthouse,.15)||insideRoundFootprint(point,windmill,.15))return false
 const height=legacyTerrainHeight(normalAt(point.x,point.z))
 return height>WATER+.07&&(height<.12||pathDistance(point)<1.14)&&!buildings.some(building=>insideBuildingFootprint(point,building,.15))
}

const legacyFootprintSand=isFootprintSand

/** Relative opacity, also useful to renderer-independent lifecycle consumers. */
export function footprintFade(age:number){
 if(!Number.isFinite(age)||age<0||age>=footprintStyle.lifetime)return 0
 const t=Math.max(0,(age-footprintStyle.fadeStart)/(footprintStyle.lifetime-footprintStyle.fadeStart))
 return 1-t*t*(3-2*t)
}

/** Original split sole: rounded toe, separate heel and a soft impression edge, without a texture. */
export function createBootprintGeometry(){
 const positions:number[]=[],edges:number[]=[],indices:number[]=[]
 function pad(cx:number,cz:number,rx:number,rz:number,segments:number){
  const first=positions.length/3
  positions.push(cx,-(cx*cx+cz*cz)/(2*RADIUS),cz);edges.push(1)
  for(const size of [.78,1])for(let i=0;i<segments;i++){
   const angle=i/segments*Math.PI*2,x=cx+Math.sin(angle)*rx*size,z=cz+Math.cos(angle)*rz*size
   positions.push(x,-(x*x+z*z)/(2*RADIUS),z);edges.push(size===1?0:1)
  }
  for(let i=0;i<segments;i++){
   const next=(i+1)%segments,a=first+1+i,b=first+1+next,c=a+segments,d=b+segments
   indices.push(first,a,b,a,c,b,b,c,d)
  }
 }
 pad(.012,.075,.112,.15,12);pad(-.005,-.125,.081,.064,8)
 const geometry=new THREE.BufferGeometry();geometry.name='sand-boot-impression'
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('footprintEdge',new THREE.Float32BufferAttribute(edges,1));geometry.setIndex(indices)
 geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry
}

/** A bounded, single-draw decal pool. Only actual footsteps upload instance data. */
export function createFootprints(a:GlobeArtist,surface?:{terrainHeight:typeof legacyTerrainHeight;isSand:(point:MapPoint)=>boolean}){
 const terrainHeight=surface?.terrainHeight??legacyTerrainHeight,isFootprintSand=surface?.isSand??legacyFootprintSand
 const geometry=createBootprintGeometry(),life=new THREE.InstancedBufferAttribute(new Float32Array(footprintStyle.capacity*2),2),now={value:0},births=new Float64Array(footprintStyle.capacity)
 life.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('footprintLife',life);births.fill(-Infinity)
 const material=new THREE.MeshBasicMaterial({color:0x574532,transparent:true,opacity:footprintStyle.opacity,blending:THREE.MultiplyBlending,premultipliedAlpha:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:false})
 material.onBeforeCompile=shader=>{
  shader.uniforms.footprintNow=now
  shader.vertexShader='attribute vec2 footprintLife; attribute float footprintEdge; uniform float footprintNow; varying float vFootprintAlpha;\n'+shader.vertexShader
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
transformed.x*=footprintLife.y;
float footprintAge=footprintNow-footprintLife.x;
vFootprintAlpha=footprintEdge*(1.0-smoothstep(${footprintStyle.fadeStart}.0,${footprintStyle.lifetime}.0,footprintAge))*step(0.0,footprintAge);`)
  shader.fragmentShader='varying float vFootprintAlpha;\n'+shader.fragmentShader
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(vFootprintAlpha<.002)discard; diffuseColor.rgb=mix(vec3(1.0),diffuseColor.rgb,diffuseColor.a*vFootprintAlpha); diffuseColor.a=1.0;')
 }
 material.customProgramCacheKey=()=> 'sand-boot-impression-v1'
 const mesh=new THREE.InstancedMesh(geometry,material,footprintStyle.capacity);mesh.name='Sand footprints';mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=1;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
 a.scene.add(mesh);a.kit.geometries.push(geometry);a.kit.extras.push(material);a.kit.instances.push(mesh)
 const radial=new THREE.Vector3(),east=new THREE.Vector3(),south=new THREE.Vector3(),center=new THREE.Vector3(),first=new THREE.Vector3(),second=new THREE.Vector3(),right=new THREE.Vector3(),forward=new THREE.Vector3(),up=new THREE.Vector3(),vertex=new THREE.Vector3(),matrix=new THREE.Matrix4(),mapped:MapPoint={x:0,z:0}
 let cursor=0,filled=0,active=0,centerRadius=RADIUS
 function map(vector:THREE.Vector3){const length=vector.length();mapped.x=Math.atan2(vector.x,vector.y)*RADIUS;mapped.z=Math.asin(THREE.MathUtils.clamp(vector.z/length,-1,1))*RADIUS;return mapped}
 function ground(out:THREE.Vector3,x:number,z:number){out.copy(radial).multiplyScalar(centerRadius).addScaledVector(east,x).addScaledVector(south,z).normalize();return out.multiplyScalar(RADIUS+terrainHeight(out))}
 function update(time:number){
  if(!Number.isFinite(time)||time<0)return
  now.value=time;active=0
  for(let i=0;i<filled;i++)if(time>=births[i]!&&time-births[i]!<footprintStyle.lifetime)active++
 }
 return{mesh,get count(){return active},update,
  stamp(point:MapPoint,yaw:number,left:boolean,time:number){
   if(!Number.isFinite(yaw)||!Number.isFinite(time)||time<0||!isFootprintSand(point))return false
   const n=normalAt(point.x,point.z),u=point.x/RADIUS,side=left?-1:1
   radial.set(n.x,n.y,n.z);east.set(Math.cos(u),-Math.sin(u),0);south.crossVectors(east,radial).normalize()
   // Offset in physical tangent metres, including at compressed polar longitudes.
   center.copy(radial).multiplyScalar(RADIUS+terrainHeight(n)).addScaledVector(east,Math.cos(yaw)*side*footprintStyle.footOffset).addScaledVector(south,-Math.sin(yaw)*side*footprintStyle.footOffset)
   if(!isFootprintSand(map(center)))return false
   radial.copy(center).normalize();centerRadius=RADIUS+terrainHeight(radial);center.copy(radial).multiplyScalar(centerRadius)
   const longitude=Math.atan2(radial.x,radial.y);east.set(Math.cos(longitude),-Math.sin(longitude),0);south.crossVectors(east,radial).normalize()
   // Stamp-only finite samples follow the real bank slope, rather than a floating radial plane.
   ground(first,.1,0);ground(second,-.1,0);right.subVectors(first,second).normalize()
   ground(first,0,.1);ground(second,0,-.1);forward.subVectors(first,second).normalize();up.crossVectors(forward,right).normalize()
   const heading=yaw+side*.035;forward.copy(east).multiplyScalar(Math.sin(heading)).addScaledVector(south,Math.cos(heading));forward.addScaledVector(up,-forward.dot(up)).normalize();right.crossVectors(up,forward).normalize()
   matrix.makeBasis(right,up,forward);matrix.setPosition(center.addScaledVector(radial,footprintStyle.lift))
   // The entire feathered outline must remain on sand, even at a path or water boundary.
   const position=geometry.attributes.position!,edge=geometry.attributes.footprintEdge!
   for(let i=0;i<position.count;i++)if(edge.getX(i)===0){vertex.fromBufferAttribute(position,i);vertex.x*=side;vertex.applyMatrix4(matrix);if(!isFootprintSand(map(vertex)))return false}
   mesh.setMatrixAt(cursor,matrix);life.setXY(cursor,time,side);births[cursor]=time;cursor=(cursor+1)%footprintStyle.capacity;filled=Math.min(filled+1,footprintStyle.capacity);mesh.count=filled
   mesh.instanceMatrix.needsUpdate=true;life.needsUpdate=true;update(Math.max(now.value,time));return true
  },
  clear(){cursor=filled=active=mesh.count=0;births.fill(-Infinity);now.value=0},
 }
}
