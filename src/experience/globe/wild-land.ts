import {worldRadius,longitudeDelta} from './world-expansion.ts'
import type {MapPoint,Target} from './types.ts'

/** Compact heightfields keep established streets, buildings and destination arrivals unchanged. */
export const hillSites=[
 {id:'crystal-rise',x:-14,z:-35,radius:6.7,height:3.4},
 {id:'east-downs',x:40,z:-34,radius:6,height:2.5},
 {id:'western-downs',x:-80,z:10,radius:8,height:3.2},
 {id:'tide-rise',x:-98,z:39,radius:5.8,height:2.8},
 {id:'far-downs',x:86,z:-27,radius:9,height:3.8},
] as const
export function hillLift(p:MapPoint){
 let lift=0
 for(const hill of hillSites){const dx=longitudeDelta(hill.x,p.x)*Math.cos(hill.z/worldRadius),r=Math.hypot(dx,p.z-hill.z)/hill.radius;if(r<1)lift=Math.max(lift,hill.height*(1-r*r)**3)}
 return lift
}
export const caveSites=[
 {id:'crystal-cave',name:'Firefly Grotto',x:-14,z:-28.7,width:4.4,depth:2.5,room:'crystal-cave',arrival:{x:-14,z:-26.5},warning:'Watch your step',tone:'violet'},
 {id:'tide-cave',name:'Tideglass Cave',x:-98,z:44.4,width:4.4,depth:2.5,room:'tide-cave',arrival:{x:-98,z:46.7},warning:'Stay on the marked path',tone:'blue'},
] as const
export const caveTargets:Target[]=caveSites.map(cave=>({id:`${cave.id}-door`,name:cave.name,label:`Enter ${cave.name}`,kind:'door',topic:'environment',x:cave.x,z:cave.z+1.6,radius:2.4,arrival:cave.arrival,interior:cave.room}))
export const cavePaths:MapPoint[][]=[
 [{x:9,z:-21},{x:9,z:-19},{x:0,z:-19},{x:0,z:-24},{x:-7,z:-26.5},{x:-14,z:-26.5}],
 [{x:-90,z:50},{x:-98,z:46.7}],
]
export const coastalLookout={id:'coastal-lookout',name:'Beyond the Blue',label:'Visit the coastal lookout',x:-54,z:45,arrival:{x:-54,z:45},kind:'place',topic:'environment',radius:2.8} satisfies Target

export const wildObstacles=[...caveSites,...caveSites.map(cave=>({x:cave.x+3.7,z:cave.z+1.7,width:1.8,depth:.3})),{x:coastalLookout.x+1.6,z:coastalLookout.z+2.1,width:2.4,depth:.65}]
