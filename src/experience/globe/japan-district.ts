import type {MapPoint} from './types.ts'
import {fittedJapaneseModel} from './japanese-model-specs.ts'

/** Imported temple-and-shop neighbourhood on the north-west shoulder. */
export const japanDistrict={minX:-60,maxX:-13,minZ:-46,maxZ:-16,level:.6,name:'Komorebi Quarter',arrival:{x:-33,z:-20}}
export const japanPavingBounds={minX:-58.5,maxX:-14.5,minZ:-44.5,maxZ:-17}
export const japanGate={x:-33,z:-18.5,halfWidth:3,postWidth:.34,height:4.8}

/** Project a tangent metre offset from the district's fixed radial surface back to the map. */
export function japanMapOffset(point:MapPoint,x:number,z:number):MapPoint{
 const radius=40+japanDistrict.level,u=point.x/40,v=point.z/40
 const normal={x:Math.sin(u)*Math.cos(v),y:Math.cos(u)*Math.cos(v),z:Math.sin(v)}
 const east={x:Math.cos(u),y:-Math.sin(u)},south={x:-Math.sin(u)*Math.sin(v),y:-Math.cos(u)*Math.sin(v),z:Math.cos(v)}
 const world={x:normal.x*radius+east.x*x+south.x*z,y:normal.y*radius+east.y*x+south.y*z,z:normal.z*radius+south.z*z},length=Math.hypot(world.x,world.y,world.z)
 return{x:Math.atan2(world.x,world.y)*40,z:Math.asin(world.z/length)*40}
}
export const japanGatePosts=[-1,1].map(side=>({id:`japan-gate-${side}`,localX:side*japanGate.halfWidth,localZ:0,...japanMapOffset(japanGate,side*japanGate.halfWidth,0),width:japanGate.postWidth,depth:japanGate.postWidth,height:japanGate.height}))
export const japanLanterns=[{x:-34.8,z:-36.5,width:.68,depth:.68,height:1.4},{x:-31.2,z:-36.5,width:.68,depth:.68,height:1.4}]
export const japanGardenTrees=[{x:-56,z:-18.5,radius:.3,size:1.0,variant:'cherry' as const},{x:-16,z:-42.7,radius:.3,size:.9,variant:'bamboo' as const},{x:-56,z:-44.5,radius:.3,size:.85,variant:'cherry' as const}]
export const japanObstacles=[...japanGatePosts,...japanLanterns]

export const japanBuildings=[
 {id:'japan-tea',x:-39,z:-22,...fittedJapaneseModel('japanese_house-east',4.4,4.6,3.5),cityModel:'japanese_house-east',modelFront:'east',roof:'blue',style:'japanese',name:'Komorebi Tea'},
 {id:'japan-pottery',x:-27,z:-22,...fittedJapaneseModel('castle_tower-west',4.4,4.6,5.7),cityModel:'castle_tower-west',modelFront:'west',roof:'green',style:'japanese',name:'Earth & Fire'},
 {id:'japan-noodles',x:-39,z:-29.5,...fittedJapaneseModel('ramen_shop-east',4.5,4.4,5.6),cityModel:'ramen_shop-east',modelFront:'east',roof:'coral',style:'japanese',name:'Lantern Noodles'},
 {id:'japan-paper',x:-27,z:-29.5,...fittedJapaneseModel('japanese_house-west',4.2,4.4,3.6),cityModel:'japanese_house-west',modelFront:'west',roof:'blue',style:'japanese',name:'Paper & Ink Atelier'},
 {id:'japan-sweets',x:-39,z:-37,...fittedJapaneseModel('ramen_shop-east',4.1,4.5,3.5),cityModel:'ramen_shop-east',modelFront:'east',roof:'violet',style:'japanese',name:'Mochi Corner'},
 {id:'japan-tailor',x:-27,z:-37,...fittedJapaneseModel('japanese_house-west',4.1,4.5,5.6),cityModel:'japanese_house-west',modelFront:'west',roof:'blue',style:'japanese',name:'Indigo Threads'},
 {id:'japan-house-a',x:-55,z:-24.5,...fittedJapaneseModel('japanese_house-east',3.5,3.8,3.4),cityModel:'japanese_house-east',modelFront:'east',roof:'green',style:'japanese',name:'Maple House'},
 {id:'japan-house-b',x:-55,z:-32.5,...fittedJapaneseModel('pagoda-east',3.4,3.8,5.4),cityModel:'pagoda-east',modelFront:'east',roof:'blue',style:'japanese',name:'Cedar House'},
 {id:'japan-house-c',x:-55,z:-40.5,...fittedJapaneseModel('japanese_house-east',3.2,3.7,3.4),cityModel:'japanese_house-east',modelFront:'east',roof:'violet',style:'japanese',name:'Lantern House'},
 {id:'japan-temple',x:-33,z:-42,...fittedJapaneseModel('shrine_hall-front',7.2,5,5.3),cityModel:'shrine_hall-front',modelFront:'front',roof:'coral',style:'japanese',name:'Komorebi Hall'},
] as const

