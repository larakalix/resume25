import {seaCoastWeight,expandedSeaHeight} from './sea-expansion.ts'
import {cityGroundWeight} from './city-district.ts'
import {japanGroundWeight,japanDistrict} from './japan-district.ts'
import {pond} from './pond-basin.ts'
import {hillLift} from './wild-land.ts'
import {expansionWeight} from './world-expansion.ts'
export const RADIUS=40
export const WATER=-.28
export function normalAt(x:number,z:number){const u=x/RADIUS,v=z/RADIUS;return{x:Math.sin(u)*Math.cos(v),y:Math.cos(u)*Math.cos(v),z:Math.sin(v)}}
export function mapAt(n:{x:number;y:number;z:number}){return{x:Math.atan2(n.x,n.y)*RADIUS,z:Math.asin(Math.max(-1,Math.min(1,n.z)))*RADIUS}}
export function terrainHeight(n:{x:number;y:number;z:number}){
 const land=.60+.23*Math.sin(n.x*9+n.z*4)+.15*Math.sin(n.z*13-n.y*5)
 const point=mapAt(n),coast=seaCoastWeight(n,point)
 const river=Math.abs(n.z-(-.10+.055*Math.sin(n.x*8)))
 const riverBlend=Math.max(0,Math.min(1,(river-.025)/.032))
 const center=normalAt(pond.x,pond.z),d=Math.hypot(n.x-center.x,n.y-center.y,n.z-center.z)*RADIUS
 const pondBlend=Math.max(0,Math.min(1,(d-pond.radius)/pond.bankWidth))
 const original=-1.18+(land+1.18)*Math.min(coast,riverBlend,pondBlend),district=cityGroundWeight(point)
 // The existing town is preserved; additional land wraps behind it and reaches both polar gardens.
 const extension=n.y>.45?0:expansionWeight(n,point)
 const expanded=-1.18+(land+1.18)*extension*riverBlend
 const base=Math.max(original,expanded,-1.18+1.78*district),japan=japanGroundWeight(point)
 const level=base+(japanDistrict.level-base)*japan
 return expandedSeaHeight(level+(level>WATER+.25?hillLift(point)*(1-japan):0),n,point)
}
