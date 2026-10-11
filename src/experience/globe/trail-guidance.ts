import {distance} from './geography.ts'
import {longitudeDelta,longitudeLimit,worldCircumference,wrapLongitude} from './world-expansion.ts'
import {createWorldFollow} from './world-follow.ts'
import {roomWalkable} from './workshop-resident.ts'
import {activityDefinitions,trailDefinitions} from './passport.ts'
import type {PassportSnapshot} from './passport.ts'
import type {MapPoint,RoomId,Target} from './types.ts'

export interface GuidancePosition extends MapPoint {inside:RoomId|null}
export interface TrailGuidance {
 targetId:string;label:string;room:RoomId|null;points:MapPoint[];segments:MapPoint[][];firefly:MapPoint|null
 waitingAtDoor:boolean;arrived:boolean;unreachable:boolean;hint:string
}
const roomDistance=(a:MapPoint,b:MapPoint)=>Math.hypot(a.x-b.x,a.z-b.z)

/** Draw short segments at the atlas edges instead of a false line through the planet's centre. */
export function splitGuidanceRoute(points:readonly MapPoint[]):MapPoint[][]{
 if(!points.length)return[]
 const segments:MapPoint[][]=[[{...points[0]!}]]
 for(let i=1;i<points.length;i++){
  const before=points[i-1]!,next=points[i]!,line=segments[segments.length-1]!
  if(Math.abs(next.x-before.x)>worldCircumference/2){
   const delta=longitudeDelta(before.x,next.x),edge=delta>0?longitudeLimit:-longitudeLimit,t=(edge-before.x)/delta,z=before.z+(next.z-before.z)*t
   line.push({x:edge,z});segments.push([{x:-edge,z},{...next}])
  }else line.push({...next})
 }
 return segments
}

function sampleClear(a:MapPoint,b:MapPoint,safe:(point:MapPoint)=>boolean,room:boolean){
 const length=room?roomDistance(a,b):distance(a,b),steps=Math.max(1,Math.ceil(length/.12))
 for(let i=0;i<=steps;i++){
  const t=i/steps,point={x:room?a.x+(b.x-a.x)*t:wrapLongitude(a.x+longitudeDelta(a.x,b.x)*t),z:a.z+(b.z-a.z)*t}
  if(!safe(point))return false
 }
 return true
}

/** A small room grid follows furniture clearance; a straight line is accepted only when verified. */
export function roomGuidanceRoute(room:RoomId,from:MapPoint,to:MapPoint):MapPoint[]{
 const safe=(point:MapPoint)=>roomWalkable(room,point)
 if(!safe(from)||!safe(to))return[]
 if(sampleClear(from,to,safe,true))return[{...to}]
 const step=.35,size=19,origin=-3.15,nodes:MapPoint[]=[],grid=new Map<string,number>()
 for(let x=0;x<size;x++)for(let z=0;z<size;z++){
  const point={x:origin+x*step,z:origin+z*step}
  if(safe(point)){grid.set(`${x},${z}`,nodes.length);nodes.push(point)}
 }
 const previous=new Int32Array(nodes.length),cost=new Float64Array(nodes.length),done=new Uint8Array(nodes.length);previous.fill(-1);cost.fill(Infinity)
 const ends=new Set<number>()
 for(let i=0;i<nodes.length;i++){
  if(roomDistance(from,nodes[i]!)<1&&sampleClear(from,nodes[i]!,safe,true))cost[i]=roomDistance(from,nodes[i]!)
  if(roomDistance(to,nodes[i]!)<1&&sampleClear(to,nodes[i]!,safe,true))ends.add(i)
 }
 let found=-1
 for(let count=0;count<nodes.length;count++){
  let at=-1,best=Infinity
  for(let i=0;i<nodes.length;i++)if(!done[i]&&cost[i]!<best){best=cost[i]!;at=i}
  if(at<0)break
  if(ends.has(at)){found=at;break}
  done[at]=1
  const point=nodes[at]!,x=Math.round((point.x-origin)/step),z=Math.round((point.z-origin)/step)
  for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
   const next=grid.get(`${x+dx!},${z+dz!}`)
   if(next===undefined||done[next]||!sampleClear(point,nodes[next]!,safe,true))continue
   const candidate=best+roomDistance(point,nodes[next]!)
   if(candidate<cost[next]!){cost[next]=candidate;previous[next]=at}
  }
 }
 if(found<0)return[]
 const result:MapPoint[]=[]
 for(let at=found;at>=0;at=previous[at]!)result.push({...nodes[at]!})
 result.reverse();result.push({...to});return result
}

