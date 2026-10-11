import * as THREE from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import houses from '../globe/assets/simple-houses.json' with {type:'json'}
import japanese from '../globe/assets/japanese-town.json' with {type:'json'}
import {loadCityModels} from '../globe/city-models.ts'
import {loadJapaneseModels} from '../globe/japanese-models.ts'
import type {ModelLibrary} from '../globe/model-library.ts'
import type {ArtKit} from '../explorer/art-kit.ts'

type Family='houses'|'japanese'
type Color=[number,number,number]
interface Source {name:string;width:number;height:number;depth:number}
interface Watch {name:string;mesh:THREE.Mesh;kit:Pick<ArtKit,'geometries'>;active:boolean}
export interface DistrictLoaders {houses:(signal:AbortSignal)=>Promise<ModelLibrary>;japanese:(signal:AbortSignal)=>Promise<ModelLibrary>}
export interface DistrictAssets extends ModelLibrary {
 watch(name:string,mesh:THREE.Mesh,kit:Pick<ArtKit,'geometries'>):()=>void
 ensure(area:string):Promise<void>
 isReady(area:string):boolean
 status(area:string):'proxy'|'loading'|'ready'|'failed'
}
const familyForArea=(area:string):Family|undefined=>area==='maker-heights'||area==='orchard-village'?'houses':area==='komorebi-market'?'japanese':undefined
const sources=new Map<string,{family:Family;source:Source}>([
 ...houses.models.map(source=>[source.name,{family:'houses' as const,source}] as const),
 ...japanese.models.map(source=>[source.name,{family:'japanese' as const,source}] as const),
])
// Area-weighted source colours sampled from the shipped prepared GLBs; these are only distant LODs.
const houseColors:Record<string,[Color,Color]>={
 Cube008:[[.814847,.723055,.564712],[.030713,.088656,.147027]],Cube010:[[.558340,.679542,.617207],[.467784,.155926,.093059]],
 Cube004:[[.783538,.564712,.479320],[.057805,.165132,.130136]],Cube015:[[.665387,.701102,.723055],[.070360,.104616,.187821]],
 Cube012:[[.799103,.658375,.508881],[.417885,.162029,.102242]],Cube013:[[.571125,.686685,.603827],[.054480,.147027,.174647]],
 Cube009:[[.701102,.637597,.737910],[.168269,.109462,.155926]],
}
function proxyColors(name:string):[Color,Color]{
 if(houseColors[name])return houseColors[name]!
 const facade:Color=name.startsWith('japanese_house')||name.startsWith('castle_tower')?[.935186,.872733,.681419]:name.startsWith('pagoda')?[.681419,.015396,.006310]:[.578906,.279263,.081532]
 return[facade,[.047366,.060778,.093165]]
}
function distantProxy(source:Source){
 const [wallColor,roofColor]=proxyColors(source.name),{width:w,height:h,depth:d}=source
 const wall=new THREE.BoxGeometry(w,h*.75,d).toNonIndexed();wall.translate(0,h*.375,0)
 const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(0,h*.25);shape.closePath()
 const roof=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});roof.translate(0,h*.75,-d/2)
 for(const[geometry,color]of [[wall,wallColor],[roof,roofColor]] as const){
  geometry.deleteAttribute('uv');const colors=new Float32Array(geometry.attributes.position!.count*3)
  for(let i=0;i<colors.length;i+=3)colors.set(color,i)
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.clearGroups()
 }
 const result=mergeGeometries([wall,roof])!;wall.dispose();roof.dispose();result.name=`distant-district-proxy:${source.name}`
 const positions=result.attributes.position!;for(let i=0;i<positions.count;i++)if(Math.abs(positions.getY(i))<1e-7)positions.setY(i,0)
 result.userData.districtProxy=true;result.userData.sourceModel=source.name;result.computeBoundingBox();result.computeBoundingSphere()
 return result
}
const aborted=()=>new DOMException('District asset loading was cancelled.','AbortError')