export const japanStops=[
 {id:'japan-quarter',name:japanDistrict.name,label:'Visit Komorebi Quarter',x:-33,z:-20,arrival:japanDistrict.arrival},
 {id:'japan-courtyard',name:'Komorebi Courtyard',label:'Visit the temple courtyard',x:-33,z:-36.5,arrival:{x:-33,z:-36.5}},
] as const
export const japanApproach:MapPoint[]=[{x:0,z:-9},{x:-8,z:-10},{x:-15,z:-14},{x:-23,z:-17},{x:-33,z:-17}]
export const japanCrossLanes=[-17,-25.7,-33.5] as const
export const japanPaths:MapPoint[][]=[
 japanApproach,
 [...japanCrossLanes.map(z=>({x:-33,z})),{x:-33,z:-38.3}],
 ...japanCrossLanes.map(z=>[{x:-51,z},{x:-33,z},{x:-15,z}]),
 [{x:-51,z:-17},{x:-51,z:-42.7}],
]
export function inJapan(point:MapPoint,margin=0){return point.x>=japanDistrict.minX-margin&&point.x<=japanDistrict.maxX+margin&&point.z>=japanDistrict.minZ-margin&&point.z<=japanDistrict.maxZ+margin}
export function japanGroundWeight(point:MapPoint){
 const dx=Math.max(japanDistrict.minX-point.x,0,point.x-japanDistrict.maxX),dz=Math.max(japanDistrict.minZ-point.z,0,point.z-japanDistrict.maxZ),t=Math.min(1,Math.hypot(dx,dz)/3)
 return 1-t*t*(3-2*t)
}
const houseAprons=japanBuildings.filter(building=>building.id.startsWith('japan-house-'))
/** Keep stone close to the street and house aprons, leaving the outer gardens green. */
export function japanPaved(point:MapPoint,margin=0){
 if(point.x<=japanPavingBounds.minX-margin||point.x>=japanPavingBounds.maxX+margin||point.z<=japanPavingBounds.minZ-margin||point.z>=japanPavingBounds.maxZ+margin)return false
 const scale=Math.cos(point.z/40)
 if(japanGardenTrees.some(tree=>Math.hypot((point.x-tree.x)*scale,point.z-tree.z)<Math.max(0,1.1-margin)))return false
 const core=Math.abs((point.x+33)*scale)<8+margin
 return core||japanLane(point,margin)||houseAprons.some(building=>Math.abs((point.x-building.x)*scale)<building.width/2+1+margin&&Math.abs(point.z-building.z)<building.depth/2+1.2+margin)
}
export function japanLane(point:MapPoint,margin=0){
 const scale=Math.cos(point.z/40)
 return japanPaths.slice(1).some(route=>route.some((end,index)=>{
  if(!index)return false
  const start=route[index-1]!,dx=(end.x-start.x)*scale,dz=end.z-start.z,t=Math.max(0,Math.min(1,((point.x-start.x)*scale*dx+(point.z-start.z)*dz)/(dx*dx+dz*dz)))
  return Math.hypot((point.x-start.x)*scale-dx*t,point.z-start.z-dz*t)<1.15+margin
 }))
}
