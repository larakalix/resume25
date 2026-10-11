import {worldPlaces,worldRadius,wrapLongitude} from './world-expansion.ts'
import type {MapPoint} from './types.ts'

/** A small physical offset in a landmark's tangent frame, safe at the map seam. */
function offset(point:MapPoint,x:number,z:number):MapPoint{
 const u=point.x/worldRadius,v=point.z/worldRadius,r=worldRadius+.6,cu=Math.cos(u),su=Math.sin(u),cv=Math.cos(v),sv=Math.sin(v)
 const p={x:su*cv*r+cu*x-su*sv*z,y:cu*cv*r-su*x-cu*sv*z,z:sv*r+cv*z},length=Math.hypot(p.x,p.y,p.z)
 return{x:wrapLongitude(Math.atan2(p.x,p.y)*worldRadius),z:Math.asin(p.z/length)*worldRadius}
}
const dimensions={
 orchard:[{variant:'fruit-tree',x:-4,z:-1,width:.65,depth:.65},{variant:'harvest-cart',x:4,z:-1,width:2.5,depth:1.6}],
 stars:[{variant:'observatory',x:-4,z:-1,width:3.5,depth:3.5},{variant:'telescope',x:4,z:-1,width:1.2,depth:1.2}],
 lookout:[{variant:'cairn',x:4,z:-2,width:1.7,depth:1.7},{variant:'trail-flag',x:-4,z:-2,width:.4,depth:.4}],
 garden:[{variant:'pergola',x:4,z:-2,width:3.1,depth:2.5},{variant:'garden-bench',x:-4,z:-2,width:2.4,depth:.75}],
} as const

/** The render and collision sides share these exact prop centres and extents. */
export const expansionObstacles=worldPlaces.flatMap(place=>dimensions[place.theme].map(prop=>({
 id:`${place.id}-${prop.variant}`,place:place.id,variant:prop.variant,width:prop.width,depth:prop.depth,...offset(place,prop.x,prop.z),
})))
