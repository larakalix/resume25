import {distance,mapAt,normalAt,RADIUS} from './geography.ts'
import type {MapPoint,Walker} from './types.ts'

/** The same one-way pedestrian loop keeps opposing walkers out of each other's path. */
export const cityResidentRoute:readonly MapPoint[]=[
 {x:-2.7,z:32},{x:2.7,z:32},{x:2.7,z:36},{x:2.7,z:40},{x:2.7,z:45},{x:2.7,z:50.5},
 {x:-2.7,z:50.5},{x:-2.7,z:45},{x:-2.7,z:40},{x:-2.7,z:36},
]
export const cityResidents=[
 {id:'city-nico',name:'Nico',x:2.7,z:33,goal:2,topic:'about',coat:'coral',hair:'wood',hairstyle:'quiff',glasses:false,scale:.88},
 {id:'city-aya',name:'Aya',x:2.7,z:42,goal:4,topic:'toolkit',coat:'violet',hair:'navy',hairstyle:'bun',glasses:true,scale:.82},
 {id:'city-june',name:'June',x:-2.7,z:48.5,goal:7,topic:'history',coat:'mint',hair:'wood',hairstyle:'curls',glasses:false,scale:.94},
 {id:'city-ben',name:'Ben',x:-2.7,z:38,goal:9,topic:'approach',coat:'gold',hair:'navy',hairstyle:'crop',glasses:true,scale:.86},
] as const
export type CityResidentId=typeof cityResidents[number]['id']
export interface CityResidentState extends Walker {
 id:CityResidentId;greeting:number;encounters:number;mode:'walking'|'resting'|'greeting'|'chatting'
}
interface Progress {goal:number;rest:number;pace:number;restYaw:number;near:boolean;yieldAxis:MapPoint|null}

function yawToward(from:MapPoint,to:MapPoint){return Math.atan2((to.x-from.x)*Math.cos((from.z+to.z)/2/RADIUS),to.z-from.z)}
function turn(actor:CityResidentState,yaw:number,dt:number,instant=false){actor.yaw=instant?yaw:actor.yaw+Math.atan2(Math.sin(yaw-actor.yaw),Math.cos(yaw-actor.yaw))*(1-Math.exp(-dt*10))}

/** A short great-circle step has the same physical length even at the southern latitude. */
function stepToward(from:MapPoint,to:MapPoint,metres:number):MapPoint{
 const a=normalAt(from.x,from.z),b=normalAt(to.x,to.z),angle=Math.acos(Math.max(-1,Math.min(1,a.x*b.x+a.y*b.y+a.z*b.z)))
 if(angle*RADIUS<=metres)return{x:to.x,z:to.z}
 const t=metres/(angle*RADIUS),sin=Math.sin(angle),left=Math.sin((1-t)*angle)/sin,right=Math.sin(t*angle)/sin
 const x=a.x*left+b.x*right,y=a.y*left+b.y*right,z=a.z*left+b.z*right,length=Math.hypot(x,y,z)
 return mapAt({x:x/length,y:y/length,z:z/length})
}

function stepAlong(from:MapPoint,axis:MapPoint,metres:number):MapPoint{
 const n=normalAt(from.x,from.z),longitude=from.x/RADIUS,latitude=from.z/RADIUS,c=Math.cos(metres/RADIUS),s=Math.sin(metres/RADIUS)
 const x=axis.x*Math.cos(longitude)-axis.z*Math.sin(longitude)*Math.sin(latitude),y=-axis.x*Math.sin(longitude)-axis.z*Math.cos(longitude)*Math.sin(latitude),z=axis.z*Math.cos(latitude)
 return mapAt({x:n.x*c+x*s,y:n.y*c+y*s,z:n.z*c+z*s})
}

