import type {Island,MapPoint,Vector,WorldDefinition,CompiledBuilding,CompiledRoad} from './types.ts'
export const RADIUS=40,WATER=-.28
const dot=(a:Vector,b:Vector)=>a.x*b.x+a.y*b.y+a.z*b.z
export function normalAt(x:number,z:number):Vector{const u=x/RADIUS,v=z/RADIUS;return{x:Math.sin(u)*Math.cos(v),y:Math.cos(u)*Math.cos(v),z:Math.sin(v)}}
export function mapAt(n:Vector):MapPoint{const length=Math.hypot(n.x,n.y,n.z);return{x:Math.atan2(n.x,n.y)*RADIUS,z:Math.asin(Math.max(-1,Math.min(1,n.z/length)))*RADIUS}}
export function frameAt(anchor:MapPoint){const u=anchor.x/RADIUS,v=anchor.z/RADIUS;return{up:normalAt(anchor.x,anchor.z),east:{x:Math.cos(u),y:-Math.sin(u),z:0},south:{x:-Math.sin(u)*Math.sin(v),y:-Math.cos(u)*Math.sin(v),z:Math.cos(v)}}}
export function localToMap(island:Pick<Island,'anchor'|'rotation'>,x:number,z:number):MapPoint{
 const {up,east,south}=frameAt(island.anchor),angle=island.rotation??0,xx=x*Math.cos(angle)+z*Math.sin(angle),zz=z*Math.cos(angle)-x*Math.sin(angle)
 return mapAt({x:up.x*RADIUS+east.x*xx+south.x*zz,y:up.y*RADIUS+east.y*xx+south.y*zz,z:up.z*RADIUS+east.z*xx+south.z*zz})
}
export function mapToLocal(island:Pick<Island,'anchor'|'rotation'>,point:MapPoint){
 const n=normalAt(point.x,point.z),{up,east,south}=frameAt(island.anchor),alignment=dot(n,up);if(alignment<=0)return{x:Infinity,z:Infinity}
 const x=RADIUS*dot(n,east)/alignment,z=RADIUS*dot(n,south)/alignment,angle=-(island.rotation??0)
 return{x:x*Math.cos(angle)+z*Math.sin(angle),z:z*Math.cos(angle)-x*Math.sin(angle)}
}
export function distance(a:MapPoint,b:MapPoint){const n=normalAt(a.x,a.z),m=normalAt(b.x,b.z),cross={x:n.y*m.z-n.z*m.y,y:n.z*m.x-n.x*m.z,z:n.x*m.y-n.y*m.x};return Math.atan2(Math.hypot(cross.x,cross.y,cross.z),dot(n,m))*RADIUS}
export function between(a:MapPoint,b:MapPoint,t:number){const n=normalAt(a.x,a.z),m=normalAt(b.x,b.z),angle=distance(a,b)/RADIUS;if(angle<1e-10)return{...a};const sine=Math.sin(angle),u=Math.sin((1-t)*angle)/sine,v=Math.sin(t*angle)/sine;return mapAt({x:n.x*u+m.x*v,y:n.y*u+m.y*v,z:n.z*u+m.z*v})}
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)}

