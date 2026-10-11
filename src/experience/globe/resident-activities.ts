import {bearing,distance,RADIUS,segmentDistance} from './geography.ts'
import {wrapLongitude} from './world-expansion.ts'
import type {MapPoint,Walker} from './types.ts'

export type ResidentActivity='strolling'|'tending'|'visiting'|'resting'|'sheltering'|'chatting'|'yielding'
export interface ActivityProfile {id:string;route:readonly MapPoint[];pace:number;rest:number;shelter:number;activity:ResidentActivity;loop?:boolean}
/** Short authored lanes avoid speculative navigation through gardens, roofs or riverbanks. */
export const residentActivityProfiles:readonly ActivityProfile[]=[
 {id:'mira',route:[{x:-3,z:10},{x:-5,z:9.5},{x:-7,z:9.8},{x:-8.8,z:9.2}],pace:.67,rest:4.2,shelter:3,activity:'strolling'},
 {id:'sol',route:[{x:22,z:-14},{x:23,z:-16},{x:23,z:-19},{x:25.5,z:-20.1},{x:21,z:-19}],pace:.53,rest:5.5,shelter:3,activity:'tending'},
 {id:'city-nico',route:[{x:2.7,z:33},{x:2.7,z:36},{x:2.7,z:40},{x:2.7,z:45},{x:2.7,z:50.5},{x:-2.7,z:50.5},{x:-2.7,z:45},{x:-2.7,z:40},{x:-2.7,z:36},{x:-4.5,z:36},{x:-7.8,z:35.5},{x:-7.8,z:35},{x:-7.8,z:35.5},{x:-4.5,z:36},{x:-2.7,z:36},{x:-2.7,z:32},{x:2.7,z:32}],pace:.71,rest:1.6,shelter:11,activity:'visiting',loop:true},
]
interface Progress {cursor:number;direction:number;rest:number;near:boolean;activity:ResidentActivity;sheltering:boolean;yieldYaw:number|null;avoid:{yaw:number;remaining:number}|null}
export interface ResidentEnvironment {rain:number;day:number;walking:boolean;active?:boolean}

function turn(actor:Walker,yaw:number,dt:number,instant=false){actor.yaw=instant?yaw:actor.yaw+Math.atan2(Math.sin(yaw-actor.yaw),Math.cos(yaw-actor.yaw))*(1-Math.exp(-dt*10))}
function advance(point:MapPoint,yaw:number,length:number):MapPoint{return{x:wrapLongitude(point.x+Math.sin(yaw)*length/Math.max(.01,Math.cos(point.z/RADIUS))),z:point.z+Math.cos(yaw)*length}}
function inLane(point:MapPoint,profile:ActivityProfile){for(let index=1;index<profile.route.length;index++)if(segmentDistance(point,profile.route[index-1]!,profile.route[index]!)<1.1)return true;return false}

