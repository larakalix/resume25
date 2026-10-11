import {coastalFootprint} from './coastal-crossing.ts'
import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import {palette} from './art-kit.ts'
import {RADIUS,WATER,mapAt,terrainHeight as legacyTerrainHeight,wet as legacyWet,random,pathDistance as legacyPathDistance,localPaths as legacyLocalPaths} from './geography.ts'
import {buildings as legacyBuildings,treeSites as legacyTrees} from './layout.ts'
import {buildMeadow,meadowPatch} from './meadow.ts'
import {buildWater} from './water.ts'
import {bridge,bridgeFootprint,bridgeCutouts} from './bridge.ts'
import {breezeShader,canopyBendShader,canopyNormalShader,createBreeze} from './wind.ts'
import {dockFootprint} from './duck-dock.ts'
import {harborFootprint} from './harbor.ts'
import {japanPaved} from './japan-district.ts'
import type {WeatherState} from './weather.ts'
import type {CompiledWorld} from '../archipelago/compile.ts'

/** Fresh spherical heightfield, physical water/foam and instanced reactive meadow grass. */
export function buildLandscape(a:GlobeArtist,world?:CompiledWorld){
 const terrainHeight=world?.terrainHeight??legacyTerrainHeight,buildings=world?.buildings??legacyBuildings,treeSites=world?.treeSites??legacyTrees,wet=world?.wet??legacyWet,pathDistance=world?.pathDistance??legacyPathDistance,localPaths=world?.paths??legacyLocalPaths,frameAt=a.frameAt
 const {kit,scene,mesh,root,beam}=a,ground=new THREE.SphereGeometry(1,world?256:192,world?160:128),p=ground.attributes.position!,colors=new Float32Array(p.count*3),mapPoints=new Float32Array(p.count*2),green=new THREE.Color(world?0x8fbf82:palette.grass),sand=new THREE.Color(world?0xead7ad:palette.sand),dark=new THREE.Color(world?0x4b8b68:palette.green),color=new THREE.Color()
 for(let i=0;i<p.count;i++){const n={x:p.getX(i),y:p.getY(i),z:p.getZ(i)},h=terrainHeight(n),point=mapAt(n),road=pathDistance(point,localPaths);p.setXYZ(i,n.x*(RADIUS+h),n.y*(RADIUS+h),n.z*(RADIUS+h));color.copy(green).lerp(dark,.06+meadowPatch(point.x,point.z)*.22);if(h<.12)color.lerp(sand,Math.max(0,Math.min(1,(.16-h)*3)));if(road<1.2&&h>WATER+.05)color.copy(sand).lerp(new THREE.Color(0xe0cfa9),Math.max(0,1-road));colors.set([color.r,color.g,color.b],i*3);mapPoints.set([point.x,point.z],i*2)}
 ground.setAttribute('terrainMapPoint',new THREE.BufferAttribute(mapPoints,2));ground.setAttribute('color',new THREE.BufferAttribute(colors,3));ground.computeVertexNormals();kit.geometries.push(ground);const groundMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});kit.extras.push(groundMat)
 // The coarse landscape must not poke through the finer paved deck along a riverbank.
 if(!world)groundMat.onBeforeCompile=shader=>{
  shader.uniforms.bridgeCutouts={value:bridgeCutouts.map(cutout=>new THREE.Vector4(cutout.minX,cutout.minZ,cutout.maxX,cutout.maxZ))}
  shader.vertexShader='attribute vec2 terrainMapPoint; varying vec2 vTerrainMapPoint;\n'+shader.vertexShader
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrainMapPoint=terrainMapPoint;')
  shader.fragmentShader=`uniform vec4 bridgeCutouts[${bridgeCutouts.length}]; varying vec2 vTerrainMapPoint;\n`+shader.fragmentShader
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\nfor(int i=0;i<${bridgeCutouts.length};i++){vec4 cutout=bridgeCutouts[i];if(vTerrainMapPoint.x>cutout.x&&vTerrainMapPoint.x<cutout.z&&vTerrainMapPoint.y>cutout.y&&vTerrainMapPoint.y<cutout.w)discard;}`)
 }
 groundMat.customProgramCacheKey=()=> 'meadow-all-bridge-cutouts-v2'
 const land=new THREE.Mesh(ground,groundMat);land.receiveShadow=true;scene.add(land)
 const surface=buildWater(a,terrainHeight)
 // Shared canopy instances have softly varied silhouettes and coherent local-up wind.
 const leafG=new THREE.SphereGeometry(1,14,10);kit.geometries.push(leafG);const leafMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9}),leafDepth=new THREE.MeshDepthMaterial(),breeze=createBreeze();kit.extras.push(leafMat,leafDepth)
 function crownShader(shader:THREE.WebGLProgramParametersWithUniforms,normals:boolean){
  shader.uniforms.windTime=breeze.time;shader.uniforms.windStrength=breeze.strength
  shader.vertexShader=breezeShader+shader.vertexShader
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+canopyBendShader)
  if(normals)shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n'+canopyNormalShader)
 }
 leafMat.onBeforeCompile=shader=>crownShader(shader,true);leafMat.customProgramCacheKey=()=> 'globe-leaf-breeze-v2'
 leafDepth.onBeforeCompile=shader=>crownShader(shader,false);leafDepth.customProgramCacheKey=()=> 'globe-leaf-depth-breeze-v2'
 const canopyGroups:{id:string;indices:number[]}[]=[],canopies=new THREE.InstancedMesh(leafG,leafMat,treeSites.length*3),matrix=new THREE.Matrix4(),local=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),scale=new THREE.Vector3();let count=0
 for(const [i,tree] of treeSites.entries()){const t=root(tree.x,tree.z),h=3.0*tree.size;mesh(kit.cylinder,'wood',[0,h*.5,0],[.16*tree.size,h,.16*tree.size],t);beam(new THREE.Vector3(0,h*.65,0),new THREE.Vector3(.6*tree.size,h*.95,.1),.09*tree.size,'wood',t)
  if(tree.pine){for(let j=0;j<3;j++)mesh(kit.cone,j%2?'grass':'green',[0,h*.65+j*.78*tree.size,0],[(1.5-j*.25)*tree.size,2.1*tree.size,(1.5-j*.25)*tree.size],t);a.fadeable(`pine-${i}`,t);continue}
  canopyGroups.push({id:`tree-${i}`,indices:[count,count+1,count+2]})
  for(let j=0;j<3;j++){v.set((j-1)*.65*tree.size,h+(j%2)*.65*tree.size,j===1?.15:0);scale.setScalar((j===1?1.65:1.35)*tree.size);local.compose(v,q,scale);matrix.multiplyMatrices(frameAt(tree.x,tree.z),local);canopies.setMatrixAt(count,matrix);canopies.setColorAt(count,new THREE.Color(i%3?0x5f985d:0x91b56e));count++}}
 canopies.count=count;canopies.customDepthMaterial=leafDepth;canopies.computeBoundingSphere();canopies.boundingSphere!.radius+=.16;canopies.instanceMatrix.needsUpdate=true;if(canopies.instanceColor)canopies.instanceColor.needsUpdate=true;canopies.castShadow=canopies.receiveShadow=true;scene.add(canopies);kit.instances.push(canopies)
 const meadow=buildMeadow(a,breeze.time,breeze.strength,world),rng=random(41772)
 // A few flower clusters and shoreline stones make close views worth exploring.
 const flowerG=new THREE.SphereGeometry(1,8,6);kit.geometries.push(flowerG)
 for(let i=0;i<100;i++){const point={x:(rng()-.5)*60,z:(rng()-.5)*56};if(world?(wet(point)||world.blocked(point)||world.surfaceAt(point)!=='grass'):(wet(point)||coastalFootprint(point,.7)||japanPaved(point,.4)||harborFootprint(point,.4)||dockFootprint(point,.35)||bridgeFootprint(point,bridge.vegetationMargin)||pathDistance(point)<1.7||buildings.some(b=>Math.abs(point.x-b.x)<b.width/2+1&&Math.abs(point.z-b.z)<b.depth/2+1)))continue;const f=root(point.x,point.z);for(let j=0;j<3;j++){const x=j*.15;mesh(kit.cylinder,'green',[x,.13,0],[.015,.26,.015],f);mesh(flowerG,j%2?'coral':'cream',[x,.29,0],[.13,.055,.13],f);mesh(flowerG,'gold',[x,.33,0],[.04,.03,.04],f)}}
 return{grass:meadow.grass,water:surface.water,canopies,canopyGroups,setDucks:surface.setDucks,ripple:surface.ripple,setWeather(state:WeatherState){breeze.setStrength(state.wind);surface.setWeather(state)},update(time:number,reduced:boolean,position:THREE.Vector3,overview:boolean,limit:number,far:number){breeze.update(time,reduced);surface.update(time,reduced);meadow.update(position,overview,limit,far)}}
}
