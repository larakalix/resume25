import {worldRadius,longitudeDelta,worldPaths,worldPlaces} from './world-expansion.ts'
import {cityPaths,cityGroundWeight} from './city-district.ts'
import {japanPaths,japanGroundWeight} from './japan-district.ts'
import {cavePaths,caveSites,hillSites} from './wild-land.ts'
import {lighthouse,lighthousePaths} from './lighthouse.ts'
import type {MapPoint} from './types.ts'

interface Direction {x:number;y:number;z:number}
interface SeaGulf extends MapPoint {id:string;eastWest:number;northSouth:number}
/** Broad empty-water regions, measured in physical metres at each gulf's centre latitude. */
export const seaGulfs:readonly SeaGulf[]=[
 {id:'westward-gulf',x:-73,z:-18,eastWest:18,northSouth:19},
 {id:'back-ocean',x:-125,z:-17,eastWest:34,northSouth:28},
 {id:'southern-back-bay',x:-120,z:39,eastWest:14,northSouth:9},
]
export const seaDepth=-1.35
const preservedRoutes=[...worldPaths,...cityPaths,...japanPaths,...cavePaths,...lighthousePaths]
const harborBank={x:45,z:14}
// This coastal shelter covers the bent walking approach and bank apron, not another navigation route.
const harborShelter=[{x:34,z:22},harborBank] as const
const places=[
 ...worldPlaces.map(place=>({point:place,radius:7})),
 ...hillSites.map(hill=>({point:hill,radius:hill.radius})),
 ...caveSites.map(cave=>({point:cave,radius:5})),
 {point:lighthouse,radius:5},
]
function smooth(a:number,b:number,value:number){const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t)}
function direction(p:MapPoint):Direction{const u=p.x/worldRadius,v=p.z/worldRadius;return{x:Math.sin(u)*Math.cos(v),y:Math.cos(u)*Math.cos(v),z:Math.sin(v)}}
const protectedPlaces=places.map(place=>({...place,normal:direction(place.point),innerDot:Math.cos(place.radius/worldRadius),outerDot:Math.cos((place.radius+3)/worldRadius)})),bankNormal=direction(harborBank)
function surfaceDistance(n:Direction,other:Direction){return Math.acos(Math.max(-1,Math.min(1,n.x*other.x+n.y*other.y+n.z*other.z)))*worldRadius}
function placeProtection(n:Direction){
 let preserve=0
 for(const place of protectedPlaces){
  const dot=n.x*place.normal.x+n.y*place.normal.y+n.z*place.normal.z
  if(dot>=place.innerDot)return 1
  if(dot>place.outerDot)preserve=Math.max(preserve,1-smooth(place.radius,place.radius+3,Math.acos(Math.max(-1,Math.min(1,dot)))*worldRadius))
 }
 return preserve
}
function segmentDistance(p:MapPoint,a:MapPoint,b:MapPoint,scale:number){
 const dx=longitudeDelta(a.x,b.x)*scale,dz=b.z-a.z,px=longitudeDelta(a.x,p.x)*scale,pz=p.z-a.z,t=Math.max(0,Math.min(1,(px*dx+pz*dz)/(dx*dx+dz*dz||1)))
 return Math.hypot(px-dx*t,pz-dz*t)
}
function routeProtection(point:MapPoint){
 const scale=Math.max(.03,Math.cos(point.z/worldRadius));let nearest=Infinity
 for(const line of preservedRoutes)for(let i=1;i<line.length;i++){
  nearest=Math.min(nearest,segmentDistance(point,line[i-1]!,line[i]!,scale));if(nearest<=3.2)return 1
 }
 return 1-smooth(3.2,5.2,nearest)
}

/** Recede the original front coast while retaining the harbor's exact bank and established paths. */
export function seaCoastWeight(n:Direction,point:MapPoint){
 const original=Math.max(0,Math.min(1,(n.y-.12)/.34)),receded=Math.max(0,Math.min(1,(n.y-.22)/.30))
 if(original===receded)return original
 const shelterDistance=segmentDistance(point,harborShelter[0],harborShelter[1],Math.max(.03,Math.cos(point.z/worldRadius)))
 const preserve=Math.max(1-smooth(5,8,surfaceDistance(n,bankNormal)),1-smooth(2.5,4.5,shelterDistance),cityGroundWeight(point),japanGroundWeight(point),routeProtection(point),placeProtection(n))
 return receded+(original-receded)*preserve
}

/** Carve open rear gulfs only after the old town and district heightfields have been composed. */
export function expandedSeaHeight(level:number,n:Direction,point:MapPoint){
 let weight=0
 for(const gulf of seaGulfs){
  const radial=Math.hypot(longitudeDelta(gulf.x,point.x)*Math.cos(gulf.z/worldRadius)/gulf.eastWest,(point.z-gulf.z)/gulf.northSouth)
  weight=Math.max(weight,1-smooth(.65,1,radial))
 }
 if(weight===0||level<=seaDepth)return level
 const preserve=Math.max(cityGroundWeight(point),japanGroundWeight(point),routeProtection(point),placeProtection(n))
 weight*=1-preserve
 return level+(Math.min(level,seaDepth)-level)*weight
}
