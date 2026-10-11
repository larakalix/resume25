import type {MapPoint} from './types.ts'

export const worldRadius=40
export const worldCircumference=Math.PI*2*worldRadius
export const longitudeLimit=worldCircumference/2
export const latitudeLimit=Math.PI*worldRadius/2-.3
export function wrapLongitude(x:number){return x>=-longitudeLimit&&x<longitudeLimit?x:((x+longitudeLimit)%worldCircumference+worldCircumference)%worldCircumference-longitudeLimit}
export function longitudeDelta(from:number,to:number){return wrapLongitude(to-from)}

export const worldPlaces=[
 {id:'sunlit-orchard',name:'Sunlit Orchard',label:'Visit Sunlit Orchard',x:88,z:20,arrival:{x:88,z:22},theme:'orchard'},
 {id:'star-garden',name:'Star Garden',label:'Visit Star Garden',x:-112,z:22,arrival:{x:-112,z:24},theme:'stars'},
 {id:'north-lookout',name:'Northwind Lookout',label:'Visit Northwind Lookout',x:110,z:-48,arrival:{x:110,z:-46},theme:'lookout'},
 {id:'south-garden',name:'Cloudtop Garden',label:'Visit Cloudtop Garden',x:-90,z:52,arrival:{x:-90,z:50},theme:'garden'},
] as const

/** Split the longitude seam explicitly: no painted path ever cuts through the town. */
export const worldPaths:MapPoint[][]=[
 [{x:54,z:28},{x:67,z:25},{x:78,z:22},{x:88,z:22},{x:110,z:22},{x:longitudeLimit,z:24}],
 [{x:-54,z:28},{x:-67,z:25},{x:-88,z:24},{x:-112,z:24},{x:-longitudeLimit,z:24}],
 [{x:110,z:22},{x:110,z:8},{x:110,z:1.5},{x:110,z:-8.5},{x:110,z:-28},{x:110,z:-46}],
 [{x:-51,z:-42.7},{x:-60,z:-42.7},{x:-65,z:-47},{x:-90,z:-48},{x:-112,z:-46},{x:-longitudeLimit,z:-46}],
 [{x:110,z:-46},{x:longitudeLimit,z:-46}],
 [{x:-90,z:24},{x:-90,z:38},{x:-90,z:50}],
 [{x:-90,z:50},{x:-55,z:56},{x:0,z:56},{x:0,z:53}],
 [{x:110,z:-46},{x:110,z:-56},{x:longitudeLimit,z:-58}],
 [{x:-longitudeLimit,z:-58},{x:-112,z:-56},{x:-90,z:-48}],
]

function smooth(a:number,b:number,value:number){const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t)}
function routeDistance(p:MapPoint,a:MapPoint,b:MapPoint){
 const scale=Math.max(.03,Math.cos(p.z/worldRadius)),dx=(b.x-a.x)*scale,dz=b.z-a.z,px=(p.x-a.x)*scale,pz=p.z-a.z,t=Math.max(0,Math.min(1,(px*dx+pz*dz)/(dx*dx+dz*dz||1)))
 return Math.hypot(px-dx*t,pz-dz*t)
}
/** Continents on the back, polar gardens and broad, dry coastal connections. */
export function expansionWeight(n:{x:number;y:number;z:number},point:MapPoint){
 // Keep the existing eastern harbor bay deep; the new continent starts beyond its offshore berth.
 const back=smooth(.32,.52,-n.y)*(1-smooth(.78,.94,Math.abs(n.z)))
 const polar=smooth(.89,.98,Math.abs(n.z))
 let route=0
 for(const line of worldPaths)for(let i=1;i<line.length;i++){
  const a=line[i-1]!,b=line[i]!
  // A declared seam endpoint has an equivalent neighbour on the opposite map edge.
  const d=Math.min(routeDistance(point,a,b),routeDistance({...point,x:point.x+worldCircumference},a,b),routeDistance({...point,x:point.x-worldCircumference},a,b))
  route=Math.max(route,1-smooth(3.2,7.2,d))
 }
 return Math.max(back,polar,route)
}

const destinationTrees=worldPlaces.flatMap((place,index)=>Array.from({length:8},(_,i)=>{
 const angle=i*Math.PI/4,radius=7+(i%2)*2,scale=Math.max(.16,Math.cos(place.z/worldRadius))
 return{x:wrapLongitude(place.x+Math.cos(angle)*radius/scale),z:Math.max(-58,Math.min(58,place.z+Math.sin(angle)*radius)),size:.8+(i%3)*.12,pine:index===2||index===3&&i%2===0}
}))
// Equal-area candidate groves make the rear hemisphere feel inhabited without crowding the old town.
const globeGroves=Array.from({length:520},(_,order)=>{
 const i=(order*233)%520
 const longitude=((i*2.399963229728653+Math.PI)%(Math.PI*2))-Math.PI,sinLatitude=1-2*(i+.5)/520,z=Math.asin(sinLatitude)*worldRadius
 return{x:longitude*worldRadius,z,size:.72+(i%5)*.09,pine:z< -35||z>45,back:Math.cos(longitude)*Math.sqrt(1-sinLatitude*sinLatitude)}
}).filter(point=>(point.back<-.32||Math.abs(point.z)>48)&&Math.abs(point.z)<59)
export const expansionTrees=[...destinationTrees,...globeGroves]
