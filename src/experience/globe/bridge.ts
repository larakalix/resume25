import type {MapPoint} from './types.ts'
import {terrainHeight,normalAt} from './terrain.ts'

export interface BridgeSpec {id:string;name:string;x:number;halfWidth:number;startZ:number;endZ:number;wallWidth:number;wallHeight:number;bodyRadius:number;threshold:number;vegetationMargin:number}
export const bridge:BridgeSpec={id:'central-bridge',name:'Meadow Bridge',x:0,halfWidth:2.5,startZ:-8.3,endZ:.2,wallWidth:.42,wallHeight:.9,bodyRadius:.42,threshold:.045,vegetationMargin:.75}
/** Authored deck, border and landscape cutout all share these crossing footprints. */
export const riverCrossings:BridgeSpec[]=[
 bridge,
 {...bridge,id:'west-bridge',name:'Komorebi Bridge',x:-30,halfWidth:1.9,startZ:-5.5,endZ:1.2},
 {...bridge,id:'east-bridge',name:'Garden Bridge',x:28,halfWidth:1.9,startZ:-9,endZ:-2.7},
 {...bridge,id:'rear-bridge',name:'Far Meadow Bridge',x:110,halfWidth:2.1,startZ:-8.5,endZ:1.5},
]
export const bridgeCutouts=riverCrossings.map(crossing=>({id:crossing.id,minX:crossing.x-crossing.halfWidth,minZ:crossing.startZ,maxX:crossing.x+crossing.halfWidth,maxZ:crossing.endZ}))
export const bridgeLength=bridge.endZ-bridge.startZ
export function bridgeProfile(z:number,x=0,crossing:BridgeSpec=bridge){
 const length=crossing.endZ-crossing.startZ,t=Math.max(0,Math.min(1,(z-crossing.startZ)/length)),curve=.51+Math.sin(t*Math.PI)*.38,edge=Math.max(0,Math.min(1,Math.min(z-crossing.startZ,crossing.endZ-z)/1.25)),blend=edge*edge*(3-2*edge)
 const bank=terrainHeight(normalAt(x,z));return Math.max(bank,bank*(1-blend)+curve*blend)+crossing.threshold
}
export function crossingFootprint(p:MapPoint,crossing:BridgeSpec,margin=0){return Math.abs(p.x-crossing.x)<=crossing.halfWidth+margin&&p.z>=crossing.startZ-margin&&p.z<=crossing.endZ+margin}
export function bridgeFootprint(p:MapPoint,margin=0){return riverCrossings.some(crossing=>crossingFootprint(p,crossing,margin))}
export function bridgeHeight(p:MapPoint){const crossing=riverCrossings.find(crossing=>crossingFootprint(p,crossing));return crossing?bridgeProfile(p.z,p.x,crossing):null}

/** Solid parapets include rounded collision margins at their open entrance ends. */
export function bridgeBlocked(p:MapPoint,radius=bridge.bodyRadius){
 return riverCrossings.some(crossing=>{
  const x=Math.abs(p.x-crossing.x),inner=crossing.halfWidth-crossing.wallWidth
  const dx=Math.max(inner-x,0,x-crossing.halfWidth),dz=Math.max(crossing.startZ-p.z,0,p.z-crossing.endZ)
  return dx*dx+dz*dz<radius*radius
 })
}
