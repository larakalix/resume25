import {terrainHeight,normalAt} from './terrain.ts'
import type {MapPoint} from './types.ts'

/** An east-west causeway joins the Old Quarter to the already walkable far continent. */
export const coastalCrossing={id:'coastal-causeway',name:'Horizon Causeway',startX:-57.5,endX:-85,z:43.5,halfWidth:1.75,wallWidth:.30,wallHeight:.84}
const scale=Math.cos(coastalCrossing.z/40)
export const coastalRoutes:MapPoint[][]=[
 [{x:-54,z:45},{x:-57.5,z:43.5},{x:-85,z:43.5},{x:-90,z:43.5},{x:-90,z:38}],
]
export function coastalFootprint(p:MapPoint,margin=0){const c=coastalCrossing;return p.x>=c.endX-margin/scale&&p.x<=c.startX+margin/scale&&Math.abs(p.z-c.z)<=c.halfWidth+margin}
export function coastalDeck(x:number){const c=coastalCrossing,t=Math.max(0,Math.min(1,(x-c.startX)/(c.endX-c.startX))),a=terrainHeight(normalAt(c.startX,c.z)),b=terrainHeight(normalAt(c.endX,c.z));return a+(b-a)*t+.065+Math.sin(t*Math.PI)*.68}
export function coastalHeight(p:MapPoint){return coastalFootprint(p)?coastalDeck(p.x):null}
export function coastalBlocked(p:MapPoint,radius=.42){
 const c=coastalCrossing,along=Math.max(c.endX-p.x,0,p.x-c.startX)*scale,side=Math.abs(p.z-c.z),across=Math.max(c.halfWidth-c.wallWidth-side,0,side-c.halfWidth)
 return along*along+across*across<radius*radius
}