/** Conversation and visitor clearance have priority over every ambient activity. */
export function createResidentActivities(safe:(point:MapPoint)=>boolean,profiles:readonly ActivityProfile[]=residentActivityProfiles){
 const residentActivityProfiles=profiles
 const ids:ReadonlySet<string>=new Set(residentActivityProfiles.map(profile=>profile.id)),progress=new Map<string,Progress>()
 const initial=(index:number):Progress=>({cursor:1,direction:1,rest:1+index*.8,near:false,activity:'resting',sheltering:false,yieldYaw:null,avoid:null})
 residentActivityProfiles.forEach((profile,index)=>progress.set(profile.id,initial(index)))
 return{ids,activity(id:string){return progress.get(id)?.activity??null},
  step(delta:number,actors:readonly Walker[],player:MapPoint,engagedId:string|null,calm:boolean,environment:ResidentEnvironment){
   const dt=Number.isFinite(delta)?Math.max(0,Math.min(.05,delta)):0;if(!dt)return
   for(const [index,profile] of residentActivityProfiles.entries()){
    const actor=actors.find(candidate=>candidate.id===profile.id);if(!actor)continue
    const state=progress.get(profile.id)!,gap=distance(actor,player);actor.speed=0
    if(environment.active===false){actor.stopped=false;state.near=false;state.activity='resting';continue}
    if(!calm)actor.greeting=Math.max(0,(actor.greeting??0)-dt)
    const engaged=engagedId===actor.id,near=gap<(state.near?3.4:2.5)||engaged
    if(near&&!state.near&&!calm)actor.greeting=1.5
    state.near=near;actor.stopped=near
    if(!environment.walking||engagedId||gap>=1.2)state.yieldYaw=null
    if(engaged){turn(actor,bearing(actor,player),dt,calm);state.activity='chatting';continue}
    if(environment.walking&&!engagedId&&gap<1.1){
     const away=bearing(player,actor);state.yieldYaw??=away+Math.PI/2
     const side=state.yieldYaw,candidates=[advance(actor,side,.8*dt),advance(actor,side+Math.PI,.8*dt),advance(actor,away,.8*dt)]
     const next=candidates.find(point=>safe(point)&&distance(point,player)>=gap-1e-6&&actors.every(other=>other===actor||distance(point,other)>=.65))
     if(next){actor.speed=distance(actor,next)/dt;turn(actor,bearing(actor,next),dt,calm);actor.x=next.x;actor.z=next.z;actor.stopped=false;state.activity='yielding';continue}
    }
    if(near){turn(actor,bearing(actor,player),dt,calm);state.activity='resting';continue}
    if(calm){state.activity='resting';continue}
    // A short, remembered sidestep lets the one-way city cast pass a visitor returning from a shop.
    // Do not continuously turn away from the blocker: that would create another orbit/deadlock.
    const clear=(point:MapPoint)=>safe(point)&&inLane(point,profile)&&distance(point,player)>=.7&&actors.every(other=>other===actor||distance(point,other)>=.65)
    if(state.avoid){
     const next=advance(actor,state.avoid.yaw,Math.min(.55*dt,state.avoid.remaining))
     if(clear(next)){const moved=distance(actor,next);actor.speed=moved/dt;turn(actor,bearing(actor,next),dt);actor.x=next.x;actor.z=next.z;actor.stopped=false;state.activity='yielding';state.avoid.remaining-=moved;if(state.avoid.remaining<.01){state.avoid=null;state.rest=1.2}continue}
     state.avoid=null;state.rest=.4
    }
    const shelter=environment.rain>.35||environment.day<.28
    // Change intent at a lane node, avoiding a diagonal shortcut when the weather turns.
    if(shelter!==state.sheltering){state.sheltering=shelter;state.rest=0}
    if(state.rest>0){state.rest=Math.max(0,state.rest-dt);state.activity='resting';continue}
    const goal=profile.route[state.cursor]!,goalGap=distance(actor,goal)
    if(goalGap<.04){
     if(shelter&&state.cursor===profile.shelter){state.activity='sheltering';actor.stopped=true;continue}
     const next=state.cursor+state.direction
     if(profile.loop)state.cursor=next%profile.route.length
     else{if(next<0||next>=profile.route.length)state.direction*=-1;state.cursor+=state.direction}
     state.rest=profile.rest*(state.cursor===profile.shelter?1.4:1)+(index*.2);state.activity='resting';continue
    }
    const next=advance(actor,bearing(actor,goal),Math.min(goalGap,profile.pace*dt))
    if(safe(next)&&distance(next,player)>=.7&&actors.every(other=>other===actor||distance(next,other)>=.7)){
     actor.speed=distance(actor,next)/dt;turn(actor,bearing(actor,next),dt);actor.x=next.x;actor.z=next.z;actor.stopped=false;state.activity=profile.activity
    }else{
     const blocker=actors.find(other=>other!==actor&&distance(next,other)<.7)
     if(blocker){const away=bearing(blocker,actor),heading=bearing(actor,goal),yaw=[away,heading+Math.PI/2,heading-Math.PI/2,0,Math.PI].find(angle=>{const step=advance(actor,angle,.55*dt);return clear(step)&&distance(step,blocker)>distance(actor,blocker)+1e-6});if(yaw!==undefined)state.avoid={yaw,remaining:.6}}
     else if(!safe(next)){
      // A passing sidestep can meet a post beside an otherwise clear lane. Remember one
      // short detour, checking its entire span, rather than retrying the blocked step forever.
      const heading=bearing(actor,goal),span=.75,candidates=[-Math.PI/3,Math.PI/3,-Math.PI/2,Math.PI/2].map(offset=>({yaw:heading+offset,end:advance(actor,heading+offset,span)}))
      const detour=candidates.filter(candidate=>{
       for(let sample=1;sample<=5;sample++)if(!clear(advance(actor,candidate.yaw,span*sample/5)))return false
       const rejoin=advance(candidate.end,bearing(candidate.end,goal),Math.min(.35,distance(candidate.end,goal)))
       return clear(rejoin)
      }).sort((a,b)=>distance(a.end,goal)-distance(b.end,goal))[0]
      if(detour)state.avoid={yaw:detour.yaw,remaining:span}
     }
     state.rest=state.avoid?0:.25;state.activity='resting'
    }
   }
  },
  reset(){residentActivityProfiles.forEach((profile,index)=>progress.set(profile.id,initial(index)))},
 }
}

export interface WaveCandidate extends MapPoint {id:string;greeting?:number}
/** Small reciprocal moments use bounded state, with no timers or retained world objects. */
export function createWorldReactions(){
 let lastWave=-Infinity,celebrated=false
 return{
  wave(time:number,player:MapPoint,candidates:readonly WaveCandidate[],engagedId:string|null,calm=false){
   if(engagedId||!Number.isFinite(time)||time-lastWave<8)return null
   let closest:WaveCandidate|undefined,gap=4
   for(const actor of candidates){const separation=distance(player,actor);if(separation<gap){closest=actor;gap=separation}}
   if(!closest)return null
   lastWave=time;if(!calm)closest.greeting=Math.max(closest.greeting??0,1.6);return closest.id
  },
  workshop(completed:boolean,calm=false){if(!completed||celebrated)return null;celebrated=true;return{type:'patch-celebration' as const,duration:calm?0:1.8,message:'Patch gives a happy little wiggle. Your idea works!'}},
  reset(){lastWave=-Infinity;celebrated=false},
 }
}