/** Return the first real doorway in a room graph; stairs and cave exits share the same mechanism. */
export function roomTransition(targets:readonly Target[],from:RoomId|null,to:RoomId|null):Target|null{
 if(from===to)return null
 const queue:{room:RoomId|null;first:Target|null}[]=[{room:from,first:null}],seen=new Set<RoomId|null>([from])
 for(let i=0;i<queue.length;i++){
  const current=queue[i]!
  for(const target of targets){
   if((target.room??null)!==current.room||target.kind!=='door'&&target.kind!=='exit')continue
   const next=target.kind==='exit'?null:target.interior
   if(next===undefined||seen.has(next))continue
   const first=current.first??target
   if(next===to)return first
   seen.add(next);queue.push({room:next,first})
  }
 }
 return null
}

/** Optional guidance observes progress; it never sets input, visits a target, or opens a door. */
export function createTrailGuidance(targets:readonly Target[],safe:(point:MapPoint)=>boolean,paths?:readonly(readonly MapPoint[])[]){
 const planner=createWorldFollow(safe,paths)
 let key='',route:MapPoint[]=[],anchor:GuidancePosition|null=null,goal:MapPoint|null=null,cursor=0
 function clear(){key='';route=[];anchor=goal=null;cursor=0;planner.reset()}
 return{prepare(){planner.prepare()},reset:clear,
  update(visit:PassportSnapshot,position:GuidancePosition,liveTarget?:(id:string)=>Target|undefined):TrailGuidance|null{
   const trail=trailDefinitions.find(item=>item.id===visit.trackedTrail)
   const requirement=trail?.requirements.find(id=>!visit.activities.includes(id))
   if(!requirement){clear();return null}
   const activity=activityDefinitions.find(item=>item.id===requirement)!,source=targets.find(target=>target.id===activity.targetId)
   if(!source){clear();return null}
   const final=liveTarget?.(source.id)??source,room=position.inside,destination=(final.room??null)===room?final:roomTransition(targets,room,final.room??null)
   if(!destination){clear();return{targetId:final.id,label:final.label,room,points:[],segments:[],firefly:null,waitingAtDoor:false,arrived:false,unreachable:true,hint:'Choose Places to reach this part of the world.'}}
   const target=destination.id===final.id?final:destination,end=target.arrival,length=room?roomDistance:distance,nextKey=`${trail!.id}:${target.id}:${room??'world'}`
   const offRoute=route.length?Math.min(...route.slice(cursor).map(point=>length(position,point))):Infinity
   const nextPoint=route[cursor],firstClear=!nextPoint||sampleClear(position,nextPoint,room?point=>roomWalkable(room,point):safe,!!room)
   if(nextKey!==key||!goal||length(goal,end)>1||offRoute>2.2||!firstClear){
    key=nextKey;anchor={...position};goal={...end};cursor=0
    route=room?roomGuidanceRoute(room,position,end):planner.path(position,end)
   }
   while(route[cursor]&&length(position,route[cursor]!)<.4)cursor++
   const points=[{x:position.x,z:position.z},...route.slice(cursor)],arrived=length(position,end)<.8,door=target.kind==='door'||target.kind==='exit'
   let remaining=6,firefly:MapPoint|null=null
   for(let i=1;i<points.length;i++){
    const a=points[i-1]!,b=points[i]!,gap=length(a,b)
    if(gap>=remaining){const t=remaining/(gap||1);firefly={x:room?a.x+(b.x-a.x)*t:wrapLongitude(a.x+longitudeDelta(a.x,b.x)*t),z:a.z+(b.z-a.z)*t};break}
    remaining-=gap;firefly={...b}
   }
   if(arrived)firefly={...end}
   const wave=target.id===final.id&&requirement==='return-wave'
   return{targetId:target.id,label:wave?`Exchange a wave with ${target.name}`:target.label,room,points,segments:room?[]:splitGuidanceRoute(points),firefly,waitingAtDoor:door&&arrived,arrived,unreachable:!route.length&&!arrived,hint:door?`${target.label}. Press E at the doorway.`:wave?'Press F or choose Wave to exchange a hello.':activity.detail}
  },
  get anchor(){return anchor},
 }
}
