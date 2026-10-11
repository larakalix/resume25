import model from './assets/lighthouse.json' with {type:'json'}
import type {MapPoint,Target} from './types.ts'

const scale=Math.min(9.5/model.bounds.height,1.8/model.bounds.horizontalRadius),radius=model.bounds.horizontalRadius*scale

/** Shared physical envelope for the imported tower, stone apron and round body collision. */
export const lighthouse={id:'bluebird-lighthouse',name:'Bluebird Lighthouse',x:65,z:52,radius,height:model.bounds.height*scale,scale,apronRadius:radius} as const
export const lighthouseTarget:Target={id:lighthouse.id,name:lighthouse.name,label:'Visit the lighthouse',kind:'place',topic:'environment',x:lighthouse.x,z:54.1,radius:3,arrival:{x:lighthouse.x,z:55.5}}

/** A southern approach leaves the northern waterfront and the tower's full footprint clear. */
export const lighthousePaths:MapPoint[][]=[
 [{x:54,z:53},{x:54,z:55.5},{x:65,z:55.5}],
]