/** Small local walkers with staggered routes, unhurried pauses and proximity conversation holds. */
export function createCityResidents(safe:(point:MapPoint)=>boolean,random:()=>number=Math.random){
 let delegated:ReadonlySet<string>=new Set()
 const states:CityResidentState[]=cityResidents.map((source,index)=>({id:source.id,x:source.x,z:source.z,yaw:yawToward(source,cityResidentRoute[source.goal]!),speed:0,stopped:false,phase:index*.8,greeting:0,encounters:0,mode:'resting'}))
 const progress:Progress[]=cityResidents.map((source,index)=>({goal:source.goal,rest:.6+index*.45,pace:.62+index*.025,restYaw:states[index]!.yaw,near:false,yieldAxis:null}))
 const sample=()=>{const value=random();return Number.isFinite(value)?Math.max(0,Math.min(.999999,value)):.5}
 return{states,delegate(ids:ReadonlySet<string>){delegated=ids},
  step(delta:number,player:MapPoint,engagedId:string|null,reduced:boolean,active=true,walking=false){
   const dt=Number.isFinite(delta)?Math.max(0,Math.min(.05,delta)):0;if(!dt)return
   for(const [index,actor] of states.entries()){
    if(delegated.has(actor.id))continue
    const route=progress[index]!;actor.speed=0
    if(!active){actor.greeting=0;actor.stopped=false;actor.mode='resting';route.near=false;route.yieldAxis=null;continue}
    actor.greeting=Math.max(0,actor.greeting-dt)
    const playerGap=distance(actor,player),close=playerGap<(route.near?3.4:2.5)||engagedId===actor.id
    if(close&&!route.near){actor.encounters++;actor.greeting=reduced?0:1.5}
    route.near=close;actor.stopped=close
    // A deliberate walk through the lane asks the resident to step sideways, rather than become a wall.
    // Keep the chosen axis for the short sidestep so it does not turn into an orbit around the visitor.
    if(!walking||engagedId||playerGap>=1.2)route.yieldAxis=null
    if(walking&&!engagedId&&playerGap<1.1){
     if(!route.yieldAxis){
      const dx=(actor.x-player.x)*Math.cos((actor.z+player.z)/2/RADIUS),dz=actor.z-player.z,length=Math.hypot(dx,dz),outward=actor.x===0?(index%2?1:-1):Math.sign(actor.x)
      let x=length>.001?-dz/length:outward,z=length>.001?dx/length:0
      if(x*outward<0){x=-x;z=-z}route.yieldAxis={x,z}
     }
     const axis=route.yieldAxis
     function yieldAlong(x:number,z:number){
      // Constant-latitude side steps stay inside an avenue edge; a great-circle east step drifts north.
      const next=z===0?{x:actor.x+x*.9*dt/Math.cos(actor.z/RADIUS),z:actor.z}:stepAlong(actor,{x,z},.9*dt)
      if(Math.abs(next.x)>4.2||next.z<30||next.z>52.5||!safe(next)||distance(next,player)<playerGap-1e-6||!states.every(other=>other===actor||distance(next,other)>=.7))return false
      axis.x=x;axis.z=z
      actor.speed=distance(actor,next)/dt;turn(actor,yawToward(actor,next),dt,reduced);actor.x=next.x;actor.z=next.z;actor.stopped=false;actor.greeting=0;actor.mode='walking';return true
     }
     if(!yieldAlong(axis.x,axis.z)&&!yieldAlong(-axis.x,-axis.z)){
      // A remembered diagonal can hit the end of the lane. Choose a new escape only after both directions fail.
      const outward=actor.x===0?(index%2?1:-1):Math.sign(actor.x),away=actor.z===player.z?(index%2?1:-1):Math.sign(actor.z-player.z)
      if(!yieldAlong(outward,0)&&!yieldAlong(-outward,0))yieldAlong(0,away)
     }
     if(actor.speed>0)continue
    }
    if(close){turn(actor,yawToward(actor,player),dt,reduced);actor.mode=engagedId===actor.id?'chatting':actor.greeting>0?'greeting':'resting';continue}
    if(reduced){actor.greeting=0;actor.mode='resting';continue}
    if(route.rest>0){route.rest=Math.max(0,route.rest-dt);turn(actor,route.restYaw,dt);actor.mode='resting';continue}
    const destination=cityResidentRoute[route.goal]!,gap=distance(actor,destination)
    if(gap<.025){route.goal=(route.goal+1)%cityResidentRoute.length;route.rest=.7+sample()*2.3;route.pace=.57+sample()*.20;route.restYaw=actor.yaw+(sample()-.5)*.7;actor.mode='resting';continue}
    const next=stepToward(actor,destination,Math.min(gap,route.pace*dt))
    if(safe(next)&&distance(next,player)>=.7&&states.every(other=>other===actor||distance(next,other)>=.7)){
     actor.speed=distance(actor,next)/dt;turn(actor,yawToward(actor,next),dt);actor.x=next.x;actor.z=next.z;actor.mode='walking'
    }else{route.rest=.2;route.restYaw=actor.yaw;actor.mode='resting'}
   }
  },
  reset(){for(const [index,source] of cityResidents.entries()){
   const actor=states[index]!,yaw=yawToward(source,cityResidentRoute[source.goal]!)
   Object.assign(actor,{x:source.x,z:source.z,yaw,speed:0,stopped:false,greeting:0,encounters:0,mode:'resting'})
   Object.assign(progress[index]!,{goal:source.goal,rest:.6+index*.45,pace:.62+index*.025,restYaw:yaw,near:false,yieldAxis:null})
  }},
 }
}
