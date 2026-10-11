import {buildIvanHomeExterior} from './home-exterior.ts'
import * as THREE from 'three'
import type {GlobeArtist} from './art-kit.ts'
import type {Building} from './layout.ts'
import type {CityModelLibrary} from './city-models.ts'
import {cityModelCredit,cityModelDoors} from './city-model-specs.ts'
import {japaneseModelCredit,japaneseModelIds} from './japanese-model-specs.ts'
import {foundationGeometry} from './building-geometry.ts'
import {heightAt,mapAt,RADIUS} from './geography.ts'
import {buildBuildingSign,type SignTextLayout} from './building-signs.ts'

/** Actual source silhouettes and details, fitted without stretching or procedural replacement walls. */
export function buildImportedCityBuilding(a:GlobeArtist,house:Building&{cityModel?:string},models:CityModelLibrary){
 if(!house.cityModel)throw new Error('An imported building must name its actual source mesh.')
 const root=a.root(house.x,house.z),geometry=models.get(house.cityModel).clone(),material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,flatShading:true,roughness:.94,metalness:0,side:THREE.DoubleSide})
 geometry.name=`prepared-source-${house.cityModel}`;material.name='imported-house-vertex-colours';a.kit.geometries.push(geometry);a.kit.extras.push(material)
 const imported=a.mesh(geometry,'cream',[0,0,0],[house.width,house.width,house.width],root,true);imported.material=material;imported.name=`imported-city-${house.cityModel}`
 imported.userData.sourceMesh=house.cityModel;imported.userData.source=(japaneseModelIds.has(house.cityModel)?japaneseModelCredit:cityModelCredit).source
 root.name=`city-model-${house.id}`;root.userData.sourceMesh=house.cityModel
 root.updateWorldMatrix(true,false);const base=root.position.length(),sample=new THREE.Vector3(),foundation=foundationGeometry(house.width+.06,house.depth+.06,(x,z)=>{
  let lift=0;for(let i=0;i<4;i++){sample.set(x,lift,z).applyMatrix4(root.matrixWorld);const radius=RADIUS+heightAt(mapAt(sample.normalize()));lift=Math.sqrt(radius*radius-x*x-z*z)-base}return lift
 });a.kit.geometries.push(foundation);a.mesh(foundation,'sand',[0,0,0],[1,1,1],root)
 const side=house.modelFront==='east'?1:house.modelFront==='west'?-1:0,japanese=japaneseModelIds.has(house.cityModel)
 const signY=japanese?Math.min(3.4,house.height*(house.cityModel.startsWith('pagoda-')?1.45/7.1:.78)):Math.min(2.8,house.height*.62)
 const position:[number,number,number]=side?[side*(house.width/2+.08),signY,0]:[0,signY,house.depth/2+.08]
 const signWidth=Math.min(2.8,(side?house.depth:house.width)*.72)
 const sign=buildBuildingSign(a,house.name,{position,width:signWidth,theme:house.enter?'navy':'cream'},root)
 sign.rotation.y=side*Math.PI/2
 if(japanese){
  // Project source triangle bounds across the entire frame, including stepped/sloped eaves.
  const layout=sign.userData.signLayout as SignTextLayout,halfWidth=signWidth/2+.07,halfHeight=signWidth*layout.pixelHeight/layout.pixelWidth/2+.07
  const vertices=geometry.getAttribute('position'),index=geometry.index;let mount=-Infinity
  for(let triangle=0;triangle<(index?.count??vertices.count);triangle+=3){
   let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,front=-Infinity
   for(let corner=0;corner<3;corner++){
    const at=index?index.getX(triangle+corner):triangle+corner,x=vertices.getX(at)*house.width,y=vertices.getY(at)*house.width,z=vertices.getZ(at)*house.width,across=side?-side*z:x
    minX=Math.min(minX,across);maxX=Math.max(maxX,across);minY=Math.min(minY,y);maxY=Math.max(maxY,y);front=Math.max(front,side?side*x:z)
   }
   if(maxX>=-halfWidth&&minX<=halfWidth&&maxY>=signY-halfHeight&&minY<=signY+halfHeight)mount=Math.max(mount,front)
  }
  if(Number.isFinite(mount)){sign.position.x=side*(mount+.14);sign.position.z=side?0:mount+.14}

 }
 if(house.enter){
  const door=cityModelDoors[house.cityModel]!,x=door.x*house.width
  a.block('blue',[x,.035,house.depth/2+.35],[1.25,.04,.55],root).name='shop-welcome-mat'
  buildBuildingSign(a,'Open',{position:[x+.9,1.4,door.z*house.width+.08],width:.8,theme:'navy'},root)
 }
 if(house.enter==='home')buildIvanHomeExterior(a,house,root)
 a.fadeable(house.id,root,[imported])
 return{windows:[] as THREE.Mesh[],imported,root}
}
