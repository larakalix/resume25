import {distance,normalAt,paths,RADIUS} from './geography.ts'
import {latitudeLimit,longitudeDelta,wrapLongitude} from './world-expansion.ts'
import type {MapPoint} from './types.ts'

interface Node extends MapPoint {world:{x:number;y:number;z:number};edges:Map<number,number>}
const bucketSize=2.2,spacing=1.3,visibilityStep=.15
const far=(point:MapPoint)=>Math.abs(point.x)>65||Math.abs(point.z)>54
function between(a:MapPoint,b:MapPoint,t:number):MapPoint{return{x:wrapLongitude(a.x+longitudeDelta(a.x,b.x)*t),z:Math.max(-latitudeLimit,Math.min(latitudeLimit,a.z+(b.z-a.z)*t))}}

/** A lazy, bounded route graph follows authored paths without teleporting a companion. */
export function createWorldFollow(safe:(point:MapPoint)=>boolean,routes:readonly(readonly MapPoint[])[]=paths){
 let graph:Node[]|null=null,route:MapPoint[]=[],cursor=0,ownerAt:MapPoint|null=null
 const visibility=new Map<string,boolean>()
 function clear(){route=[];cursor=0;ownerAt=null;visibility.clear()}
 function visible(a:MapPoint,b:MapPoint){
  const from=`${a.x.toFixed(4)},${a.z.toFixed(4)}`,to=`${b.x.toFixed(4)},${b.z.toFixed(4)}`,key=from<to?`${from}:${to}`:`${to}:${from}`,cached=visibility.get(key);if(cached!==undefined)return cached
  const length=distance(a,b);if(length>30)return false
  const steps=Math.max(1,Math.ceil(length/visibilityStep));let result=true
  for(let i=1;i<=steps;i++)if(!safe(between(a,b,i/steps))){result=false;break}
  if(visibility.size>=1024)visibility.clear();visibility.set(key,result);return result
 }
 function nodes(){
  if(graph)return graph
  graph=[]
  const buckets=new Map<string,number[]>(),cell=(world:{x:number;y:number;z:number})=>[Math.floor(world.x/bucketSize),Math.floor(world.y/bucketSize),Math.floor(world.z/bucketSize)] as const
  function connect(a:number,b:number,authored=false){
   const left=graph![a]!,right=graph![b]!
   if(left.edges.has(b))return
   const length=distance(left,right)
   if(length<1e-5||!(authored?safe(between(left,right,.5)):visible(left,right)))return
   left.edges.set(b,length);right.edges.set(a,length)
  }
  function add(point:MapPoint,previous:number|null){
   if(!safe(point))return null
   const n=normalAt(point.x,point.z),world={x:n.x*RADIUS,y:n.y*RADIUS,z:n.z*RADIUS},[x,y,z]=cell(world),near:number[]=[]
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++)near.push(...(buckets.get(`${x+dx},${y+dy},${z+dz}`)??[]))
   const duplicate=near.find(index=>distance(point,graph![index]!)<.08);if(duplicate!==undefined)return duplicate
   const index=graph!.length;graph!.push({...point,world,edges:new Map()})
   const key=`${x},${y},${z}`,values=buckets.get(key)??[];values.push(index);buckets.set(key,values)
   // Physical buckets stitch intersecting paths and both sides of the map seam.
   for(const other of near)if(other!==previous&&distance(point,graph![other]!)<1.9)connect(index,other)
   return index
  }
  for(const line of routes)for(let i=1;i<line.length;i++){
   const a=line[i-1]!,b=line[i]!,steps=Math.max(1,Math.ceil(distance(a,b)/spacing));let previous:number|null=null
   for(let step=0;step<=steps;step++){
    const index=add(between(a,b,step/steps),previous);if(index!==null&&previous!==null&&index!==previous)connect(previous,index,true)
    previous=index
   }
  }
  visibility.clear();return graph
 }
 function connectors(point:MapPoint){
  const list=nodes(),n=normalAt(point.x,point.z),world={x:n.x*RADIUS,y:n.y*RADIUS,z:n.z*RADIUS}
  const candidates=list.map((node,index)=>({index,squared:(node.world.x-world.x)**2+(node.world.y-world.y)**2+(node.world.z-world.z)**2})).sort((a,b)=>a.squared-b.squared),result:{index:number;length:number}[]=[]
  for(const candidate of candidates.slice(0,72)){
   const node=list[candidate.index]!,length=distance(point,node)
   if(length>18)break
   if(visible(point,node)){result.push({index:candidate.index,length});if(result.length===8)break}
  }
  return result
 }
 function choose(actor:MapPoint,owner:MapPoint){
  if(distance(actor,owner)<18&&visible(actor,owner))return[{...owner}]
  const starts=connectors(actor),ends=connectors(owner),list=nodes()
  if(!starts.length||!ends.length)return[]
  const costs=new Float64Array(list.length),previous=new Int32Array(list.length),done=new Uint8Array(list.length);costs.fill(Infinity);previous.fill(-1)
  for(const start of starts)costs[start.index]=start.length
  let best=-1,total=Infinity
  // The graph is built once and remains small; deterministic Dijkstra needs no frame-loop heap.
  for(let iteration=0;iteration<list.length;iteration++){
   let at=-1,cost=Infinity
   for(let i=0;i<list.length;i++)if(!done[i]&&costs[i]!<cost){at=i;cost=costs[i]!}
   if(at<0||cost>=total)break
   done[at]=1
   const end=ends.find(value=>value.index===at);if(end&&cost+end.length<total){best=at;total=cost+end.length}
   for(const [next,length] of list[at]!.edges){const candidate=cost+length;if(candidate<costs[next]!){costs[next]=candidate;previous[next]=at}}
  }
  if(best<0)return[]
  const points:MapPoint[]=[]
  for(let at=best;at>=0;at=previous[at]!){const node=list[at]!;points.push({x:node.x,z:node.z})}
  points.reverse();points.push({...owner});return points
 }
 return{reset:clear,prepare(){nodes()},path(actor:MapPoint,owner:MapPoint){return choose(actor,owner)},
  goal(actor:MapPoint,owner:MapPoint,following:boolean,force=false){
   if(!following||!force&&!far(actor)&&!far(owner)||distance(actor,owner)<2.4){clear();return null}
   if(!ownerAt||distance(ownerAt,owner)>2){route=choose(actor,owner);cursor=0;ownerAt={...owner}}
   while(route[cursor]&&distance(actor,route[cursor]!)<.16)cursor++
   return route[cursor]??null
  },
 }
}
