import type {MapPoint} from './types.ts'

export type CityRoomId='cafe'|'bookshop'|'arcade'|'ceramics'
export interface CityFurniture extends MapPoint {name:string;width:number;depth:number}
export const cityRoomHosts={
 cafe:{id:'pip',name:'Pip',x:1.8,z:-1.1,arrival:{x:1.3,z:.7}},
 bookshop:{id:'rowan',name:'Rowan',x:1.3,z:-1.3,arrival:{x:.2,z:.4}},
 arcade:{id:'kit',name:'Kit',x:1.75,z:-.5,arrival:{x:.6,z:1.2}},
 ceramics:{id:'mara',name:'Mara',x:1.5,z:-.65,arrival:{x:.4,z:1.15}},
} as const
export function isCityRoom(room:string):room is CityRoomId{return Object.hasOwn(cityRoomHosts,room)}

/** The same occupied floor shapes drive furniture and body clearance. */
export const cityRoomFurniture:Record<CityRoomId,readonly CityFurniture[]>={
 cafe:[
  {name:'cafe-counter',x:-.85,z:-2.7,width:4.8,depth:1.25},
  {name:'cafe-table',x:-2.7,z:.2,width:1,depth:.95},
  {name:'cafe-stool-a',x:-2.7,z:-.8,width:.45,depth:.45},
  {name:'cafe-stool-b',x:-1.7,z:.2,width:.45,depth:.45},
  {name:'cafe-bench',x:-2.7,z:2.1,width:1.5,depth:.75},
 ],
 bookshop:[
  ...[-2.7,0,2.7].map((x,index)=>({name:`bookshop-shelf-${index}`,x,z:-3.0,width:2.1,depth:.55})),
  {name:'bookshop-side-shelf',x:-3.25,z:-1,width:.55,depth:2.4},
  {name:'bookshop-reading-bench',x:-2.65,z:1.55,width:1.6,depth:1.1},
  {name:'bookshop-display',x:2.8,z:1.8,width:.7,depth:.75},
 ],
 arcade:[
  ...[-2.65,0,2.65].map((x,index)=>({name:`arcade-cabinet-${index}`,x,z:-2.8,width:1.3,depth:1.15})),
  {name:'arcade-console',x:-3.05,z:-.4,width:.8,depth:1.15},
  {name:'arcade-bench',x:-2.65,z:1.75,width:1.6,depth:.8},
 ],
 ceramics:[
  {name:'ceramics-counter',x:-.85,z:-2.95,width:4.75,depth:.85},
  {name:'ceramics-kiln',x:2.85,z:-2.55,width:1.2,depth:1.4},
  {name:'ceramics-wheel',x:-2.45,z:.15,width:1.25,depth:1.25},
  {name:'ceramics-bench',x:-2.55,z:2.15,width:1.45,depth:.7},
 ],
}

export function cityRoomBlocked(room:CityRoomId,point:MapPoint,margin=.32){
 return cityRoomFurniture[room].some(part=>Math.abs(point.x-part.x)<part.width/2+margin&&Math.abs(point.z-part.z)<part.depth/2+margin)
}
