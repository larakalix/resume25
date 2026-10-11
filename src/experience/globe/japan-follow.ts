import {distance} from './geography.ts'
import {inJapan,japanApproach,japanCrossLanes} from './japan-district.ts'
import type {MapPoint} from './types.ts'

/** Bounded, local detours through the quarter's known cross lanes and central avenue. */
export function createJapanFollow(safe:(point:MapPoint)=>boolean){
 let route:MapPoint[]=[],cursor=0,mode:'enter'|'leave'|null=null,ownerAt:MapPoint|null=null
 const visibility=new Map<string,boolean>()
 function clear(){route=[];cursor=0;mode=null;ownerAt=null}
 function visible(a:MapPoint,b:MapPoint){
  const key=`${a.x},${a.z}:${b.x},${b.z}`,cached=visibility.get(key);if(cached!==undefined)return cached
  const steps=Math.max(1,Math.ceil(distance(a,b)/.15))
  for(let i=1;i<=steps;i++)if(!safe({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps})){visibility.set(key,false);return false}
  visibility.set(key,true);return true
 }
 function choose(actor:MapPoint,owner:MapPoint,enter:boolean){
  visibility.clear()
  const candidates:MapPoint[][]=[]
  if(enter){
   const starts=inJapan(actor)?[[]]:[japanApproach]
   for(const prefix of starts){const start=prefix.at(-1)??actor
    for(const a of japanCrossLanes)for(const b of japanCrossLanes)candidates.push([...prefix,{x:start.x,z:a},{x:-33,z:a},{x:-33,z:b},{x:owner.x,z:b},{...owner}])
   }
  }else for(const z of japanCrossLanes)candidates.push([{x:actor.x,z},{x:-33,z},{x:-33,z:-17},...japanApproach.slice(0,-1).reverse()])
  const ordered=candidates.map(points=>{let from=actor,length=0;for(const point of points){length+=distance(from,point);from=point}return{points,length}}).sort((a,b)=>a.length-b.length)
  for(const candidate of ordered){let from=actor,usable=true;const points:MapPoint[]=[]
   for(const point of candidate.points){if(distance(from,point)<.001)continue;if(!visible(from,point)){usable=false;break}points.push(point);from=point}
   if(usable)return points
  }
  return []
 }
 return{reset:clear,
  goal(actor:MapPoint,owner:MapPoint,following:boolean){
   if(!following||distance(actor,owner)<2.4){clear();return null}
   const enter=inJapan(owner),nextMode=enter?'enter':'leave'
   if(!enter&&!inJapan(actor)&&mode!=='leave'){clear();return null}
   if(mode!==nextMode||!ownerAt||distance(ownerAt,owner)>2){route=choose(actor,owner,enter);cursor=0;mode=nextMode;ownerAt={...owner}}
   while(route[cursor]&&distance(actor,route[cursor]!)<.12)cursor++
   if(!route[cursor]){if(!enter)clear();return null}
   return route[cursor]!
  },
 }
}