/** One new coastline field: authored islands, soft sand margins and one pond. */
export function createArchipelagoTerrain(definition:WorldDefinition,buildingPads:readonly CompiledBuilding[]=[],gradedRoads:readonly CompiledRoad[]=[]){
 const islands=definition.islands.map(island=>({...island,basis:frameAt(island.anchor)})),byId=new Map(islands.map(island=>[island.id,island])),pondIsland=byId.get(definition.pond.at.frame)!,pondPoint=localToMap(pondIsland,definition.pond.at.x,definition.pond.at.z)
 function islandHeight(n:Vector,island:typeof islands[number]){
  const alignment=dot(n,island.basis.up);if(alignment<=.25)return-2.25
  const radius=RADIUS/alignment,x=radius*dot(n,island.basis.east),z=radius*dot(n,island.basis.south),angle=island.rotation??0,xx=x*Math.cos(angle)-z*Math.sin(angle),zz=z*Math.cos(angle)+x*Math.sin(angle),q=Math.hypot(xx/island.radiusX,zz/island.radiusZ),theta=Math.atan2(zz,xx),scallop=.055*Math.sin(theta*3+island.coastSeed)+.028*Math.sin(theta*7-island.coastSeed)
  const land=smooth(1.10,.76,q+scallop),level=island.level+.06*Math.sin(xx*.27+island.coastSeed)*Math.sin(zz*.21)
  let hill=0;for(const mound of island.mounds??[]){const r=Math.hypot(xx-mound.x,zz-mound.z)/mound.radius;if(r<1)hill+=mound.height*(1-r*r)**2}
  return-2.25+(level+hill+2.25)*land
 }
 function rawHeight(n:Vector){
  let height=-2.25;for(const island of islands)height=Math.max(height,islandHeight(n,island))
  const p=mapAt(n),gap=distance(p,pondPoint),pond=definition.pond
  if(gap<pond.radius+pond.bankWidth){const blend=smooth(pond.radius,pond.radius+pond.bankWidth,gap);height=-1.1+(height+1.1)*blend}
  return height
 }
 const pads=buildingPads.map(building=>({building,basis:frameAt(building),level:Math.max(.65,rawHeight(normalAt(building.x,building.z)))}))
 const grades=gradedRoads.flatMap(road=>road.points.slice(1).map((end,index)=>{const start=road.points[index]!,a=normalAt(start.x,start.z),b=normalAt(end.x,end.z),dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;return{road,startHeight:start.height,endHeight:end.height,a,dx,dy,dz,length2:dx*dx+dy*dy+dz*dz}}))
 function terrainHeight(n:Vector){
  let height=rawHeight(n),gradeDistance=Infinity,gradeValue=height,gradeWeight=0
  for(const segment of grades){const t=Math.max(0,Math.min(1,((n.x-segment.a.x)*segment.dx+(n.y-segment.a.y)*segment.dy+(n.z-segment.a.z)*segment.dz)/(segment.length2||1))),distance=Math.hypot(n.x-segment.a.x-segment.dx*t,n.y-segment.a.y-segment.dy*t,n.z-segment.a.z-segment.dz*t)*RADIUS,width=segment.road.width/2
   if(distance<width+1.2&&distance<gradeDistance){gradeDistance=distance;gradeValue=segment.startHeight+(segment.endHeight-segment.startHeight)*t-.025;gradeWeight=1-smooth(width,width+1.2,distance)}
  }
  height+=(gradeValue-height)*gradeWeight
  let closestPad=Infinity,padValue=height,padWeight=0
  for(const pad of pads){const alignment=dot(n,pad.basis.up);if(alignment<.7)continue;const radius=(RADIUS+pad.level)/alignment,x=radius*dot(n,pad.basis.east),z=radius*dot(n,pad.basis.south),c=Math.cos(pad.building.yaw),s=Math.sin(pad.building.yaw),xx=x*c-z*s,zz=z*c+x*s,d=Math.hypot(Math.max(0,Math.abs(xx)-pad.building.width/2-.15),Math.max(0,Math.abs(zz)-pad.building.depth/2-.15)),weight=1-smooth(0,1.8,d)
   if(d<1e-8)return radius-RADIUS
   if(weight>0&&d<closestPad){closestPad=d;padValue=radius-RADIUS;padWeight=weight}
  }
  return height+(padValue-height)*padWeight
 }
 function areaAt(point:MapPoint){let result:string|null=null,best=Infinity;for(const island of islands){const local=mapToLocal(island,point),q=Math.hypot(local.x/island.radiusX,local.z/island.radiusZ);if(q<1.15&&q<best){best=q;result=island.id}}return result}
 return{RADIUS:definition.radius,WATER:definition.water,normalAt,mapAt,localToMap:(frame:string,x:number,z:number)=>{const island=byId.get(frame);if(!island)throw new Error(`Unknown world frame: ${frame}`);return localToMap(island,x,z)},mapToLocal:(frame:string,point:MapPoint)=>{const island=byId.get(frame);if(!island)throw new Error(`Unknown world frame: ${frame}`);return mapToLocal(island,point)},terrainHeight,groundHeight:(point:MapPoint)=>terrainHeight(normalAt(point.x,point.z)),areaAt,distance,pondPoint}
}