/** Distant LOD is explicit. A catalog failure reports an error instead of silently keeping proxies. */
export function createDistrictAssets(signal:AbortSignal,onChange:()=>void,onError:(error:unknown)=>void,loaders:DistrictLoaders={houses:loadCityModels,japanese:loadJapaneseModels}):DistrictAssets{
 signal.throwIfAborted()
 const controller=new AbortController(),catalogs=new Map<Family,ModelLibrary>(),pending=new Map<Family,Promise<void>>(),failed=new Set<Family>(),proxies=new Map<string,THREE.BufferGeometry>(),watchers=new Set<Watch>(),released=new Set<ModelLibrary>()
 let disposed=false
 const check=()=>{if(disposed||controller.signal.aborted)throw aborted()}
 function source(name:string){const entry=sources.get(name);if(!entry)throw new Error(`Unknown district model: ${name}`);return entry}
 function release(catalog:ModelLibrary){if(!released.has(catalog)){released.add(catalog);catalog.dispose()}}
 function replace(watch:Watch,geometry:THREE.BufferGeometry,adopted:()=>void=()=>{}){
  const previous=watch.mesh.geometry,index=watch.kit.geometries.indexOf(previous)
  if(index<0)throw new Error('A watched district mesh must own its geometry through the ArtKit.')
  watch.mesh.geometry=geometry;watch.kit.geometries.splice(index,1);watch.kit.geometries.push(geometry);adopted();previous.dispose()
 }
 function ensure(area:string):Promise<void>{
  try{check()}catch(error){return Promise.reject(error)}
  const family=familyForArea(area);if(!family||catalogs.has(family))return Promise.resolve()
  const existing=pending.get(family);if(existing)return existing
  const request=(async()=>{
   let catalog:ModelLibrary|undefined
   const replacements:{watch:Watch;geometry:THREE.BufferGeometry;adopted:boolean;discarded:boolean}[]=[]
   const discardUnadopted=()=>replacements.forEach(entry=>{if(!entry.adopted&&!entry.discarded){entry.discarded=true;entry.geometry.dispose()}})
   try{
    catalog=await loaders[family](controller.signal)
    check()
    // Prepare every clone before touching scene objects. A malformed catalog cannot half-upgrade.
    for(const watch of watchers)if(watch.active&&source(watch.name).family===family)replacements.push({watch,geometry:catalog.get(watch.name).clone(),adopted:false,discarded:false})
    check();catalogs.set(family,catalog)
    for(const entry of replacements){
     check()
     if(!entry.watch.active)continue
     replace(entry.watch,entry.geometry,()=>{entry.adopted=true})
    }
    discardUnadopted()
    check();onChange()
   }catch(error){
    discardUnadopted()
    if(catalog&&catalogs.get(family)!==catalog)release(catalog)
    if(disposed||controller.signal.aborted)throw aborted()
    if(catalogs.get(family)===catalog){catalogs.delete(family);if(catalog)release(catalog)}
    failed.add(family);onError(error);throw error
   }
  })()
  pending.set(family,request);return request
 }
 function dispose(){
  if(disposed)return
  disposed=true;controller.abort();signal.removeEventListener('abort',externalAbort);watchers.forEach(watch=>{watch.active=false});watchers.clear()
  catalogs.forEach(release);catalogs.clear();proxies.forEach(geometry=>geometry.dispose());proxies.clear()
 }
 function externalAbort(){dispose()}
 signal.addEventListener('abort',externalAbort,{once:true})
 return{
  get(name){check();const entry=source(name),catalog=catalogs.get(entry.family);if(catalog)return catalog.get(name)
   let proxy=proxies.get(name);if(!proxy){proxy=distantProxy(entry.source);proxies.set(name,proxy)}return proxy
  },
  watch(name,mesh,kit){
   check();const entry=source(name)
   if(!kit.geometries.includes(mesh.geometry))throw new Error('A watched district mesh must own its geometry through the ArtKit.')
   const watch:Watch={name,mesh,kit,active:true};watchers.add(watch)
   const catalog=catalogs.get(entry.family)
   if(catalog&&mesh.geometry.userData.districtProxy){replace(watch,catalog.get(name).clone());onChange()}
   return()=>{watch.active=false;watchers.delete(watch)}
  },
  ensure,
  isReady(area){const family=familyForArea(area);return!disposed&&(!family||catalogs.has(family))},
  status(area){const family=familyForArea(area);return!family||catalogs.has(family)?'ready':failed.has(family)?'failed':pending.has(family)?'loading':'proxy'},
  dispose,
 }
}
